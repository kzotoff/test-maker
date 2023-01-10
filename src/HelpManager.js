"use strict";

if (!$) {
    console.warn("Helper: jQuery or Zepto required!");
}

const HelpManager = function() {

    this.helpMode = false;
    this.helpContainer = null;

    this.helpModeOn = () => {
        this.helpMode = true;
        $('html').addClass("helper-on");
    };

    this.helpModeOff = () => {
        this.helpMode = false;
        $('html').removeClass("helper-on");
    };

    this.helpModeToggle = () => {
        if (this.helpMode) {
            this.helpModeOff();
        } else {
            this.helpModeOn();
        }
    };

    // this may be replaced while installing
    this.getHelpContent = (helpId) => {
        "no help available";
    };

    this.showHelp = (event) => {
        if (!this.helpMode) {
            return;
        }

        this.helpContainer = $('<div>')
            .addClass("helper-container")
            .html(this.getHelpContent(event.target.getAttribute("data-help-id")))
            .appendTo($('body'))
        ;
    };

    this.hideHelp = (event) => {
        if (this.helpContainer) {
            this.helpContainer.remove();
         };
    };


    this.install = (getContentFunc) => {
        this.helpModeOff();
        this.getHelpContent = getContentFunc;
        $('body').on('mouseover', '[data-help-id]', this.showHelp);
        $('body').on('mouseout', '[data-help-id]', this.hideHelp);
    };

};