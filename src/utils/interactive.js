/// <reference path="utils.js" />

/**
 * @augments UTIL
 */
var UTIL = (function (me) {
    me.createOptionSelect = function (min, max, path) {
        var input = me.createSpan({
            class: ['option', EMPTY],
            placeholder: "What next?",
            path: path,
            position: min + ".." + max
        });
        input.contentEditable = true;

        return input;
    };

    me.createButtonNew = function (caption, clickHandler) {
        var btnNew = me.createButton({ class: ['btn', 'btn-new'] });
        btnNew.appendChild(me.createSpan({
            class: "btn-new-content",
            html: "<strong>New</strong> " + caption
        }));
        btnNew.tabIndex = -1;

        btnNew.addEventListener('click', clickHandler, false);

        return btnNew;
    };

    me.createButtonAdd = function (clickHandler) {
        var btnAdd = me.createButton({ class: ['btn', 'btn-add'], text: "Add" });
        btnAdd.tabIndex = -1;

        btnAdd.addEventListener('click', clickHandler, false);

        return btnAdd;
    };

    /**
     * Creates a delete button
     * @param {HTMLElement} container 
     * @param {Object} clickHandler 
     */
    me.createButtonDelete = function (container, clickHandler) {
        var btnDelete = me.createButton({ class: ['btn', 'btn-delete'], text: "✖" });

        btnDelete.addEventListener('click', clickHandler);
        btnDelete.addEventListener('mouseenter', function (event) {
            me.addClass(container, "delete");
            // var emptyList = me.getElements('.empty', container);
            // for (let i = 0, len = emptyList.length; i < len; i++) {
            //     let item = emptyList.item(i);
            //     me.hide(item);
            //     me.addClass(item, "ignore");
            // }
            // // hide buttons
            // emptyList = me.getElements('.btn', container);
            // for (let i = 0, len = emptyList.length; i < len; i++) {
            //     let item = emptyList.item(i);
            //     me.hide(item);
            //     me.addClass(item, "ignore");
            // }
        });
        btnDelete.addEventListener('mouseleave', function (event) {
            me.removeClass(container, "delete");
            // var readList = me.getElements('.ignore', container);
            // for (let i = readList.length - 1; i >= 0; i--) {
            //     let item = readList.item(i);
            //     me.show(item);
            //     me.removeClass(item, "ignore");
            // }
        });
        me.addClass(container, "removable");

        return btnDelete;
    };


    return me;
})(UTIL);