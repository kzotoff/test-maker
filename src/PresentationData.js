"use strict";

if (!_) {
    console.warn("lodash required!");
}

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
                "text": options.defaultText || "Hello, world!",
            },
            "behavior": {
                "draggable": false,
            },
            "style": {
                "left": "45%",
                "top": "45%",
                "width": "10%",
                "height": "50px",
                "background-color": "#aaffaa",
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

        var maxBehaviorId = 0;
        this.data.pages[pageIndex].elements.forEach(elem => {
            maxBehaviorId = Math.max(elem.behavior.id, maxBehaviorId);
        });
        const newElement = this.newElement();
        newElement.behavior.id = maxBehaviorId + 1;
        this.data.pages[pageIndex].elements.push(newElement);
    };

    this.elementDelete = (pageIndex, elementIndex) => {
        this.data.pages[pageIndex].elements.splice(elementIndex, 1);
    };

    this.elementSetBehavior = (pageIndex, elementIndex, property, newValue) => {
        _.set(
            this.data.pages[pageIndex].elements[elementIndex],
            `behavior.${property}`,
            newValue
        );
    };

};
