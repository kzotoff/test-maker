"use strict";

if (typeof mobx === "undefined") {
    console.warn("MobX is required!");
}

const StateManager = function(defaultState) {

    this.set = (data) => {
        this.state = mobx.observable(data);
    };

    this.save = () => {
        localStorage.setItem("state", JSON.stringify(this.state));
    };

    this.load = () => {
        const savedState = localStorage.getItem("state");
        if (savedState) {
            this.set(JSON.parse(savedState));
        };
    };

    this.attach = () => {
        return this.state;
    }

    this.set(defaultState);

}