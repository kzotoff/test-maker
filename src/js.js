"use strict";

(($, _) => {

    const defaultState = {
        modes: {
            edit: true,
            saving: false,
            loading: false,
        },
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
            "behavior": true,
            "solution": true,
        },
    };

    console.log('yeah we are starting');

    const stateManager = new StateManager(defaultState);
    stateManager.load();
    const state = stateManager.attach();

    mobx.reaction(
        () => { return JSON.stringify(state); },
        () => { stateManager.save(); }
    );

    const helpManager = new HelpManager();

    const translator = new Translator();

    const audio = new Audio();
    audio.onended = () => {
        audioStop();
    };

    const notificator = new Notificator(".notifications", "LANG_PACK");

    const data = new PresentationData({
        defaultText: translator.forCode("new-element-text"),
    });
    data.loadFromStorage();

    // solution check debounce control
    var solutionShouldBeChecked = false;

    //
    //
    //

    const fullScreenToggle = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            $('html')[0].requestFullscreen();
        }
    }

    const switchAdminBlockVisible = (event) => {
        const blockId = $(event.target).closest('.admin-block').attr('data-admin-block-id');
        state.adminBlocksShown[blockId] = !state.adminBlocksShown[blockId];
    };

    const modeEditOn = () => {
        state.modes.edit = true;
        arrowReset();
        moverReset();
    };

    const modeEditOff = () => {
        state.modes.edit = false;
    };

    const modeSaveSet = (value) => {
        if (typeof value === "undefined") {
            value = !state.modes.saving
        }
        state.modes.saving = value;
        state.modes.loading = false;
    };

    const modeLoadSet = (value) => {
        if (typeof value === "undefined") {
            value = !state.modes.loading
        }
        state.modes.loading = value;
        state.modes.saving = false;

        if (value) {
            fillJsonSelector();
        }
    };

    const applyModes = () => {
        const $html = $('html');
        for (let mode in state.modes) {
            $html.attr(`data-mode-${mode}`, state.modes[mode] ? "on" : "off");
        };
    };

    const playModeReset = () => {
        console.log('play-reset');
        arrowReset();
        moverReset();
        render();
    };

    const helperModeSwitch = () => {
        helpManager.helpModeToggle();
    };

    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //
    // start over, import and export
    //
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

    const dataReset = async (noConfirm) => {

        if (!(noConfirm === true)) {
            if (!confirm(translator.forCode("reset-confirmation"))) {
                return false;
            }
        }
        data.reset();
        return true;
    };

    const dataNew = async () => {

        const ok = await dataReset();
        if (!ok) {
            return;
        }
    };

    const dataSave = async () => {
        const content = JSON.stringify(data.data, null, 4);
        var filename = $('[name="presentation-save-name"]').val().trim();

        if (!filename) {
            notificator.error(translator.forCode("specify-save-as-name"));
            return;
        }
        filename = filename + ".json";

        const formData = new FormData();
        formData.append("type", "json");
        formData.append("file[]", new Blob([content]), filename);

        return Promise.resolve($.ajax({
            type: 'POST',
            url: './api/upload.php',
            data: formData,
            processData: false,
            enctype: 'multipart/form-data',
            contentType: false,
            success: () => {
                notificator.info(translator.forCode("saved-as") + ' ' + filename);
                modeSaveSet(false);
            },
        }));
    };

    const dataLoad = async () => {
        const filename = $('[name="presentation-load-name"]').val();

        if (!filename) {
            return;
        }

        return Promise.resolve($.ajax({
            type: 'GET',
            url: './media/json/' + filename,
            contentType: 'text/plain',
            success: (result) => {
                notificator.info(translator.forCode("presentation-loaded"));
                console.log('well, got that:', result);
                modeLoadSet(false);
                data.makeDataFrom(result);
                render();
            },
        }));
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

        fillSoundSelector();
        fillImageSelector();
        data.saveToStorage();
        render();
    };

    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //
    // media library
    //
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

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

    const mediaEmpty = async () => {

        if (!confirm(translator.forCode("media-empty-confirmation"))) {
            return false;
        }
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
    };

    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //
    // page management
    //
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

    const pagePrev = (event) => {
        if (state.modes.edit && $(event.target).hasClass("element")) {
            return;
        }
        state.currentPage = Math.max(state.currentPage - 1, 0);
        state.currentElement = 0;
    };

    const pageNext = (event) => {
        if (state.modes.edit && $(event.target).hasClass("element")) {
            return;
        }
        state.currentPage = Math.min(state.currentPage + 1, data.data.pages.length - 1);
        state.currentElement = 0;
    };

    const pageAdd = () => {
        data.pageAdd();
        pageNext();
        data.elementAdd(state.currentPage);
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

    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //
    // elements management
    //
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

    const elementSelect = (event) => {
        console.log('select');
        state.currentElement = parseInt($(event.currentTarget).attr('data-js-element-index'));
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

        if (!element) {
            // TODO currentElement should be set to null/undefined when no elements
            // TODO currently it is always int
            return;
        }

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

            console.log('[elementSetStyle]', prop, propValue);
            element.style[prop] = propValue;
        }

    };

    const elementSetBehavior = (event) => {

        const $control = $(event.target);
        const behaviorProperty = $control.attr("data-js-behavior");

        var propertyValue;
        if ($control.attr("type") == "checkbox") {
            propertyValue = $control[0].checked;
        } else {
            propertyValue = $control.val();
        }

        // id must be unique
        if (behaviorProperty == "id") {
            const exist = data.data.pages[state.currentPage].elements.find((elem, index) => {
                return index != state.currentElement && elem.behavior.id == propertyValue;
            });
            if (exist) {
                notificator.error(translator.forCode("this-id-is-already-used"));
                $control.val("");
                return;
            }
        }

        // assow source and dragging are not compatible
        if (behaviorProperty == "draggable" && propertyValue == true) {
            data.elementSetBehavior(state.currentPage, state.currentElement, "arrow-start", false);
        }
        if (behaviorProperty == "arrow-start" && propertyValue == true) {
            data.elementSetBehavior(state.currentPage, state.currentElement, "draggable", false);
        }


        data.elementSetBehavior(state.currentPage, state.currentElement, behaviorProperty, propertyValue);
    };

    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //
    // audio module
    //
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

    const audioPlay = (url) => {
        console.log('audio play');
        audio.pause();
        audio.src = url;
        audio.play();
        $('.audio-overlay').css('display', 'block');
    };

    const audioStop = () => {
        console.log('audio stop');
        audio.pause();
        $('.audio-overlay').css('display', 'none');
    };

    const elementAudioPlay = (event) => {
        const elementIndex = parseInt($(event.target).closest('[data-js-element-index]').attr('data-js-element-index'));
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

    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //
    // mover module
    //
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

    const moverResults = [
        /*
        {
            "element": 1,
            "target": 2,
            "isCorrect": true,
        }
        */
    ];

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

    const moverStart = (event) => {

        if (state.modes.edit) {
            return;
        }

        const $div = $(event.target);
        const elementIndex = $div.attr("data-js-element-index");

        $div.removeClass("solved-correct")
        $div.removeClass("solved-wrong")

        for (let i = moverResults.length - 1; i >= 0; i--) {
            if (moverResults[i].element == elementIndex) {
                moverResults.splice(i, 1);
            }
        }
    };

    const moverStop = (event) => {

        const $div = $(event.target);
        if (state.modes.edit) {
            const $offset = $div.offset();
            console.log('drag stop:', $offset);

            const newLeft = calcPosition($offset.left, $('.content').outerWidth(), $('[data-js-css-unit="left"]').val());
            const newTop = calcPosition($offset.top, $('.content').outerHeight(), $('[data-js-css-unit="top"]').val());

            $('[data-js-css-prop="left"]').val(newLeft).change();
            $('[data-js-css-prop="top"]').val(newTop).change();
        }

        checkSolution();
    };

    const moverCatch = (event) => {

        if (state.modes.edit) {
            return;
        }

        const $div = $(event.target);
        const targetElemIndex = $div.attr('data-js-element-index');
        const targetElemData = data.data.pages[state.currentPage].elements[targetElemIndex];


        const droppedElem = event.originalEvent.target;
        // const droppedElem = ui.draggable[0];
        const droppedElemIndex = droppedElem.getAttribute("data-js-element-index");
        if (!droppedElemIndex) {
            console.warn("dropped item has no element index. was it from our universe?");
            return;
        }
        const droppedItemData = data.data.pages[state.currentPage].elements[droppedElemIndex]
        const droppedElementId = droppedItemData.behavior.id;

        const correctElements = _.get(targetElemData, "behavior.drag-target", "")
            .split(/[,\s\/]+/)
            .filter(e => e)
            .map(e => e.toString());

        const isCorrect = correctElements.includes(droppedElementId.toString());
        if (isCorrect) {
            $(droppedElem).addClass("solved-correct");
        } else {
            $(droppedElem).addClass("solved-wrong");
        }
        moverResults.push({
            "element": droppedElemIndex,
            "target": targetElemIndex,
            "isCorrect": isCorrect,
        });
        checkSolution();
    };

    const moverReset = () => {
        moverResults.length = 0;
    }

    const behaviorAddDraggable = ($div) => {
        $div.draggable({
            start: moverStart,
            stop: moverStop,
        });
    };

    const behaviorAddDroppable = ($div) => {
        $div.droppable({
            drop: moverCatch,
        });
    };


    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //
    // arrows are here
    //
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

    const arrowMaker = {
        active: false,
        existingArrows: [
            /*
            {
                "from": sourceElementIndex,
                "to": targetElementIndex,
                "node": newArrow,
            }
            */
        ],
        fromElementIndex: undefined,
        fromX: 0,
        fromY: 0,
        toX: 0,
        toY: 0,
    };

    const arrowModeBegin = (event) => {
        console.log('arrow mode start');

        const elementIndex = parseInt($(event.target).closest('[data-js-element-index]').attr('data-js-element-index'));
        const element = data.data.pages[state.currentPage].elements[elementIndex];

        if (element.behavior["arrow-start"] !== true) {
            console.log('not an arrow start place');
            return;
        }

        arrowMaker.fromElementIndex = elementIndex;
        arrowMaker.fromX = event.pageX;
        arrowMaker.fromY = event.pageY;
        arrowMaker.active = true;
    };

    const arrowAddCoords = (params) => {
        const newArrowSvg = $('[data-js-action="arrow-template"] svg').clone();
        $('[data-js-action="existing-arrows"]').append(newArrowSvg);
        return arrowDrawCoords(newArrowSvg, params);
    }

    const arrowDrawCoords = (svg, params) => {

        const fromX = params.x1;
        const fromY = params.y1;
        const toX = params.x2;
        const toY = params.y2;

        const strokeWidth = 7; // inner arrow width
        const borderWidth = 1; // width of black border around the arrow
        const innerMarkerSize = 4; // arrowhead length for 1 pixel stroke
        const magic = 1.07; // I'm too lazy to calc all the math so I just guessed this value

        const upscale = (strokeWidth + 2 * borderWidth) / strokeWidth;

        const viewBoxPlus = strokeWidth * 3; // head width is 3 pixels

        const arrowWidth = Math.abs(toX - fromX);
        const arrowHeight = Math.abs(toY - fromY);

        const lineInner = svg.find('[data-anchor="line-inner"]');
        const markerInner = svg.find('[data-anchor="arrowhead-inner"]');
        const lineBorder = svg.find('[data-anchor="line-border"]');
        const markerBorder = svg.find('[data-anchor="arrowhead-border"]');

        const viewBox = `-${viewBoxPlus} -${viewBoxPlus} ${arrowWidth + 2 * viewBoxPlus} ${arrowHeight + 2 * viewBoxPlus}`;
        svg.attr("viewBox", viewBox);

        svg.css({
            "display": "block",
            "position": "fixed",
            "left": Math.min(fromX, toX) - viewBoxPlus,
            "top": Math.min(fromY, toY) - viewBoxPlus,
            "width": arrowWidth + 2 * viewBoxPlus,
            "height": arrowHeight + 2 * viewBoxPlus,
        });

        const lineId = new Date().getTime() + Math.random();

        lineInner.attr("stroke-width", strokeWidth);
        lineInner.attr("x1", toX > fromX ? 0 : arrowWidth);
        lineInner.attr("x2", toX > fromX ? arrowWidth : 0);
        lineInner.attr("y1", toY > fromY ? 0 : arrowHeight);
        lineInner.attr("y2", toY > fromY ? arrowHeight : 0);

        // points="0 0, 8 3, 0 6"
        markerInner.attr({
            markerWidth: 2 * innerMarkerSize,
            markerHeight: 1.5 * innerMarkerSize,
            refX: 1.8 * innerMarkerSize - 0.4,
            refY: 0.75 * innerMarkerSize,
        });
        markerInner.find("polygon").attr("points", `0 0, ${2 * innerMarkerSize} ${0.75 * innerMarkerSize}, 0 ${1.5 * innerMarkerSize}`)


        lineBorder.attr("stroke-width", strokeWidth + 2 * borderWidth);
        lineBorder.attr("x1", toX > fromX ? 0 : arrowWidth);
        lineBorder.attr("x2", toX > fromX ? arrowWidth : 0);
        lineBorder.attr("y1", toY > fromY ? 0 : arrowHeight);
        lineBorder.attr("y2", toY > fromY ? arrowHeight : 0);

        const borderMarkerSize = 4 / upscale * magic;

        markerBorder.attr({
            markerWidth: 2 * borderMarkerSize,
            markerHeight: 1.5 * borderMarkerSize,
            refX: 2 * borderMarkerSize - 1.33 / magic,
            refY: 0.75 * borderMarkerSize,
        });
        markerBorder.find("polygon").attr("points", `0 0, ${2 * borderMarkerSize} ${0.75 * borderMarkerSize}, 0 ${1.5 * borderMarkerSize}`)

        // re-attach markers (separate for each SVG so add unique ID)
        const arrowInnerHeadId = "arrowhead-inner-" + lineId;
        markerInner.attr("id", arrowInnerHeadId);
        lineInner.attr("marker-end", `url(#${arrowInnerHeadId})`);

        const arrowBorderHeadId = "arrowhead-border-" + lineId;
        markerBorder.attr("id", arrowBorderHeadId);
        lineBorder.attr("marker-end", `url(#${arrowBorderHeadId})`);

        if (params.color) {
            lineInner.attr("stroke", params.color);
            markerInner.find('polygon').attr("fill", params.color);

        }
        return svg;
    };

    const arrowModeDraw = (event) => {
        if (!arrowMaker.active) {
            return;
        }

        arrowDrawCoords($('[data-js-action="arrow-template"] svg'), {
            x1: arrowMaker.fromX,
            y1: arrowMaker.fromY,
            x2: event.pageX,
            y2: event.pageY,
        });
    };

    const arrowModeCatch = (event) => {

        if (!arrowMaker.active) {
            return;
        }

        // first, just get source and target elements
        var targetElementIndex = event.target.getAttribute("data-js-element-index");
        if (!targetElementIndex) {
            console.warn("element has no index, strange");
        }
        const sourceElementIndex = arrowMaker.fromElementIndex;
        const sourceElement = data.data.pages[state.currentPage].elements[sourceElementIndex]
        const sourceElementBehaviorId = _.get(sourceElement, "behavior.id");

        // IQ board patch start
        //
        // that boards "pointerup" event always shows event target to element where "pointerdown" occured
        // so target element will be always equal to start element
        //
        // TODO this test ignores z-index but should respect it

        if (sourceElementIndex == targetElementIndex) {

            const endX = event.pageX;
            const endY = event.pageY;

            $('.element').each((index, elem) => {
                if (
                    endX > elem.offsetLeft && endX < elem.offsetLeft + elem.offsetWidth
                    &&
                    endY > elem.offsetTop  && endY < elem.offsetTop + elem.offsetHeight
                ) {
                    targetElementIndex = index;
                    console.log('found another arrow target: ', elem);
                }
            });

            // well, they are REALLY the same
            if (sourceElementIndex == targetElementIndex) {
                console.log('source and target for the arrow are the same, skipping');
                return;
            }
        }

        //
        // IQ board patch end

        const targetElement = data.data.pages[state.currentPage].elements[targetElementIndex];

        // check if from/to limits are not exceeded
        // remove all "from" and "to" when exceeded
        const sourceElementFromLimit = sourceElement.behavior["arrow-max-count-from"];
        const targetElementToLimit = targetElement.behavior["arrow-max-count-to"];

        const sourceLimitExceeded =
            sourceElementFromLimit > 0
            &&
            arrowMaker.existingArrows.filter(arrow => arrow.from == sourceElementIndex).length >= sourceElementFromLimit;

        const targetLimitExceeded =
            targetElementToLimit > 0
            &&
            arrowMaker.existingArrows.filter(arrow => arrow.to == targetElementIndex).length >= targetElementToLimit;

        arrowMaker.existingArrows = arrowMaker.existingArrows.filter(arrow => {

            if (
                sourceLimitExceeded && arrow.from == sourceElementIndex
                ||
                targetLimitExceeded && arrow.to == targetElementIndex
            ) {
                $(arrow.htmlElement).remove();
                return false;
            }
            return true;
        });

        // well, now add new arrow
        const correctSources = _.get(targetElement, "behavior.arrow-end-for", "")
            .split(/[,\s\/]+/)
            .filter(e => e)
            .map(e => e.toString());

        const isCorrect = correctSources.includes(sourceElementBehaviorId.toString());

        const newArrow = arrowAddCoords({
            x1: arrowMaker.fromX,
            y1: arrowMaker.fromY,
            x2: event.pageX,
            y2: event.pageY,
            color: isCorrect ? "#0d0" : "#f44",
        });

        arrowMaker.existingArrows.push({
            "from": sourceElementIndex,
            "to": targetElementIndex,
            "isCorrect": isCorrect,
            "htmlElement": newArrow,
        });

        checkSolution();
    };

    // stop arrow drawing even on empty space
    const arrowModeEnd = (event) => {
        arrowMaker.active = false;
        const svg = $('[data-js-action="arrow-template"] svg');
        svg.css('display', 'none');
        checkSolution();
    };

    const arrowReset = (event) => {
        arrowMaker.existingArrows = [];
        $('[data-js-action="existing-arrows"]').empty();
    };

    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //
    // solution control
    //
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

    const pageSetSolution = (event) => {

        const $control = $(event.target);
        const solutionProperty = $control.attr("data-js-solution");

        var propertyValue;
        if ($control.attr("type") == "checkbox") {
            propertyValue = $control[0].checked;
        } else {
            propertyValue = $control.val();
        }

        data.pageSetSolution(state.currentPage, state.currentElement, solutionProperty, propertyValue);
    };

    const checkSolution = () => {

        if (state.modes.edit) {
            return;
        }

        if (solutionShouldBeChecked) {
            clearTimeout(solutionShouldBeChecked);
        }
        solutionShouldBeChecked = setTimeout(doCheckSolution, 50);
    };

    const doCheckSolution = () => {
        console.log('checking if all correct...');

        const solution = data.data.pages[state.currentPage].solution;

        if (!solution) {
            console.log("no solution section, nothing to check");
            return;
        }

        var arrowsAreCorrect = true;
        var moversAreCorrect = true;

        const arrowsTotal = arrowMaker.existingArrows.length;
        const arrowsNeeded = parseInt(solution["solution-correct-arrows"] || 0);
        const arrowsCorrect = arrowMaker.existingArrows.filter(arrow => arrow.isCorrect).length;
        if (arrowsTotal != arrowsCorrect || arrowsTotal != arrowsNeeded) {
            arrowsAreCorrect = false;
        }

        const moversTotal = moverResults.length;
        const moversNeeded = parseInt(solution["solution-correct-movers"] || 0);
        const moversCorrect = moverResults.filter(elem => elem.isCorrect).length;
        if (moversTotal != moversCorrect || moversTotal != moversNeeded) {
            moversAreCorrect = false;
        }

        if (arrowsAreCorrect && moversAreCorrect) {
            indicateCorrectSolution();
        }
    };

    // do when solution is correct
    const indicateCorrectSolution = () => {

        console.log('this is correct!');

        const solution = data.data.pages[state.currentPage].solution;

        const showElementsOnCorrect = solution["solution-correct-show-elements"];
        if (showElementsOnCorrect) {
            showElementsOnCorrect
                .split(/[,\s\/]+/)
                .filter(e => e)
                .map(e => e.toString())
                .forEach(behaviorId => {
                    const elemIndex = data.data.pages[state.currentPage].elements.findIndex(e => e.behavior.id == behaviorId);
                    $(`[data-js-element-index="${elemIndex}"]`).css("visibility", "visible");
                });

        }

        const playSoundOnCorrect = solution["solution-correct-play-sound"];
        if (playSoundOnCorrect) {
            const url = './media/sound/' + playSoundOnCorrect;
            audioPlay(url);
        }
    };

    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //
    // all your handler are belong to us
    //
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

    const attachHandlers = () => {

        const doIfEditMode = () => state.modes.edit;
        const doIfPlayMode = () => !state.modes.edit;
        const doAlways = () => true;

        const handlers = [

            // general
            ['click', '[data-js-action="mode-set-edit"]', doAlways, modeEditOn],
            ['click', '[data-js-action="mode-set-play"]', doAlways, modeEditOff],
            ['click', '[data-js-action="mode-set-fullscreen"]', doAlways, fullScreenToggle],
            ['click', '[data-js-action="play-restart"]', doIfPlayMode, playModeReset],
            ['click', '[data-js-action="helper-mode-switch"]', doAlways, helperModeSwitch],

            ['click', '.element', doIfPlayMode, elementAudioPlay],
            ['click', '.element-sound-icon', doIfEditMode, elementAudioPlay],
            ['click', '.audio-overlay', doAlways, elementAudioStop],

            ['mousedown', '.element', doIfPlayMode, arrowModeBegin],
            ['mouseup', '.element', doIfPlayMode, arrowModeCatch],
            ['mouseup', null, doIfPlayMode, arrowModeEnd],
            ['mousemove', null, doIfPlayMode, arrowModeDraw],

            ['pointerdown', '.element', doIfPlayMode, arrowModeBegin],
            ['pointerup', '.element', doIfPlayMode, arrowModeCatch],
            ['pointerup', null, doIfPlayMode, arrowModeEnd],
            ['pointermove', null, doIfPlayMode, arrowModeDraw],

            ['click', '.admin-block-header', doIfEditMode, switchAdminBlockVisible],

            ['click', '[data-js-action="presentation-mode-save"]', doIfEditMode, () => modeSaveSet()],
            ['click', '[data-js-action="presentation-mode-save-cancel"]', doIfEditMode, () => modeSaveSet(false)],
            ['click', '[data-js-action="presentation-save-confirm"]', doIfEditMode, dataSave],

            ['click', '[data-js-action="presentation-mode-load"]', doIfEditMode, () => modeLoadSet()],
            ['click', '[data-js-action="presentation-mode-load-cancel"]', doIfEditMode, () => modeLoadSet(false)],
            ['click', '[data-js-action="presentation-load-confirm"]', doIfEditMode, dataLoad],

            ['click', '[data-js-action="presentation-export"]', doIfEditMode, dataExport],
            ['change', '[data-js-action="presentation-import"]', doIfEditMode, dataImport],
            ['click', '[data-js-action="presentation-reset"]', doIfEditMode, dataReset],
            ['click', '[data-js-action="media-empty"]', doIfEditMode, mediaEmpty],
            ['change', '[data-js-action="media-upload"]', doIfEditMode, mediaUpload],

            // pages
            ['click', '[data-js-action="page-add"]', doIfEditMode, pageAdd],
            ['click', '[data-js-action="page-delete"]', doIfEditMode, pageDelete],
            ['click', '[data-js-action="page-prev"]', doAlways, pagePrev],
            ['click', '[data-js-action="page-next"]', doAlways, pageNext],
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

            // end-user interactivity and solution controls
            ['change', '[data-js-action="behavior-control"]', doIfEditMode, elementSetBehavior],
            ['change', '[data-js-action="solution-control"]', doIfEditMode, pageSetSolution],
        ];

        handlers.forEach(handlerInfo => {
            const eventType = handlerInfo[0];
            const selector = handlerInfo[1];
            const availability = handlerInfo[2];
            const handler = handlerInfo[3];

                $('body').on(eventType, selector, (event) => {
                    if (availability()) {
                        console.debug('running handler for', event.type);
                        handler(event);
                    }
                });
        });

    };

    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //
    // render edit controls
    //
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

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
        if (data.data.pages.length === 0 || !data.data.pages[state.currentPage]) {
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

        if (pageData && pageData.metadata.backgroundImage) {
            $('[data-js-action="page-background-image"]').val(pageData.metadata.backgroundImage);
        }

    };

    const fillCssFields = () => {

        if (!data.data.pages[state.currentPage]) {
            return;
        }

        // first, clear all controls
        $('[data-js-css-prop]').each((index, elem) => {
            const $elem = $(elem);
            if ($elem.attr("type") == "text") {
                $elem.val('');
                return;
            }
            if ($elem.attr("type") == "number") {
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
        $('[data-js-action="element-css-toggle"]').prop("checked", false);

        //
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

            // check if it is hex color
            if (styleControl.attr('data-input-type') == "color") {
                console.log('[fillCssFields]', prop, 'color', value);
                styleControl.val(value).change();
                colorPickerUpdateInputValue(styleControl, value);
                continue;
            }

            if (!styleControl) {
                console.warn('CSS property value is not recognized and will be deleted: ', prop, value);
                delete(element.style[prop]);
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
    };

    const fillBehaviorProps = () => {

        // clearing first
        $('input[data-js-action="behavior-control"][type="checkbox"]').prop("checked", false);
        $('input[data-js-action="behavior-control"][type="text"]').val("");
        $('input[data-js-action="behavior-control"][type="number"]').val("");
        $('select[data-js-action="behavior-control"]').val("");

        //
        if (!data.data.pages[state.currentPage]) {
            return;
        }

        const element = data.data.pages[state.currentPage].elements[state.currentElement];

        if (!element) {
            console.log('no elements');
            return;
        }
        if (!element.behavior) {
            console.warn('element has no behavior section, it is so strange');
            return;
        }

        for (let prop in element.behavior) {

            const value = element.behavior[prop];
            const propControl = $(`[data-js-behavior="${prop}"]`);

            if (!propControl) {
                console.warn(`Control not found for behavior property ${prop}. Property will be removed`);
                delete(element.behavior[prop]);
                continue;
            }

            if (propControl.attr("type") == "checkbox") {
                propControl[0].checked = !! value;
            } else {
                propControl.val(value);
            }
        }
    };

    const fillSolutionProps = () => {

        if (!data.data.pages[state.currentPage]) {
            return;
        }

        $('[data-js-action="solution-control"][type="checkbox"]').prop("checked", false);
        $('[data-js-action="solution-control"][type="text"]').val("");
        $('[data-js-action="solution-control"][type="number"]').val("");

        const page = data.data.pages[state.currentPage];

        if (!page) {
            console.log('no page');
            return;
        }
        if (!page.solution) {
            console.warn('page has no solution section');
            return;
        }

        for (let prop in page.solution) {

            const value = page.solution[prop];
            const propControl = $(`[data-js-solution="${prop}"]`);

            if (!propControl) {
                console.warn(`Control not found for solution property ${prop}. Property will be removed`);
                delete(page.solution[prop]);
                continue;
            }

            if (propControl.attr("type") == "checkbox") {
                propControl[0].checked = !! value;
            } else {
                propControl.val(value);
            }
        }
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
        fillMediaSelector('sound', '[data-js-content="solution-correct-sound"]');
    };

    const fillImageSelector = () => {
        fillMediaSelector('image', '[data-js-content="element-image"]');
    };

     const fillJsonSelector = () => {
        fillMediaSelector('json', '[data-js-content="presentations"]');
    };

    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //
    // init jQuery plugins
    //
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

    const colorPickerInit = (selector) => {

        jscolor.presets.default = {
            format:'hexa',
            uppercase:false,
            previewPosition:'right',
            width:200,
            height:200,
        };

        $(selector).each((index, controlElem) => {
            if (!$(controlElem).attr('data-jscolor')) {
                $(controlElem).attr('data-jscolor', "");
            }
            jscolor.install()
        });
    };

    const colorPickerUpdateInputValue = (element, value) => {
        element.each((index, elem) => {
            if (elem.jscolor) {
                elem.jscolor.fromString(value);
            }
        });
    };

    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //
    // render elements
    //
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////

    const renderElement = (elem, index) => {
        const $div = $("<div>")
            .addClass('element')
            .addClass('element-default')
            .attr('data-js-element-index', index)
            ;

        if (elem.content && elem.content.text) {
            $div.text(elem.content.text);
        }

        if (elem.content && elem.content.image) {
            $div.css('background-image', 'url(./media/image/' + elem.content.image + ')');
        }

        if (elem.style) {
            for (let prop in elem.style) {

                if (prop == "visibility" && elem.style[prop] == "hidden" && state.modes.edit) {
                    $div.addClass('element-hidden');
                    continue;
                }
                $div.css(prop, elem.style[prop]);
            }
        }

        if (elem.content.sound) {
            $div.append('<div class="element-sound-icon fa-solid fa-music"></div>');
        }

        if (state.modes.edit) {
            if (index === state.currentElement) {
                $div.css("outline", "2px red dashed");
            }
        }

        if (
            _.get(elem, "behavior.draggable")
            ||
            state.modes.edit // it is much simpler to edit with dragging
        ) {
            behaviorAddDraggable($div);
        };

        if (
            _.get(elem, "behavior.drag-target")
        ) {
            behaviorAddDroppable($div);
        }

        if (
            _.get(elem, "behavior.on-click")
        ) {
            $div.attr("data-js-action", elem.behavior["on-click"]);
        }

        return $div;

    };

    const renderElements = (targetSelector, pageContent) => {

        if (!pageContent) {
            console.log("no page content provided")
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

    const renderPage = (targetSelector, pageContent) => {

        if (!pageContent) {
            console.log("no page content provided")
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

    const render = () => {

        console.debug('render');
        renderPagesSummary();
        renderElementsSummary();
        renderPage(".content", data.data.pages[state.currentPage]);
        renderElements(".content", data.data.pages[state.currentPage]);
        updateAdminBlockState();
        fillPagePropControls();
        fillCssFields();
        fillBehaviorProps();
        fillSolutionProps();
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
            () => { return JSON.stringify(state.modes); },
            () => { applyModes(); }
        )

        helpManager.install(helpId => translator.forCode(helpId));
        applyModes();
        attachHandlers();
        fillSoundSelector();
        fillImageSelector();
        translator.applyAuto();

        colorPickerInit('[data-input-type="color"]')

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
