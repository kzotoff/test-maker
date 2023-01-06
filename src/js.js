"use strict";

(($, _) => {

    console.log('yeah we are starting');

    const translator = new Translator();
    const data = new PresentationData({
        defaultText: translator.forCode("new-element-text"),
    });
    const audio = new Audio();
    const notificator = new Notificator(".notifications", "LANG_PACK");

    data.loadFromStorage();

    const state = mobx.observable({
        editMode: true,
        playingPageSound: false,
        currentPage: 0,
        currentElement: 0,

        // block names corresponing to data-admin-block-id attribue
        adminBlocksShown: {
            "general": true,
            "media": true,
            "pages": true,
            "elements": true,
            "content": true,
            "design": true,
        },
    });

    //
    //
    //

    const switchAdminBlockVisible = (event) => {
        const blockId = $(event.target).closest('.admin-block').attr('data-admin-block-id');
        state.adminBlocksShown[blockId] = !state.adminBlocksShown[blockId];
    };

    const modeEditOn = () => {
        state.editMode = true;
    };

    const modeEditOff = () => {
        state.editMode = false;
    };

    const applyEditMode = () => {
        if (state.editMode) {
            $('html').removeClass('mode-play').addClass('mode-edit');
        } else {
            $('html').removeClass('mode-edit').addClass('mode-play');
        }
    };

    //
    //
    //

    const audioPlay = (url) => {
        audio.pause();
        audio.src = url;
        audio.play();
        $('.audio-overlay').css('display', 'block');
    };

    const audioStop = () => {
        audio.pause();
        $('.audio-overlay').css('display', 'none');
    };

    //
    // start over, import and export
    //

    const dataReset = async (noConfirm) => {

        if (!(noConfirm === true)) {
            if (!confirm('delete everything and start over?')) { return false; }
            if (!confirm('sure?')) { return false; }
            if (!confirm('absolutely?')) { return false; }
        }
        data.reset();

        await Promise.resolve($.ajax({
            url: './api/clear.php',
            type: 'POST',
            contentType: false,
            success: (result) => {
                fillSoundSelector();
                fillImageSelector();
                notificator.info(translator.forCode("media-storage-cleared"));
                console.log('clear ok');
            },
        }));
        return true;
    };

    const dataExport = async () => {

        const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"));

        // content JSON
        const presentation = JSON.stringify(mobx.toJS(data.data));
        await zipWriter.add('presentation.json', new zip.TextReader(presentation));

        // media
        const appendMedia = async (mediaType) => {
            const url = `./api/list.php?type=${mediaType}`;
            const mediaList = await Promise.resolve($.get(url));
            await Promise.all(
                JSON.parse(mediaList).map(
                    filename => zipWriter.add(filename, new zip.HttpReader(`./media/${mediaType}/${filename}`))
                )
            );
        };

        await appendMedia("image");
        await appendMedia("sound");

        // well, get it
        const zipBlob = await zipWriter.close();
        $("<a>")
            .attr("download", "hello.zip")
            .attr("href", URL.createObjectURL(zipBlob))
            .html('download')
            .get(0)
                .click();
    };

    const dataImportShow = (value) => {
        if (typeof value !== "undefined") {
            state.importInputVisible = value;
            return;
        }
        state.importInputVisible = !state.importInputVisible;
    };

    const isImage = (zippedFileEntry) => {

        const dotPosition = zippedFileEntry.filename.lastIndexOf('.');
        const ext = dotPosition >= 0 ? zippedFileEntry.filename.substr(dotPosition + 1) : "";

        if (["jpg", "jpeg", "png", "webm", "bmp"].includes(ext)) {
            return true;
        }

        return false;
    };

    const isSound = (zippedFileEntry) => {

        const dotPosition = zippedFileEntry.filename.lastIndexOf('.');
        const ext = dotPosition >= 0 ? zippedFileEntry.filename.substr(dotPosition + 1) : "";

        if (["mp3", "ogg"].includes(ext)) {
            return true;
        }

        return false;
    };

    const dataImport = async () => {

        await dataReset(true);

        const zipFileBlob = $('[data-js-action="presentation-import"]')[0].files[0];
        const zipFileReader = new zip.BlobReader(zipFileBlob);
        const zipReader = new zip.ZipReader(zipFileReader);
        const entries = await zipReader.getEntries();


        // const mediaList = await Promise.resolve($.get(url));
        // await Promise.all(
        //     JSON.parse(mediaList).map(
        //         filename => zipWriter.add(filename, new zip.HttpReader(`./media/${mediaType}/${filename}`))
        //     )
        // )

        await Promise.all(
            entries.map(async entry => {
                console.log(`importing ${entry.filename}`);

                // this special name
                if (entry.filename == "presentation.json") {
                    const contentText = await entry.getData(new zip.TextWriter());
                    const content = JSON.parse(contentText);
                    data.makeDataFrom(content);
                    return;
                }

                // all others are being uploaded
                const formData = new FormData();

                if (isImage(entry)) {
                    formData.append("type", "image");
                } else if (isSound(entry)) {
                    formData.append("type", "sound");
                } else {
                    console.warn(`unknown file type for ${entry.filename}`);
                    return;
                }

                const blob = await entry.getData(new zip.BlobWriter());
                formData.append("file[]", blob, entry.filename);

                return Promise.resolve($.ajax({
                    url: './api/upload.php',
                    type: 'POST',
                    data: formData,
                    processData: false,
                    enctype: 'multipart/form-data',
                    contentType: false,
                    success: () => {
                        console.log(`ok: ${entry.filename}`);
                    },
                }));
            })
        );

        notificator.info(translator.forCode("import-ok"));
        console.log('import completed');
        $('[data-js-action="presentation-import"]').val(undefined);
        dataImportShow(false);

        fillSoundSelector();
        fillImageSelector();
        data.saveToStorage();
        render();
    };

    //
    //
    //

    const mediaUpload = (event) => {
        const formElement = $(event.target).closest('form')[0];
        const formData = new FormData(formElement);
        $.ajax({
            url: './api/upload.php',
            type: 'POST',
            data: formData,
            processData: false,
            enctype: 'multipart/form-data',
            contentType: false,
            success: (result) => {
                notificator.info(translator.forCode("files-uploaded-ok"));
                fillSoundSelector();
                fillImageSelector();
            }
        });
    };

    const pagePrev = () => {
        state.currentPage = Math.max(state.currentPage - 1, 0);
        state.currentElement = 0;
    };

    const pageNext = () => {
        state.currentPage = Math.min(state.currentPage + 1, data.data.pages.length - 1);
        state.currentElement = 0;
    };

    const pageAdd = () => {
        data.pageAdd();
        pageNext();
    };

    const pageDelete = () => {
        const newCurrentPage = Math.min(state.currentPage, data.data.pages.length - 2);
        data.pageDelete(state.currentPage);
        state.currentPage = newCurrentPage;
    };

    const pageBackground = (event) => {
        if (!data.data.pages[state.currentPage]) {
            return;
        }
        data.data.pages[state.currentPage].metadata.backgroundImage = event.target.value;

    };

    const elementSelect = (event) => {
        state.currentElement = parseInt($(event.target).attr('data-js-element-index'));
    };

    const elementNext = () => {
        state.currentElement = Math.min(state.currentElement + 1, data.data.pages[state.currentPage].elements.length - 1);
    };

    const elementPrev = () => {
        state.currentElement = Math.max(state.currentElement - 1, 0);
    };

    const elementAdd = () => {
        data.elementAdd(state.currentPage);
        elementNext();
    };

    const elementDelete = () => {
        const newCurrentElement = Math.min(state.currentElement, data.data.pages[state.currentPage].elements.length - 2);
        data.elementDelete(state.currentPage, state.currentElement);
        state.currentElement = newCurrentElement;
    };

    const elementSetText = (event) => {
        const element = data.data.pages[state.currentPage].elements[state.currentElement];
        element.content.text = $(event.target).val();
    };

    const elementSetSound = (event) => {
        const element = data.data.pages[state.currentPage].elements[state.currentElement];
        element.content.sound = $(event.target).val();
    };

    const elementSetImage = (event) => {
        const element = data.data.pages[state.currentPage].elements[state.currentElement];
        element.content.image = $(event.target).val();
    };

    /**
     * well, set element style based on event (e.g., changing styling control value)
     *
     */
    const elementSetStyle = (event) => {

        const element = data.data.pages[state.currentPage].elements[state.currentElement];

        const prop = $(event.target).attr('data-js-css-prop') || $(event.target).attr('data-js-css-unit');
        const propControl = $('[data-js-css-prop="' + prop + '"]');

        // checkboxes contain both prop and value
        if (propControl.attr("type") == "checkbox") {
            let propValue = propControl.attr('data-js-css-value');

            if (propControl[0].checked) {
                element.style[prop] = propValue;
            } else {
                delete(element.style[prop]);
            }
        } else {
            let propUnit = $('[data-js-css-unit="' + prop + '"]').val();
            let propValue = propControl.val() + (propUnit ? propUnit : "");
            element.style[prop] = propValue;
        }

    };

    const elementSetDraggable = (event) => {
        const isDraggable = event.target.checked;
        data.elementSetDraggable(state.currentPage, state.currentElement, isDraggable);
    };

    const elementAudioPlay = (event) => {
        const elementIndex = parseInt($(event.target).attr('data-js-element-index'));
        const soundSrc = data.data.pages[state.currentPage].elements[elementIndex].content.sound;
        console.log('sound source:', soundSrc);
        if (!soundSrc) {
            return;
        }
        const url = './media/sound/' + soundSrc;
        audioPlay(url);
    };

    const elementAudioStop = () => {
        audioStop();
    };

    const attachHandlers = () => {

        const doIfEditMode = () => state.editMode;
        const doIfPlayMode = () => !state.editMode;
        const doAlways = () => true;

        const handlers = [

            // general
            ['click', '[data-js-action="mode-set-edit"]', doAlways, modeEditOn],
            ['click', '[data-js-action="mode-set-play"]', doAlways, modeEditOff],

            ['click', '.element', doIfPlayMode, elementAudioPlay],
            ['click', '.audio-overlay', doIfPlayMode, elementAudioStop],

            ['click', '.admin-block-header', doIfEditMode, switchAdminBlockVisible],
            ['click', '[data-js-action="presentation-export"]', doIfEditMode, dataExport],
            ['change', '[data-js-action="presentation-import"]', doIfEditMode, dataImport],
            ['click', '[data-js-action="presentation-reset"]', doIfEditMode, dataReset],
            ['change', '[data-js-action="media-upload"]', doIfEditMode, mediaUpload],

            // pages
            ['click', '[data-js-action="page-add"]', doIfEditMode, pageAdd],
            ['click', '[data-js-action="page-delete"]', doIfEditMode, pageDelete],
            ['click', '[data-js-action="page-prev"]', doIfEditMode, pagePrev],
            ['click', '[data-js-action="page-next"]', doIfEditMode, pageNext],
            ['click', '[data-js-action="page-background-image"]', doIfEditMode, pageBackground],

            // elements
            ['mousedown', '.content [data-js-element-index]', doIfEditMode, elementSelect],
            ['click', '[data-js-action="element-add"]', doIfEditMode, elementAdd],
            ['click', '[data-js-action="element-delete"]', doIfEditMode, elementDelete],
            ['click', '[data-js-action="element-prev"]', doIfEditMode, elementPrev],
            ['click', '[data-js-action="element-next"]', doIfEditMode, elementNext],

            // design and content
            ['change', '[data-js-content="element-text"]', doIfEditMode, elementSetText],
            ['change', '[data-js-content="element-sound"]', doIfEditMode, elementSetSound],
            ['change', '[data-js-action="element-image"]', doIfEditMode, elementSetImage],
            ['change', '[data-js-action="element-css-toggle"]', doIfEditMode, elementSetStyle],
            ['change', '[data-js-action="element-css-value"]', doIfEditMode, elementSetStyle],
            ['change', '[data-js-action="element-css-unit"]', doIfEditMode, elementSetStyle],
            ['change', '[data-js-behavior="draggable"]', doIfEditMode, elementSetDraggable],
        ];

        handlers.forEach(handlerInfo => {
            const eventType = handlerInfo[0];
            const selector = handlerInfo[1];
            const availability = handlerInfo[2];
            const handler = handlerInfo[3];

                $('body').on(eventType, selector, (event) => {
                    if (availability()) {
                        console.log('running handler for', event.type);
                        handler(event);
                    }
                });
        });

    };

    //
    //
    //

    const renderPagesSummary = () => {
        const div = $('[data-js-target="pages-summary"]');
        div.html(
            (data.data.pages.length ? (state.currentPage + 1) : "-") +
            "/" +
            data.data.pages.length
        );
    };

    const renderElementsSummary = () => {
        const div = $('[data-js-target="elements-summary"]');
        if (data.data.pages.length === 0) {
            div.html("- / -");
            return;
        }
        div.html(
            (data.data.pages[state.currentPage].elements.length ? (state.currentElement + 1) : "-") +
            "/" +
            data.data.pages[state.currentPage].elements.length
        );
    };

    const updateAdminBlockState = () => {
        for (let blockName in state.adminBlocksShown) {
            const block = $('[data-admin-block-id="' + blockName+ '"]');
            if (state.adminBlocksShown[blockName]) {
                block.removeClass('admin-block-collapsed');
            } else {
                block.addClass('admin-block-collapsed');
            }
        }
    };

    const fillPagePropControls = () => {
        $('[data-js-action="page-background-image"]').val("");

        const pageData = data.data.pages[state.currentPage];

        if (pageData.metadata.backgroundImage) {
            $('[data-js-action="page-background-image"]').val(pageData.metadata.backgroundImage);
        }

    };

    const clearElementPropControls = () => {
        $('[data-js-css-prop]').each((index, elem) => {
            const $elem = $(elem);
            if ($elem.attr("type") == "text") {
                $elem.val('');
                return;
            }
            if ($elem.attr("type") == "color") {
                $elem.val('#000000');
                return;
            }
        });

        $('[data-js-content="element-text"]').text("");
        $('[data-js-content="element-sound"]').val("");
        $('[data-js-action="element-image"]').val("");
        $('[data-js-behavior="draggable"]').prop("checked", false);
        $('[data-js-action="element-css-toggle"]').prop("checked", false);
    };

    const fillCssFields = () => {
        clearElementPropControls();

        const element = data.data.pages[state.currentPage].elements[state.currentElement];

        if (!element) {
            console.log('no elements');
            return;
        }
        if (!element.style) {
            console.warn('element has no style section, it is so strange');
            return;
        }

        for (let prop in element.style) {
            const value = element.style[prop];
            const styleControl = $('[data-js-css-prop="' + prop + '"]');

            if (!styleControl) {
                console.warn('CSS property value is not recognized and will be deleted: ', prop, value);
                delete(element.style[prop]);
                continue;
            }

            // check if it is color
            if (value.match(/#[0-9a-f]{3}([0-9a-f]{3})?/)) {
                // console.log(prop, 'color', value);
                styleControl.val(value);
                continue;
            }

            // first type: digital + optional unit
            const parts = /(\d+)([^\d]+)?/.exec(value);
            if (parts) {
                // console.log(prop, 'dimension', value);
                styleControl.val(parts[1]);
                $('[data-js-css-unit="' + prop + '"]').val(parts[2]);
                continue;
            }

            // second type: direct value (e.g., "bold"), there should be checkbox (later may be select)
            if (styleControl.attr("type") == "checkbox") {
                styleControl[0].checked = true;
            } else {
                console.error("should implement support for something other than checkbox");
            }
        }

        $('[data-js-content="element-text"]').val(element.content.text);
        $('[data-js-content="element-sound"]').val(element.content.sound);
        $('[data-js-action="element-image"]').val(element.content.image);
        $('[data-js-behavior="draggable"]').prop("checked", _.get(element, "behavior.draggable", false));
    };

    const calcPosition = (positionPx, fullSize, unit) => {
        switch (unit) {
            case "%":
                return parseInt(positionPx / fullSize * 100);
                break;
            case "px":
                return positionPx;
                break;
            }
    };

    const renderElement = (elem, index) => {
        const $div = $("<div>")
            .attr('data-id', (new Date()).toString())
            .addClass('element')
            .addClass('element-default')
            .attr('data-js-element-index', index)
            ;

        if (elem.content && elem.content.text) {
            $div.text(elem.content.text);
        }

        if (elem.style) {
            for (let prop in elem.style) {
                $div.css(prop, elem.style[prop]);
            }
        }

        if (_.get(elem, "behavior.draggable")) {
            $div.draggable({
                stop: () => {
                    const $offset = $div.offset();
                    console.log('drag stop:', $offset);

                    const newLeft = calcPosition($offset.left, $('.content').outerWidth(), $('[data-js-css-unit="left"]').val());
                    const newTop = calcPosition($offset.top, $('.content').outerHeight(), $('[data-js-css-unit="top"]').val());

                    $('[data-js-css-prop="left"]').val(newLeft).change();
                    $('[data-js-css-prop="top"]').val(newTop).change();
                }
            });

        };

        if (elem.content.sound) {
            $div.append('<div class="element-sound-icon fa-solid fa-music"></div>');
        }

        if (elem.content.image) {
            $div.css('background-image', 'url(./media/image/' + elem.content.image + ')');
        }

        if (state.editMode) {
            if (index === state.currentElement) {
                $div.css("outline", "2px red dashed");
            }
        }

        return $div;

    };

    const renderPage = (targetSelector, pageContent) => {

        if (!pageContent) {
            console.log("no page content provided, seems no pages at all")
            return;
        }

        const $container = $(targetSelector);
        const metadata = pageContent.metadata;

        if (metadata.backgroundImage) {
            $container.css('background-image', 'url(./media/image/' + metadata.backgroundImage + ')');
        } else {
            $container.css('background-image', '');
        }
    };

    const renderElements = (targetSelector, pageContent) => {

        if (!pageContent) {
            console.log("no page content provided, seems no pages at all")
            return;
        }

        const $content = $(targetSelector);
        $content.empty();
        pageContent.elements.forEach((elem, index) => {
            $content.append(
                renderElement(elem,index)
            );
        });
    };

    const fillMediaSelector = (type, selectSelector) => {

        // type is "sound" or "image"
        const url = "./api/list.php?type=" + type;

        $.get(
            url,
            (result) => {
                const $select = $(selectSelector);
                try {
                    const list = JSON.parse(result);
                    $select.empty();

                    $select.append(
                        $("<option>")
                            .attr("value", "")
                            .text("-")
                    )

                    list.forEach((filename) => {
                        $select.append(
                            $("<option>")
                                .attr("value", filename)
                                .text(filename)
                        )
                    });
                    render(); // for image and sound selectors to show actual data
                } catch (e) {
                    console.warn('something went wrong while loading list for type "' + type + '"', e);
                }


            }
        );
    };

    const fillSoundSelector = () => {
        fillMediaSelector('sound', '[data-js-content="element-sound"]');
    };

    const fillImageSelector = () => {
        fillMediaSelector('image', '[data-js-content="element-image"]');
    };

    const render = () => {

        console.log('render');
        renderPagesSummary();
        renderElementsSummary();
        renderPage(".content", data.data.pages[state.currentPage]);
        renderElements(".content", data.data.pages[state.currentPage]);
        updateAdminBlockState();
        fillCssFields();
        fillPagePropControls();
    }

    //
    //
    //

    $(() => {

        var saveTimer = 0;
        mobx.reaction(
            () => { return JSON.stringify(data.data); },
            () => {
                clearTimeout(saveTimer);
                saveTimer = setTimeout(() => {
                    data.saveToStorage();
                }, 3000);
            }
        );

        mobx.reaction(
            () => { return state.editMode; },
            () => { applyEditMode(); }
        )

        applyEditMode();
        attachHandlers();
        fillSoundSelector();
        fillImageSelector();
        translator.applyAuto();

        mobx.autorun(
            () => render()
        );

        // for (const key in $('body')[0]) {
        //     if(/^on/.test(key) && !/mouse/.test(key)) {
        //         const eventType = key.substr(2);
        //         console.log('more: ' + eventType);
        //         target.addEventListener(eventType, e => { console.log(e); });
        //     }
        // }

    });

})(jQuery, _);
