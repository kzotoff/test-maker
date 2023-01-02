"use strict";

const Notificator = function(targetContainerSelector, langPack) {

    this.containerSelector = targetContainerSelector;
    this.langPack = langPack;
    this.defaultLevel = "info";
    this.defaultDelay = 5000;

    this.basicShow = (text, level, delay) => {
        const useDelay = delay || this.defaultDelay;
        const useLevel = level || this.defaultLevel;

        const moreElem = $("<div>")
            .addClass("notification")
            .attr("data-notification-level", useLevel)
            .text(text)
            .appendTo($(this.containerSelector));
        setTimeout(() => {
            moreElem.remove();
        }, useDelay);
    }

    this.info = (text) => {
        this.basicShow(text, "info");
    }

    this.warning = (text) => {
        this.basicShow(text, "warning");
    }

    this.error = (text) => {
        this.basicShow(text, "error");
    }

}