"use strict";

if (!$) {
    console.warn("Helper: jQuery or Zepto required!");
}

const HelpManager = function() {

    this.contents = {
        "1": "Reset presentation and start over. All slides will be deleted, while media library content will remain.",
    };

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

    this.getHelpContent = (element) => {
        const helpCode = $(element).attr("data-help-id");
        return this.contents[helpCode] || "no content :-(";
    };

    this.showHelp = (event) => {
        if (!this.helpMode) {
            return;
        }

        this.helpContainer = $('<div>')
            .addClass("helper-container")
            .html(this.getHelpContent(event.target))
            .appendTo($('body'))
            ;
    };

    this.hideHelp = (event) => {
        if (this.helpContainer) {
            this.helpContainer.remove();
         };
    };


    this.install = () => {
        this.helpModeOff();
        $('body').on('mouseover', '[data-help-id]', this.showHelp);
        $('body').on('mouseout', '[data-help-id]', this.hideHelp);
    };

};