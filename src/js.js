"use strict";

(($, _) => {

    console.log('yeah we are starting');

    const data = new PresentationData();
    data.loadFromStorage();

    const state = mobx.observable({
        currentPage: 0,
        currentElement: 0,
    });

    const pageNext = () => {
        state.currentPage = Math.min(state.currentPage + 1, data.data.pages.length - 1);
        state.currentElement = 0;
    }
    const pagePrev = () => {
        state.currentPage = Math.max(state.currentPage - 1, 0);
        state.currentElement = 0;
    }

    const elementNext = () => {
        state.currentElement = Math.min(state.currentElement + 1, data.data.pages[state.currentPage].elements.length - 1);
    }
    const elementPrev = () => {
        state.currentElement = Math.max(state.currentElement - 1, 0);
    }

    const elementUpdateStyle = (prop) => {
        const valueValue = $('[data-js-css-value="' + prop + '"]').val();
        const valueUnit = $('[data-js-css-unit="' + prop + '"]').val();
        const propValue = valueValue + (valueUnit ? valueUnit : "");
        const element = data.data.pages[state.currentPage].elements[state.currentElement];
        element.style[prop] = propValue;
    };

    const elementUpdateText = (text) => {
        const element = data.data.pages[state.currentPage].elements[state.currentElement];
        element.content.text = text;
    };
    const elementUpdateSound = (sound) => {
        const element = data.data.pages[state.currentPage].elements[state.currentElement];
        element.content.sound = sound;
    };

    const attachHandlers = () => {

        $('body').on('click', '[data-js-action="presentation-export"]', () => {
            alert('what?');
        });

        $('body').on('click', '[data-js-action="presentation-import"]', () => {
            alert('what?');
        });

        $('body').on('click', '[data-js-action="presentation-reset"]', () => {
            if (!confirm('delete everything and start over?')) { return; }
            if (!confirm('sure?')) { return; }
            if (!confirm('absolutely?')) { return; }
            data.reset();
        });

        $('body').on('change', '[data-js-action="input-add-sound"]', () => {
            const formElement = $('[data-js-action="input-add-sound"]').closest('form')[0];
            const formData = new FormData(formElement);
//            formData.append('file', $('[data-js-action="input-add-sound"]')[0].files);
//            formData.append('type', 'sound');
            $.ajax({
                url: '/api/upload.php',
                type: 'POST',
                data: formData,
                processData: false,
                enctype: 'multipart/form-data',
                contentType: false,
                success: (result) => {
                    fillSoundSelector();
                }
            });
        });

        // pages

        $('body').on('click', '[data-js-action="page-add"]', () => {
            data.pageAdd();
            pageNext();
        });

        $('body').on('click', '[data-js-action="page-delete"]', () => {
            state.currentPage = Math.min(state.currentPage, data.data.pages.length - 2);
            data.pageDelete(state.currentPage);
        });

        $('body').on('click', '[data-js-action="page-prev"]', () => {
            pagePrev();
        });
        $('body').on('click', '[data-js-action="page-next"]', () => {
            pageNext();
        });

        // elements

        $('body').on('mousedown', '.content [data-js-element-index]', (event) => {
            state.currentElement = parseInt($(event.target).attr('data-js-element-index'));
        });

        $('body').on('dragEnd', '.element', (event) => {
            console.log(event);
        });

        $('body').on('click', '[data-js-action="element-add"]', () => {
            data.elementAdd(state.currentPage);
            elementNext();
        });
        $('body').on('click', '[data-js-action="element-delete"]', () => {
            state.currentElement = Math.min(state.currentElement, data.data.pages[state.currentPage].elements.length - 2);
            data.elementDelete(state.currentPage, state.currentElement);
        });
        $('body').on('click', '[data-js-action="element-prev"]', () => {
            elementPrev();
        });
        $('body').on('click', '[data-js-action="element-next"]', () => {
            elementNext();
        });

        // design and content

        $('body').on('change', '[data-js-content="element-text"]', (event) => {
            elementUpdateText($(event.target).val());
        });

        $('body').on('change', '[data-js-content="element-sound"]', (event) => {
            elementUpdateSound($(event.target).val())
        });
        $('body').on('change', '[data-js-css-value]', (event) => {
            const prop = $(event.target).attr('data-js-css-value');
            elementUpdateStyle(prop);
        });
        $('body').on('change', '[data-js-css-unit]', (event) => {
            const prop = $(event.target).attr('data-js-css-unit');
            elementUpdateStyle(prop);
        });
        $('body').on('change', '[data-js-behavior="draggable"]', (event) => {
            data.elementSetDraggable(state.currentPage, state.currentElement, event.target.checked);
        });

    }

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
            .addClass("element")
            .addClass("element-default")
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

        if (index === state.currentElement) {
            $div.css("outline", "2px red dashed");
        }

        if (_.get(elem, "behavior.draggable")) {
            $div.draggable({
                stop: () => {
                    const $offset = $div.offset();
                    console.log($offset);

                    const newLeft = calcPosition($offset.left, $('.content').outerWidth(), $('[data-js-css-unit="left"]').val());
                    const newTop = calcPosition($offset.top, $('.content').outerHeight(), $('[data-js-css-unit="top"]').val());

                    $('[data-js-css-value="left"]').val(newLeft).change();
                    $('[data-js-css-value="top"]').val(newTop).change();
                }
            });

        };
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

    const fillSoundSelector = () => {
        $.get(
            "/api/list.php?type=mp3",
            (result) => {
                const $select = $('[data-js-content="element-sound"]');
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
                    console.warn('something went wrong while loading mp3 list', e)
                }


            }
        );

    };

    const render = () => {

        console.log('render');
        renderPagesSummary();
        renderElementsSummary();
        renderElements(".content", data.data.pages[state.currentPage]);
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

        mobx.autorun(
            () => render()
        );
    })

})(jQuery, _);
