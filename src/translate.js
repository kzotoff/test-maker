;(function ($) {

    const translation = {
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
            "css-prop-left": "Left",
            "css-prop-top": "Top",
            "css-prop-width": "Width",
            "css-prop-height": "Height",
            "css-prop-color": "Color",
            "css-prop-background-color": "Background color",
            "css-prop-border-color": "Border color",
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
            "css-prop-left": "По горизонтали",
            "css-prop-top": "По вертикали",
            "css-prop-width": "Ширина",
            "css-prop-height": "Высота",
            "css-prop-color": "Цвет текста",
            "css-prop-background-color": "Цвет фона",
            "css-prop-border-color": "Цвет рамки",
        },
    };

    const useTranslation = () => {
        return (
            translation[localStorage.getItem("forceLang")]
            ||
            translation[navigator.language]
            ||
            translation[navigator.language.substr(0, 2)]
            ||
            translation["en"]
            ||
            translation[Object.keys(translation)[0]]
        );
    };

    $(() => {

        const textData = useTranslation();
        $('[data-translation-id]').each((index, elem) => {
            const translatedText = textData[elem.getAttribute('data-translation-id')];
            if (translatedText) {
                elem.innerText = translatedText;
            } else {
                console.warn('no translation for ' + elem.getAttribute('data-translation-id'))
            }
        })
    });

})(jQuery);
