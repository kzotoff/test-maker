"use strict";

const PresentationData = function(options) {

    this.options = options || {};

    this.data = mobx.observable({});

    this.makeDataFrom = (newData) => {
        // delete only elements that are absent in new data, it is intended restriction
        for (let key in this.data) {
            if (!(key in newData)) {
                delete(this.data[key]);
            }
        }
        for (let key in newData) {
            this.data[key] = newData[key];
        }
    };

    this.newElement = () => {
        return {
            "content": {
                "text": "hello, world!",
            },
            "style": {
                "left": "20%",
                "top": "20%",
                "width": "200px",
                "height": "50px",
                "background-color": "#9bf",
            },
        };

    };

    this.emptyPage = () => {
        return {
            metadata: {},
            elements: [
                this.newElement(),
            ],
        };
    };

    this.emptyData = () => {
        return {
            metadata: {},
            pages: [
                this.emptyPage(),
            ],
        };
    };

    this.reset = () => {
        console.log('reset');
        this.makeDataFrom(this.emptyData());
    };

    this.parseContent = (rawContent) => {
        if (!rawContent) {
            return this.emptyData();
        }

        try {
            const result = JSON.parse(rawContent);
            if (!result) {
                return this.emptyData();
            }
            return result;
        } catch {
            return this.emptyData();
        }
    };

    this.loadFromStorage = () => {
        const rawData = localStorage.getItem("data");
        this.makeDataFrom(this.parseContent(rawData));
    };

    this.saveToStorage = () => {
        console.log('saving data to localstorage');
        localStorage.setItem("data", JSON.stringify(this.data));
    };

    this.pageAdd = () => {
        this.data.pages.push(this.emptyPage());
    };

    this.pageDelete = (index) => {
        this.data.pages.splice(index, 1);
    };

    this.elementAdd = (pageIndex) => {
        this.data.pages[pageIndex].elements.push(this.newElement());
    };

    this.elementDelete = (pageIndex, elementIndex) => {
        this.data.pages[pageIndex].elements.splice(elementIndex);
    };
};

(($) => {

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

    const attachHandlers = () => {

        $('body').on('click', '[data-js-action="presentation-test"]', () => {
            //
        });

        $('body').on('click', '[data-js-action="presentation-export"]', () => {
            //
        });

        $('body').on('click', '[data-js-action="presentation-reset"]', () => {
            if (!confirm('start over?')) { return; }
            if (!confirm('sure?')) { return; }
            if (!confirm('absolutely?')) { return; }
            data.reset();
        });

        // button handlers
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

        $('body').on('click', '[data-js-element-index]', (event) => {
            state.currentElement = parseInt($(event.target).attr('data-js-element-index'));
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
            const text = $(event.target).val();
            elementUpdateText(text);
        });
        $('body').on('change', '[data-js-css-value]', (event) => {
            const prop = $(event.target).attr('data-js-css-value');
            elementUpdateStyle(prop);
        });
        $('body').on('change', '[data-js-css-unit]', (event) => {
            const prop = $(event.target).attr('data-js-css-unit');
            elementUpdateStyle(prop);
        });

    }

    const renderPagesSummary = () => {
        const div = $('[data-js-target="pages-summary"]');
        div.html((state.currentPage + 1) + '/' + data.data.pages.length)
    };

    const renderElementsSummary = () => {
        const div = $('[data-js-target="elements-summary"]');
        div.html((state.currentElement + 1) + '/' + data.data.pages[state.currentPage].elements.length)
    };

    const fillCssFields = () => {
        $('input[data-js-css]').val(null);
        const element = data.data.pages[state.currentPage].elements[state.currentElement];
        if (!element.style) {
            console.warn('element has no style section, it is strange');
            return;
        }
        for (let prop in element.style) {
            const value = element.style[prop];

            // check if it is color
            if (value.match(/#[0-9a-f]{3}([0-9a-f]{3})?/)) {
                console.log('color', value);
                $('[data-js-css-value="' + prop + '"]').val(value);
                continue;
            }
            // first type: digital + optional unit
            const parts = /(\d+)([^\d]+)?/.exec(value);
            if (parts) {
                console.log('dimension', value);
                $('[data-js-css-value="' + prop + '"]').val(parts[1]);
                $('[data-js-css-unit="' + prop + '"]').val(parts[2]);
                continue;
            }

            console.warn('unknown', prop, value);

        }
        $('[data-js-content="element-text"]').text(element.content.text);

    }

    const renderElements = (targetSelector, pageContent) => {
        const $content = $(targetSelector);
        $content.empty();

        pageContent.elements.forEach((elem, index) => {

            const div = $("<div>")
                .css({
                    "position": "absolute",
                    "display": "flex",
                    "align-items": "center",
                    "justify-content": "center",
                })
                .attr('data-js-element-index', index)
                ;

            if (elem.content && elem.content.text) {
                div.text(elem.content.text);
            }

            if (elem.style) {
                for (let prop in elem.style) {
                    div.css(prop, elem.style[prop]);
                }
            }

            if (index === state.currentElement) {
                div.css("outline", "2px red dashed");
            }

            $content.append(div);
        });

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

        mobx.autorun(
            () => render()
        );
    })

})(jQuery);
