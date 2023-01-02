"use strict";

const Translator = function() {

    this.translations = {
        "en": {
            "presentation-block-header": "Presentation",
            "media-block-header": "Media",
            "add-sound": "Add sound",
            "add-image": "Add image",
            "pages-block-header": "Pages",
            "elements-block-header": "Elements",
            "content-block-header": "Content",
            "content-text": "Text",
            "content-sound": "Sound",
            "content-image": "Image",
            "design-block-header": "Design",
            "style-draggable": "Draggable",
            "style-font-bold": "Bold",
            "css-prop-left": "Left",
            "css-prop-top": "Top",
            "css-prop-width": "Width",
            "css-prop-height": "Height",
            "css-prop-border-radius": "Corners radius",
            "css-prop-color": "Color",
            "css-prop-font-size": "Font size",
            "css-prop-background-color": "Background color",
            "css-prop-border-color": "Border color",
            "files-uploaded-ok": "Files uploaded successfully",
            "import-ok": "import successful",
        },

        "ru": {
            "presentation-block-header": "Файл",
            "media-block-header": "Изображения и звуки",
            "add-sound": "Добавить звук",
            "add-image": "Добавить изображение",
            "pages-block-header": "Слайды",
            "elements-block-header": "Элементы",
            "content-block-header": "Содержимое элемента",
            "content-text": "Текст",
            "content-sound": "Звук",
            "content-image": "Изображение",
            "design-block-header": "Стиль",
            "style-draggable": "Можно двигать",
            "style-font-bold": "Жирный",
            "css-prop-left": "По горизонтали",
            "css-prop-top": "По вертикали",
            "css-prop-width": "Ширина",
            "css-prop-height": "Высота",
            "css-prop-border-radius": "Скругление углов",
            "css-prop-color": "Цвет текста",
            "css-prop-font-size": "Размер текста",
            "css-prop-background-color": "Цвет фона",
            "css-prop-border-color": "Цвет рамки",
            "files-uploaded-ok": "Файлы загружены",
            "import-ok": "Презантация загружена",
        },
    };

    this.getLangPack = (forceLang) => {
        return (
            this.translations[forceLang]
            ||
            this.translations[navigator.language]
            ||
            this.translations[navigator.language.substr(0, 2)]
            ||
            this.translations[Object.keys(this.translations)[0]]
        );
    };

    this.forCode = (code) => {
        return (
            this.activeLangpack[code]
            ||
            this.translations[Object.keys(this.translations)[0]][code]
        );
    };

    this.activeLangpack = this.getLangPack(localStorage.getItem("forceLang"));
    console.log(`translator ready. set localStorage:forceLang to override. locales supported: ${Object.keys(this.translations).join(',')}`);

    this.applyAuto = () => {
        document.querySelectorAll('[data-translation-id]').forEach((elem) => {
            const code = elem.getAttribute('data-translation-id');
            const translatedText = this.forCode(code);
            if (translatedText) {
                elem.innerText = translatedText;
            } else {
                console.warn('no translation for ' + elem.getAttribute('data-translation-id'))
            }
        });
    };

}