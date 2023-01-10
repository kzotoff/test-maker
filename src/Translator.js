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
            "import-ok": "Import successful",
            "page-properties-block-header": "Page properties",
            "page-background-image": "Background image",
            "media-empty-confirmation": "Delete all media files?",
            "media-storage-cleared": "Media storage cleared",
            "new-element-text": "Hello, world!",
            "reset-confirmation": "Everything will be cleared. Are you sure?",
            "start-menu-new": "Create",
            "start-menu-continue": "Continue edit",
            "start-menu-open": "Open",
            "behavior-block-header": "Behavior",
            "behavior-id": "ID",
            "behavior-draggable": "Draggable",
            "behavior-drag-target": "Drag target for",
            "behavior-arrow-start": "Can start arrow",
            "behavior-arrow-end": "Arrow end for",
            "this-id-is-already-used": "This ID is already used, try another one",

            "-h-button-reset": "Reset presentation and start over. All slides will be deleted, while media library content will remain.",
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
            "import-ok": "Презентация загружена",
            "page-properties-block-header": "Параметры слайда",
            "page-background-image": "Фоновое изображение",
            "media-empty-confirmation": "Удалить звуки и изображения?",
            "media-storage-cleared": "Хранилище файлов очищено",
            "new-element-text": "Привет!",
            "reset-confirmation": "Всё содержимое будет удалено. Продолжить?",
            "start-menu-new": "Создать",
            "start-menu-continue": "Продолжить",
            "start-menu-open": "Открыть",
            "behavior-block-header": "Поведение",
            "behavior-id": "Код",
            "behavior-draggable": "Можно двигать",
            "behavior-drag-target": "Цель для кодов",
            "behavior-arrow-start": "Начало стрелки",
            "behavior-arrow-end": "Окончание стрелки для кодов",
            "this-id-is-already-used": "Этот код занят, используйте другой",

            "-h-button-reset": "Очистить презентацию и начать заново. Изображения и звуки останутся.",
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
