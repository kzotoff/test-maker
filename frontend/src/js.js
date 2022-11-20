"use strict";

const PresentationData = function(options) {

    this.options = options || {};

    this.data = mobx.observable({});

    this.emptyPage = function() {
        return {
            metadata: {},
            objects: [],
        };
    };

    this.reset = () => {
        console.log('reset');
        this.data = mobx.observable({
            pages: [],
            metadata: {},
        });
    }

    this.loadFromStorage = function() {
        const rawData = localStorage.getItem("data");

        try {
            this.data = mobx.observable(JSON.parse(rawData));
            if (!this.data) {
                throw 'No data at the storage';
            }
        } catch {
            console.warn('error reading localstorage data, defaulting to empty content');
            reset();
        }
    };

    this.saveToStorage = function () {
        console.log('saving data to localstorage');
        localStorage.setItem("data", JSON.stringify(this.data));
    };

    this.pageAdd = function() {
        this.data.pages.push(this.emptyPage());
    };

    this.pageDelete = (index) => {
        this.data.pages.splice(index, 1);
    };

};

(function($) {

    console.log('yeah we are starting');

    const data = new PresentationData();
    data.loadFromStorage();

    const state = mobx.observable({
        currentPage: 0,
        currentObject: 0,
    });

    const pageNext = function() {
        state.currentPage = Math.min(state.currentPage + 1, data.data.pages.length - 1);
    }
    const pagePrev = function() {
        state.currentPage = Math.max(state.currentPage - 1, 0);
    }

    const attachHandlers = function() {

        $('body').on('click', '[data-js-action="presentation-test"]', function() {
            //
        });

        $('body').on('click', '[data-js-action="presentation-export"]', function() {
            //
        });

        $('body').on('click', '[data-js-action="presentation-reset"]', function() {
            if (!confirm('start over?')) { return; }
            if (!confirm('sure?')) { return; }
            if (!confirm('absolutely?')) { return; }
            data.reset();
        });

        // button handlers
        $('body').on('click', '[data-js-action="page-add"]', function() {
            data.pageAdd();
            pageNext();
        });

        $('body').on('click', '[data-js-action="page-delete"]', function() {
            data.pageDelete(state.currentPage);
            state.currentPage = Math.min(state.currentPage, data.data.pages.length - 1);
        });

        $('body').on('click', '[data-js-action="page-prev"]', function() {
            pagePrev();
        });
        $('body').on('click', '[data-js-action="page-next"]', function() {
            pageNext();
        });
    }

    const renderPageInfo = function() {
        const div = $('[data-js-target="page-info"]');
        div.html((state.currentPage + 1) + '/' + data.data.pages.length)
    }

    const render = function() {

        console.log('render');
        renderPageInfo();

        // const content = $('.content');
    }

    //
    //
    //

    $(function() {

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
