"use strict";

(($, _) => {

    console.log('yeah we are starting');

    const data = new PresentationData();
    const audio = new Audio();

    data.loadFromStorage();

    const state = mobx.observable({
        editMode: true,
        playingPageSound: false,
        currentPage: 0,
        currentElement: 0,

        // block names corresponing to data-admin-block-id attribue
        adminBlocksShown: {
            "general": true,
            "media": false,
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
        $('html').removeClass('mode-play').addClass('mode-edit');
        state.editMode = true;
    };

    const modeEditOff = () => {
        $('html').removeClass('mode-edit').addClass('mode-play');
        state.editMode = false;
        render();
    };

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
    //
    //

    const dataReset = () => {
        if (!confirm('delete everything and start over?')) { return; }
        if (!confirm('sure?')) { return; }
        if (!confirm('absolutely?')) { return; }
        data.reset();
    };

    const dataExport = () => {

    };

    const dataImport = () => {

    };

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

    const elementSetStyle = (event) => {
        const prop = $(event.target).attr('data-js-css-value');
        const valueValue = $('[data-js-css-value="' + prop + '"]').val();
        const valueUnit = $('[data-js-css-unit="' + prop + '"]').val();
        const propValue = valueValue + (valueUnit ? valueUnit : "");
        const element = data.data.pages[state.currentPage].elements[state.currentElement];
        element.style[prop] = propValue;
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
            ['click', '[data-js-action="presentation-import"]', doIfEditMode, dataImport],
            ['click', '[data-js-action="presentation-reset"]', doIfEditMode, dataReset],
            ['change', '[data-js-action="media-upload"]', doIfEditMode, mediaUpload],

            // pages
            ['click', '[data-js-action="page-add"]', doIfEditMode, pageAdd],
            ['click', '[data-js-action="page-delete"]', doIfEditMode, pageDelete],
            ['click', '[data-js-action="page-prev"]', doIfEditMode, pagePrev],
            ['click', '[data-js-action="page-next"]', doIfEditMode, pageNext],

            // elements
            ['mousedown', '.content [data-js-element-index]', doIfEditMode, elementSelect],
            ['click', '[data-js-action="element-add"]', doIfEditMode, elementAdd],
            ['click', '[data-js-action="element-delete"]', doIfEditMode, elementDelete],
            ['click', '[data-js-action="element-prev"]', doIfEditMode, elementPrev],
            ['click', '[data-js-action="element-next"]', doIfEditMode, elementNext],

            // design and content
            ['change', '[data-js-content="element-text"]', doIfEditMode, elementSetText],
            ['change', '[data-js-content="element-sound"]', doIfEditMode, elementSetSound],
            ['change', '[data-js-content="element-image"]', doIfEditMode, elementSetImage],
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

    const clearElementPropControls = () => {
        $('[data-js-css-value]').each((index, elem) => {
            const $elem = $(elem);
            if ($elem.attr("type") == "text") {
                $elem.val('');
                reeturn;
            }
            if ($elem.attr("type") == "color") {
                $elem.val('#000000');
                return;
            }
        });

        $('[data-js-content="element-text"]').text("");
        $('[data-js-content="element-sound"]').val(null);
        $('[data-js-content="element-image"]').val(null);
        $('[data-js-behavior="draggable"]').prop("checked", false);
    };

    const fillCssFields = () => {
        clearElementPropControls();

        const element = data.data.pages[state.currentPage].elements[state.currentElement];
        if (!element.style) {
            console.warn('element has no style section, it is so strange');
            return;
        }

        for (let prop in element.style) {
            const value = element.style[prop];

            // check if it is color
            if (value.match(/#[0-9a-f]{3}([0-9a-f]{3})?/)) {
                // console.log(prop, 'color', value);
                $('[data-js-css-value="' + prop + '"]').val(value);
                continue;
            }
            // first type: digital + optional unit
            const parts = /(\d+)([^\d]+)?/.exec(value);
            if (parts) {
                // console.log(prop, 'dimension', value);
                $('[data-js-css-value="' + prop + '"]').val(parts[1]);
                $('[data-js-css-unit="' + prop + '"]').val(parts[2]);
                continue;
            }
            console.warn('CSS property value is not recognized: ', prop, value);

        }
        $('[data-js-content="element-text"]').text(element.content.text);
        $('[data-js-content="element-sound"]').val(element.content.sound);
        $('[data-js-content="element-image"]').val(element.content.image);
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

                    $('[data-js-css-value="left"]').val(newLeft).change();
                    $('[data-js-css-value="top"]').val(newTop).change();
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

    const renderElements = (targetSelector, pageContent) => {
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
                            .text('-')
                    )

                    list.forEach((filename) => {
                        $select.append(
                            $("<option>")
                                .attr("value", filename)
                                .text(filename)
                        )
                    });
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
        renderElements(".content", data.data.pages[state.currentPage]);
        updateAdminBlockState();
        fillCssFields();
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

        attachHandlers();
        fillSoundSelector();
        fillImageSelector();
        modeEditOn();

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
