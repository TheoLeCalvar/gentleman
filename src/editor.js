/// <reference path="utils/utils.js" />
/// <reference path="utils/interactive.js" />
/// <reference path="autocomplete.js" />
/// <reference path="model/model.js" />
/// <reference path="model/modelElement.js" />
/// <reference path="projection.js" />

var editor = (function ($, _, Autocomplete, _MODEL, PROJ) {
    "use strict";

    const container = $.getElement("[data-gentleman-editor]");

    // State
    const DISABLED = 'disabled';
    const COLLAPSE = 'collapse';

    // Keywords
    const COMPOSITION = 'composition';
    const ABSTRACT = 'abstract';

    // Indicates whether the display is mobile mode
    var MOBILE = $.getWindowWidth() <= 700;

    // Allow responsive design
    var mql = window.matchMedia("(max-width: 800px)");

    const state = {
        create: function () {
            var instance = Object.create(this);

            var past = [];
            var future = [];

            var undo = function () {
                instance.current = past.pop();
                future = [instance.current, ...future];

            };

            var redo = function () {
                const next = future[0];
                const newFuture = future.slice(1);
                past = [...past, instance.current];
                instance.current = next;
                future = newFuture;

            };

            var set = function (val) {
                const present = val;
                if (instance.current === present) {
                    return;
                }
                past = [...past, instance.current];
                instance.current = _.cloneObject(present);
                future = [];
            };

            Object.assign(instance, { undo, redo, set });

            return instance;
        },
        init(val) {
            this.current = val;
        },
        current: undefined,
        hasError: false
    };

    var core = {
        state: state.create(),
        create(model) {
            const KEY_CONFIG = '@config';
            const KEY_RESOURCE = '@resources';
            const KEY_ROOT = '@root';

            var instance = Object.create(this);

            // display language
            if (model[KEY_CONFIG]) {
                let config = model[KEY_CONFIG];
                if (config.language) {
                    $.getElement('#language').innerText = '@' + config.language;
                    instance._language = config.language;
                }
            }

            // get the root element
            var rootFound = false;
            var root = model[KEY_ROOT];
            if (root) {
                instance._concrete = { root: JSON.parse(JSON.stringify(model[root])) };
                rootFound = true;
            }

            // initialize the model
            instance._abstract = _MODEL.create(model, instance._concrete);

            // throw an error if the root was not found.
            if (!rootFound) {
                container.appendChild($.createP({
                    class: 'body',
                    text: "Error - Root not found: The model does not contain an element with the attribute root"
                }));
                instance._hasError = true;
                return;
            }

            // add stylesheets
            if (model[KEY_RESOURCE]) {
                model[KEY_RESOURCE].forEach(function (val) {
                    DOC.head.appendChild($.createLink('stylesheet', val, { class: 'gentleman-css' }));
                });
            }

            instance._current = instance._abstract.createModelElement(instance._concrete.root, true);
            instance._currentLine = $.createDiv({ class: 'body' });
            instance._body = instance._currentLine;
            instance._note = $.createElement('aside', 'note', 'note');
            instance._autocomplete = Autocomplete.create();

            // add the event handlers
            instance.bindEvents();

            instance.save();

            return {
                init: function () { instance.init(); },
                // render: instance.render,
                save: instance.save,
            };
        },
        get abstract() { return this._abstract; }, // abstract (static) model
        get concrete() { return this._concrete; }, // concrete (dynamic) mode
        get language() { return this._language; },
        getProjection(index) { return this.projections[index]; },
        get autocomplete() { return this._autocomplete; }, // autocomplete element
        get projections() { return this.abstract.projections; },
        get options() { return this.abstract.options; },
        get current() { return this._current; }, // current position in model
        set current(val) { this._current = val; },
        get currentLine() { return this._currentLine; }, // current line in representation
        set currentLine(val) { this._currentLine = val; },
        get body() { return this._body; },
        get note() { return this._note; },
        resize() {
            var self = this;

            // TODO: adapt UI to smaller screen
        },
        save() {
            var self = this;
            self.state.set(_.cloneObject(self.concrete));
        },
        init() {
            // check if there are errors and continue otherwise.
            if (this.hasError) return;

            // add currentLine to container
            container.appendChild(this.currentLine);
            // add aside note to container
            container.appendChild(this.note);

            // // draw the editor
            this.render();
        },
        render: function () {
            var self = this;

            self.currentLine.appendChild(self.current.render());
            self.currentLine = self.currentLine.firstChild;
            self.currentLine.contentEditable = false;

            // Get next element
            var next = $.getElement('.attr', self.currentLine) || $.getElement('.option', container);
            var parent = next.parentElement;
            if (parent !== self.currentLine) {
                self.currentLine = parent;
            }

            next.focus();
        },
        bindEvents: function () {
            var self = this;

            var lastKey;
            var flag = false;
            var menu = $.getElement('#menu');
            var btnRead = $.getElement('#btnRead');
            var btnEdit = $.getElement('#btnEdit');
            var btnPrint = $.getElement('#btnPrint');
            var btnUndo = $.getElement('#btnUndo');
            var btnRedo = $.getElement('#btnRedo');
            var btnSave = $.getElement('#btnSave');
            var btnCopy = $.getElement('#btnCopy');
            var currentContainer;
            const MIME_TYPE = 'application/json';

            menu.addEventListener('click', function (event) {
                var target = event.target;

                switch (target) {
                    case btnRead:
                        $.unhighlight(btnEdit);
                        // hide empty attributes
                        var emptyList = $.getElements('.empty', self.body);
                        for (let i = 0, len = emptyList.length; i < len; i++) {
                            let item = emptyList.item(i);
                            $.hide(item);
                            $.addClass(item, "read-mode");
                        }
                        // hide buttons
                        emptyList = $.getElements('.btn', self.body);
                        for (let i = 0, len = emptyList.length; i < len; i++) {
                            let item = emptyList.item(i);
                            $.hide(item);
                            $.addClass(item, "read-mode");
                        }
                        $.highlight(btnRead);

                        break;
                    case btnEdit:
                        $.unhighlight(btnRead);
                        var readList = $.getElements('.read-mode', self.body);
                        for (let i = readList.length - 1; i >= 0; i--) {
                            let item = readList.item(i);
                            $.show(item);
                            $.removeClass(item, "read-mode");
                        }
                        $.highlight(btnEdit);

                        break;
                    case btnPrint:
                        if (btnPrint.dataset.disabled) {
                            return false;
                        }
                        window.URL = window.webkitURL || window.URL;
                        if (!_.isNullOrWhiteSpace(btnPrint.href)) {
                            window.URL.revokeObjectURL(btnPrint.href);
                        }

                        var bb = new Blob([JSON.stringify(self.concrete)], { type: MIME_TYPE });
                        btnPrint.download = 'model_' + self.language + '_' + Date.now() + '.json';
                        btnPrint.href = window.URL.createObjectURL(bb);
                        btnPrint.dataset.downloadurl = [MIME_TYPE, btnPrint.download, btnPrint.href].join(':');

                        btnPrint.dataset.disabled = true;
                        // Need a small delay for the revokeObjectURL to work properly.
                        setTimeout(function () {
                            window.URL.revokeObjectURL(btnPrint.href);
                            btnPrint.dataset.disabled = false;
                        }, 1500);
                        break;
                    case btnCopy:

                        var el = $.createElement('textarea');
                        el.value = self.abstract.toString();
                        el.setAttribute('readonly', '');
                        el.style.position = 'absolute';
                        el.style.left = '-9999px';
                        container.appendChild(el);
                        el.select();
                        DOC.execCommand('copy');
                        el.remove();
                        break;
                    case btnSave:
                        self.save();
                        break;
                    case btnUndo:
                        self.state.undo();
                        self._concrete = self.state.current;
                        self._current = self._abstract.createModelElement(self._concrete.root);
                        $.removeChildren(self._body);
                        self._currentLine = self._body;
                        self.render();
                        break;
                    default:
                        break;
                }
            });

            container.addEventListener('keyup', function (event) {
                var target = event.target;
                var projection = self.getProjection(target.id);

                if (projection && target.textContent === "") {
                    projection.update();
                }

                if (lastKey == event.key) lastKey = -1;
                switch (event.key) {
                    case KEY.spacebar:
                        if (lastKey == KEY.ctrl)
                            self.autocomplete.show();
                        break;
                    case KEY.delete:
                        if (lastKey == KEY.ctrl) {
                            flag = true;
                            projection.delete();
                            flag = false;
                        }
                        break;
                    case "z":
                        if (lastKey == KEY.ctrl) {
                            flag = true;
                            self.state.undo();
                            flag = false;
                        }
                        break;
                    default:
                        break;
                }
            }, false);

            container.addEventListener('keydown', function (event) {
                var target = event.target;
                var parent = target.parentElement;
                var projection = self.getProjection(target.id);

                switch (event.key) {
                    case KEY.backspace:
                        if (self.abstract.isEnum(projection.type)) {
                            projection.value = "";
                        }
                        break;
                    case KEY.ctrl:
                        lastKey = KEY.ctrl;
                        event.preventDefault();
                        break;
                    case KEY.delete:
                        if (self.abstract.isEnum(projection.type)) {
                            projection.value = "";
                            // remove text content only
                            // target.firstChild.nodeValue = "";
                        }
                        break;
                    case KEY.enter:

                        self.autocomplete.hasFocus = false;
                        target.blur(); // remove focus

                        event.preventDefault();
                        break;

                    case KEY.tab:
                        self.autocomplete.hasFocus = false;
                        break;
                    default:
                        break;
                }

                if (event.key.length === 1) {
                    $.removeClass(target, EMPTY);
                    $.removeClass(parent, EMPTY);
                }
            }, false);

            container.addEventListener('focusin', function (event) {
                self.autocomplete.hide();
                $.removeChildren($.getElement('#note'));

                var target = event.target;
                var projection = self.getProjection(target.id);

                currentContainer = findLine(target);
                if (currentContainer) {
                    $.addClass(currentContainer, 'current');
                }

                var data = [];

                if ($.hasClass(target, 'option')) {
                    let path = target.getAttribute('data-path');
                    let position = target.getAttribute('data-position');

                    position = position.split('..');
                    var min = position[0];
                    var max = position[1];

                    self.current = self.abstract.findModelElement(path);

                    data = self.current.options.filter(function (x) {
                        return x.position >= min && x.position <= max;
                    });
                    data = data.map(function (el) { return { val: el.name, element: el }; });

                    self.autocomplete.init(target, data);
                    self.autocomplete.onSelect = function (val) {
                        return autocomplete_option_handler(val, target, data);
                    };
                } else if (projection) {
                    projection.focusIn();
                    update_sidenote(projection);

                    if ($.hasClass(target, 'attr--extension')) {
                        data = projection.valuesKV();
                        self.autocomplete.onSelect = function (attr) {
                            let line = projection.implement(attr.key);
                            $.getElement('.attr', line).focus();
                        };

                        self.autocomplete.init(target, data);
                    }
                    else if (isPointer(projection) || isEnum(projection)) {
                        data = projection.valuesKV();
                        self.autocomplete.onSelect = function (attr) {
                            projection.value = attr.key;
                            projection.focus();
                        };
                        self.autocomplete.init(target, data);
                    } else
                        return;
                }
            }, false);

            container.addEventListener('focusout', function (event) {
                if (flag) {
                    flag = false;
                    return;
                }

                if (self.autocomplete.hasFocus && self.autocomplete.input == target) {
                    return;
                }

                var target = event.target;
                if (currentContainer) $.removeClass(currentContainer, 'current');

                if ($.hasClass(target, 'attr')) {
                    let projection = self.getProjection(target.id);
                    if (projection) {
                        projection.focusOut();
                        projection.update();
                        // self.save();
                    }

                    if (self.autocomplete.hasFocus) {
                        setTimeout(function () { validation_handler(target); }, 100);
                    } else {
                        validation_handler(target);
                    }
                }
            }, false);

            function validation_handler(target) {
                const ERROR = 'error';

                var parent = target.parentElement;
                var projection = self.getProjection(target.id);
                var lblError = $.getElement('#' + target.id + 'error', parent);

                if (projection.validate()) {
                    if (lblError) {
                        lblError.parentElement.className = 'attr-validation-valid';
                        $.removeChildren(lblError);
                        $.hide(lblError);
                    }
                    $.removeClass(target, ERROR);
                } else {
                    if (!lblError) {
                        lblError = $.createSpan({ id: target.id + 'error', class: 'error-marker' });
                        let container = $.createSpan();
                        target.insertAdjacentElement('beforebegin', container);
                        container.appendChild(target);
                        container.appendChild(lblError);
                    }
                    lblError.innerHTML = projection.error;
                    lblError.parentElement.className = 'attr-validation-error';
                    $.addClass(target, ERROR);
                    $.show(lblError);
                }
            }

            function autocomplete_option_handler(val, eHTML, data) {
                var path = eHTML.dataset['path'];
                var parentMElement = self.options[+eHTML.dataset['index']];
                var dir = _.getDir(path);
                var element = _.cloneObject(val.element);
                element.flag = true;

                self.current.push(element);

                // render element
                var mElement = self.abstract.createModelElement(element);
                parentMElement.elements.push(mElement);

                mElement.path = path + '[' + (self.current.length - 1) + ']';
                var line = mElement.render(path + '[' + (self.current.length - 1) + ']');
                Object.assign(line.dataset, { prop: COMPOSITION, position: element.position });

                eHTML.insertAdjacentElement('beforebegin', line);

                // update options
                if (!element.multiple) {
                    eHTML.remove();
                    self.current.options = self.current.options.filter(function (x) {
                        return x.name !== element.name;
                    });
                    // add options
                    data = data.map(function (x) { return x.element; });
                    var left = data.filter(function (x) { return x.position < element.position; });
                    var right = data.filter(function (x) { return x.position > element.position; });

                    if (left.length > 0) {
                        left.sort(function (a, b) { return a.position - b.position; });
                        line.insertAdjacentElement('beforebegin',
                            $.createOptionSelect(left[0].position, left[left.length - 1].position, path));
                    }
                    if (right.length > 0) {
                        right.sort(function (a, b) { return a.position - b.position; });
                        line.insertAdjacentElement('afterend',
                            $.createOptionSelect(right[0].position, right[right.length - 1].position, path));
                    }
                }

                var firstAttribute = $.getElement('.attr', line);
                if (firstAttribute) firstAttribute.focus();
            }

            function getParent(eHTML, className) {
                var parent = eHTML.parentElement;
                return $.hasClass(parent, className) ? parent : parent.parentElement;
            }

            mql.addListener(handleWidthChange);

            function handleWidthChange(mql) {
                self.resize();
            }

            function findParent(keyword) {
                var parent = self.currentLine.parentElement;
                while (parent.parentElement.id != 'container') {
                    if ($.getElement('.keyword', parent).innerHTML == keyword)
                        return parent;
                    parent = parent.parentElement;
                }
                return parent;
            }

            /**
             * Returns the
             * @param {HTMLElement} el 
             * @returns {null|HTMLElement}
             */
            function findLine(el) {
                var parent = el.parentElement;
                if ($.hasClass(parent, 'removable')) return parent;
                if (parent.isSameNode(container)) return null;
                return findLine(parent);
            }

            function update_sidenote(projection) {
                var fragment = $.createDocFragment();
                const NOTE_SECTION = 'note-section';
                const BR = function () {
                    return $.createElement('br');
                };

                var noteTitle = $.createElement('h3', null, ['note-attr', 'font-code']);
                noteTitle.textContent = projection.name;
                fragment.appendChild(noteTitle);
                if (projection.hasError) {
                    let error = $.createP({ class: [NOTE_SECTION, 'note-error'] });
                    error.appendChild($.createSpan({ html: "You seem to have an error on that attribute:<br>" }));
                    error.appendChild($.createSpan({ html: projection.error }));
                    fragment.appendChild(error);
                } else {
                    let error = $.createP({ class: [NOTE_SECTION, 'note-error--valid'] });
                    error.appendChild($.createSpan({ html: "Everything is good here." }));
                    fragment.appendChild(error);
                }

                var info = $.createP({ class: [NOTE_SECTION, 'note-info', 'font-code'] });
                var attrName = $.createSpan({
                    html: "<strong>Type</strong>: " + projection.type + " (" + (projection.isOptional ? 'optional' : 'required') + ")"
                });
                var attrValue = $.createSpan({
                    html: "<strong>Value</strong>: " + (_.isNullOrWhiteSpace(projection.value) ? '&mdash;' : projection.value)
                });

                appendChildren(info, [attrName, BR(), attrValue]);
                fragment.appendChild(info);

                if (projection.type == 'ID') {
                    var dependency = $.createP({ class: [NOTE_SECTION, 'note-dependency'] });
                    let idref = projection.refs;
                    let idrefCount = idref.length;
                    if (idrefCount === 0) {
                        dependency.textContent = "This attribute has no dependency";
                    } else {
                        dependency.textContent = "This attribute " + attrName + " has: " + idrefCount + _.pluralize(idrefCount == 1, "dependency", "y|ies");
                        let ul = $.createUl({ class: 'ref-list' });
                        for (var i = 0; i < idrefCount; i++) {
                            let el = $.getElement('#' + idref[i], container);
                            let li = $.createLi({ class: 'ref-list-item' });
                            let a = $.createAnchor("#" + idref[i], { text: projection.name });
                            li.appendChild(a);
                            ul.appendChild(li);
                        }
                        dependency.appendChild(ul);
                    }

                    fragment.appendChild(dependency);
                }

                self.note.appendChild(fragment);
            }

            /**
             * Returns a value indicating whether the projection is an Enum
             * @param {Object} projection 
             */
            function isEnum(projection) { return PROJ.Enum.isPrototypeOf(projection); }

            /**
             * Returns a value indicating whether the projection is a Pointer
             * @param {Object} projection 
             */
            function isPointer(projection) { return PROJ.Pointer.isPrototypeOf(projection); }
        }
    };

    /**
     * Start the editor
     */
    (function init() {
        var modelTest = {
            "project": {
                "name": "project",
                "attr": {
                    "short_name": { "name": "short_name", "type": "ID" },
                    "name": { "name": "name", "type": "string" }
                },
                "composition": [
                    {
                        "name": "Screening section",
                        "position": 1,
                        "optional": true,
                        "attr": {
                            "screen_action": { "name": "screen_action", "type": "ID", "optional": true },
                            "screening": {
                                "name": "screening", "type": "screening",
                                "multiple": { "type": "array", "min": 1 }
                            }
                        },
                        "representation": {
                            "type": "text",
                            "k1": { "type": "keyword", "val": "SCREENING" },
                            "val": "$k1 #screen_action #screening"
                        }
                    },
                    {
                        "name": "Question/Answer section",
                        "position": 2,
                        "optional": true,
                        "attr": {
                            "qa_action": { "name": "qa_action", "type": "ID", "optional": true },
                            "quality_assess": {
                                "name": "quality_assess", "type": "qa",
                                "multiple": { "type": "array", "min": 0 }
                            }
                        },
                        "representation": {
                            "type": "text",
                            "k1": { "type": "keyword", "val": "QA" },
                            "val": "$k1 #qa_action #quality_assess"
                        }
                    },
                    {
                        "name": "Data extraction section",
                        "position": 3,
                        "attr": {
                            "class_action": { "name": "class_action", "type": "ID", "optional": true },
                            "category": {
                                "name": "category", "type": "category",
                                "multiple": { "type": "array", "min": 1 }, "inline": false
                            }
                        },
                        "representation": {
                            "type": "text",
                            "k1": { "type": "keyword", "val": "DATA EXTRACTION" },
                            "val": "$k1 #class_action #category"
                        }
                    },
                    {
                        "name": "Report section",
                        "keyword": "",
                        "position": 4,
                        "optional": true,
                        "attr": {
                            "reporting": {
                                "name": "reporting", "type": "report",
                                "multiple": { "type": "array" }
                            }
                        },
                        "representation": {
                            "type": "text",
                            "k1": { "type": "keyword", "val": "SYNTHESIS" },
                            "val": "$k1 #reporting"
                        }
                    }
                ],
                "representation": {
                    "type": "text",
                    "k1": { "type": "keyword", "val": "PROJECT" },
                    "val": "$k1 #short_name #name $composition"
                }
            },
            "screening": {
                "name": "screening",
                "composition": [{
                    "name": "reviews",
                    "keyword": "Reviews",
                    "position": 1,
                    "attr": { "review_per_paper": { "name": "review_per_paper", "type": "integer", "val": "2" } },
                    "representation": { "type": "text", "val": "$keyword #review_per_paper" }
                }, {
                    "name": "conflict",
                    "keyword": "Conflict",
                    "position": 2,
                    "attr": {
                        "conflict_type": { "name": "conflict_type", "type": "conflictType" },
                        "conflict_resolution": { "name": "conflict_resolution", "type": "conflictResolution", "val": "unanimity" }
                    },
                    "representation": { "type": "text", "val": "$keyword on #conflict_type resolved by #conflict_resolution" }
                }, {
                    "name": "criteria",
                    "keyword": "Criteria",
                    "position": 3,
                    "attr": {
                        "exclusion_criteria": {
                            "name": "exclusion_criteria", "type": "string",
                            "multiple": { "type": "array", "min": 1 }
                        }
                    },
                    "representation": { "type": "text", "val": "$keyword = [#exclusion_criteria]" }
                }, {
                    "name": "sources",
                    "keyword": "Sources",
                    "position": 4,
                    "optional": true,
                    "attr": {
                        "source_papers": {
                            "name": "source_papers", "type": "string",
                            "multiple": { "type": "array" }
                        }
                    },
                    "representation": { "type": "text", "val": "$keyword = [#source_papers]" }
                }, {
                    "name": "strategies",
                    "keyword": "Strategies",
                    "position": 5,
                    "optional": true,
                    "attr": {
                        "search_strategy": {
                            "name": "search_strategy", "type": "string",
                            "multiple": { "type": "array", "min": 0 }
                        }
                    },
                    "representation": { "type": "text", "val": "$keyword = [#search_strategy]" }
                }, {
                    "name": "validation",
                    "keyword": "Validation",
                    "position": 6,
                    "optional": true,
                    "attr": {
                        "validation_percentage": { "name": "validation_percentage", "type": "integer", "val": "20", "min": 0, "max": 100 },
                        "validation_assignment_mode": { "name": "validation_assignment_mode", "type": "assignmentMode", "val": "normal", "optional": true }
                    },
                    "representation": { "type": "text", "val": "$keyword #validation_percentage% #validation_assignment_mode" }
                }, {
                    "name": "phases",
                    "keyword": "Phases",
                    "position": 7,
                    "optional": true,
                    "attr": {
                        "phases": {
                            "name": "phases", "type": "phase",
                            "multiple": { "type": "array", "min": 0 },
                            "inline": false
                        }
                    },
                    "representation": { "type": "text", "val": "$keyword #phases" }
                }],
                "representation": { "type": "text", "val": "$composition" }
            },
            "phase": {
                "name": "phase",
                "attr": {
                    "title": { "name": "title", "type": "string" },
                    "description": { "name": "description", "type": "string", "optional": true },
                    "fields": {
                        "name": "fields", "type": "field",
                        "multiple": { "type": "array" }
                    }
                },
                "representation": { "type": "text", "val": "#title #description Fields (#fields)" }
            },
            "qa": {
                "name": "qa",
                "composition": [{
                    "name": "questions",
                    "keyword": "Questions",
                    "position": 1,
                    "attr": {
                        "question": {
                            "name": "question", "type": "string",
                            "multiple": { "type": "array", "min": 1 }
                        }
                    },
                    "representation": { "type": "text", "val": "$keyword [#question]" }
                }, {
                    "name": "response",
                    "keyword": "Response",
                    "position": 2,
                    "attr": {
                        "response": {
                            "name": "response", "type": "response",
                            "multiple": { "type": "array", "min": 1 },
                            "inline": true
                        }
                    },
                    "representation": { "type": "text", "val": "$keyword [#response]" }
                }, {
                    "name": "min_score",
                    "keyword": "Min_score",
                    "position": 3,
                    "attr": { "min_score": { "name": "min_score", "type": "double" } },
                    "representation": { "type": "text", "val": "$keyword #min_score" }
                }],
                "representation": { "type": "text", "val": "$composition" }
            },
            "response": {
                "name": "response",
                "attr": {
                    "title": { "name": "title", "type": "string" },
                    "score": { "name": "score", "type": "double" }
                },
                "representation": { "type": "text", "val": "#title:#score" }
            },
            "double": {
                "name": "double",
                "type": "data-type",
                "format": "[0-9]+([.][0-9]+)?"
            },
            "report": {
                "name": "report",
                "attr": {
                    "name": { "name": "name", "type": "ID" },
                    "title": { "name": "title", "type": "string", "optional": true },
                    "value": { "name": "value", "type": "IDREF", "ref": "category" },
                    "chart": {
                        "name": "chart", "type": "graphType",
                        "multiple": { "type": "array" }
                    }
                },
                "abstract": true,
                "extensions": ["simple_graph", "compare_graph"]
            },
            "simple_graph": {
                "name": "simple_graph",
                "keyword": "Simple",
                "base": "report",
                "representation": { "type": "text", "val": "$keyword #name #title on #value charts(#chart)" }
            },
            "compare_graph": {
                "name": "compare_graph",
                "keyword": "Compare",
                "base": "report",
                "attr": { "reference": { "name": "reference", "type": "IDREF", "ref": "category" } },
                "representation": {
                    "type": "text",
                    "val": "$keyword #name #title on #value with #reference charts(#chart)"
                }
            },
            "category": {
                "name": "category",
                "attr": {
                    "name": { "name": "name", "type": "ID" },
                    "title": { "name": "title", "type": "string", "optional": true },
                    "mandatory": { "name": "mandatory", "type": "boolean", "representation": { "val": "*" }, "val": true },
                    "numberOfValues": {
                        "name": "numberOfValues", "type": "integer", "val": "1",
                        "rule": { "greaterThan": -1, "equalTo": -1 },
                        "ruleset": [{ "greaterThan": -1, "equalTo": -1 }],
                        "representation": { "type": "text", "val": "[$val]" }
                    },
                    "subCategory": {
                        "name": "subCategory", "type": "category",
                        "multiple": { "type": "array", "min": 1 },
                        "representation": { "type": "text", "val": "{$val}" }
                    }
                },
                "named_composition": [{ "name": "subCategory", "type": "category", "multiple": true }],
                "abstract": true,
                "extensions": ["freeCategory", "staticCategory", "independantDynamicCategory", "dependantDynamicCategory"]
            },
            "freeCategory": {
                "name": "freeCategory",
                "keyword": "Simple",
                "base": "category",
                "attr": {
                    "type": { "name": "type", "type": "simpleType", "val": "string" },
                    "max_char": {
                        "name": "max_char", "type": "integer", "optional": true,
                        "representation": { "type": "text", "val": "($val)" }
                    },
                    "pattern": {
                        "name": "pattern", "type": "string", "optional": true,
                        "representation": { "type": "text", "val": "style($val)" }
                    },
                    "initial_value": {
                        "name": "initial_value", "type": "string", "optional": true,
                        "representation": { "type": "text", "val": "= [$val]" }
                    }
                },
                "representation": {
                    "type": "text",
                    "val": "$keyword #name #title #mandatory #numberOfValues : #type #max_char #pattern #initial_value #subCategory"
                }
            },
            "staticCategory": {
                "name": "staticCategory",
                "keyword": "List",
                "base": "category",
                "attr": {
                    "values": {
                        "name": "values", "type": "string",
                        "multiple": { "type": "array", "min": 1 }
                    }
                },
                "representation": {
                    "type": "text",
                    "val": "$keyword #name #title #mandatory #numberOfValues = [#values] #subCategory"
                }
            },
            "independantDynamicCategory": {
                "name": "independantDynamicCategory",
                "keyword": "DynamicList",
                "base": "category",
                "attr": {
                    "reference_name": { "name": "reference_name", "type": "string" },
                    "initial_values": {
                        "name": "initial_values", "type": "string",
                        "multiple": { "type": "array", "min": 1 },
                        "representation": { "type": "text", "val": "= [$val]" }
                    }
                },
                "representation": {
                    "type": "text",
                    "val": "$keyword #name #title #mandatory #numberOfValues #reference_name #initial_values #subCategory"
                }
            },
            "dependantDynamicCategory": {
                "name": "dependantDynamicCategory",
                "keyword": "DynamicList",
                "base": "category",
                "attr": { "depends_on": { "name": "depends_on", "type": "IDREF", "ref": "category" } },
                "representation": {
                    "type": "text",
                    "val": "$keyword #name #title #mandatory #numberOfValues depends on #depends_on #subCategory"
                }
            },
            "simpleType": {
                "name": "simpleType",
                "type": "enum",
                "values": {
                    "bool": { "representation": { "type": "text", "val": "bool" } },
                    "date": { "representation": { "type": "text", "val": "date #max" } },
                    "int": { "representation": { "type": "text", "val": "int #max" } },
                    "real": { "representation": { "type": "text", "val": "real #max" } },
                    "string": { "representation": { "type": "text", "val": "string #max" } },
                    "text": { "representation": { "type": "text", "val": "text #max" } }
                }
            },
            "assignmentMode": {
                "name": "assignmentMode",
                "type": "enum",
                "values": {
                    "info": "Info",
                    "normal": "Normal",
                    "veto": "Veto"
                }
            },
            "conflictType": {
                "name": "conflictType",
                "type": "enum",
                "values": {
                    "exclusionCriteria": { "val": "Criteria" },
                    "includeExclude": { "val": "Decision" }
                }
            },
            "conflictResolution": {
                "name": "conflictResolution",
                "type": "enum",
                "values": {
                    "majority": { "val": "majority", "representation": { "type": "text", "val": "$val" } },
                    "unanimity": { "val": "unanimity", "representation": { "type": "text", "val": "$val" } }
                }
            },
            "graphType": {
                "name": "graphType",
                "type": "enum",
                "values": ["bar", "line", "pie"]
            },
            "field": {
                "name": "field",
                "type": "enum",
                "values": ["abstract", "bibtex", "link", "preview", "title"]
            },
            "@root": "project",
            "@config": {
                "language": "ReLiS",
                "settings": {
                    "autosave": true
                }
            },
            "@resources": ["../assets/css/relis.css"]
        };
        var header = $.createElement("header", "header");
        var headerContent = $.createDiv({ class: "content-wrapper" });
        var headerTitle = $.createSpan({ class: 'logo', html: "Gentleman <strong id='language'></strong>" });

        var lblSelector = $.createLabel({ class: 'lblSelector', text: "Load a Metamodel" });
        var inputSelector = $.createFileInput({ id: 'fileInput', accept: '.json' });
        inputSelector.addEventListener('change', function (e) {
            var file = this.files[0];
            var reader = new FileReader();
            if (file.name.endsWith('.json')) {
                reader.onload = function (e) {
                    // empty container
                    clear();
                    var editor = core.create(JSON.parse(reader.result));
                    editor.init();
                };
                reader.readAsText(file);
            } else {
                alert("File not supported!");
            }
        });
        lblSelector.appendChild(inputSelector);


        var lblOpenModel = $.createLabel({ class: 'load-model', text: "Open a Model" });
        var modelSelector = $.createFileInput({ id: 'fileInput', accept: '.json' });
        modelSelector.addEventListener('change', function (e) {
            var file = this.files[0];
            var reader = new FileReader();
            if (file.name.endsWith('.json')) {
                reader.onload = function (e) {
                    // empty container
                    clear();
                    var editor = core.create(JSON.parse(reader.result));
                    editor.init();
                };
                reader.readAsText(file);
            } else {
                alert("File not supported!");
            }
        });
        lblOpenModel.appendChild(modelSelector);

        var exportContainer = $.createDiv({ class: 'export-container' });
        var output = $.createElement('output');
        appendChildren(exportContainer, [output]);

        var menu = $.createUl({ id: "menu", class: "bare-list menu" });

        appendChildren(menu, [
            createMenuItem($.createAnchor(null, { id: 'btnPrint', class: "btn btn-menu", text: "Download" })),
            createMenuItem([
                $.createButton({ id: "btnEdit", name: "btnEdit", class: "btn btn-menu selected", text: "Edit" }),
                $.createButton({ id: "btnRead", name: "btnRead", class: "btn btn-menu", text: "Read" })
            ]),
            createMenuItem($.createButton({ id: "btnUndo", name: "btnUndo", class: "btn btn-menu", text: "Undo" })),
            createMenuItem($.createButton({ id: "btnRedo", name: "btnRedo", class: "btn btn-menu", text: "Redo" })),
            createMenuItem($.createButton({ id: "btnSave", name: "btnSave", class: "btn btn-menu", text: "Save" })),
            createMenuItem($.createButton({ id: "btnCopy", name: "btnCopy", class: "btn btn-menu", text: "Copy" }))
        ]);

        appendChildren(headerContent, [headerTitle, lblSelector, lblOpenModel, menu]);
        header.appendChild(headerContent);
        container.appendChild(header);

        if (modelTest) {
            var editor = core.create(JSON.parse(JSON.stringify(modelTest)));
            editor.init();
        }
    })();

    /**
     * Creates a menu item
     * @param {HTMLElement} el 
     * @returns {HTMLLIElement} menu item
     */
    function createMenuItem(el, attr) {
        attr = _.valOrDefault(attr, { class: 'menu-item' });
        var item = $.createLi(attr);
        if (Array.isArray(el)) {
            appendChildren(item, el);
        }
        else if (el) {
            item.appendChild(el);
        }
        return item;
    }

    /**
     * Append a list of elements to a node.
     * @param {HTMLElement} parent
     * @param {HTMLElement[]} children
     */
    function appendChildren(parent, children) {
        var fragment = $.createDocFragment();
        children.forEach(element => {
            fragment.appendChild(element);
        });
        parent.appendChild(fragment);
        fragment = null;
        return parent;
    }

    /**
     * This functions clears the container.
     * It removes all contents and stylesheets applied by previous models.
     */
    function clear() {
        // clear body section
        var body = $.getElement('.body', container);
        if (body) {
            $.removeChildren(body);
            body.remove();
        }
        // clear aside section
        var aside = $.getElement('#note', container);
        if (aside) {
            $.removeChildren(aside);
            aside.remove();
        }
        // remove stylesheets
        var links = $.getElements('.gentleman-css');
        for (let i = 0, len = links.length; i < len; i++) {
            links.item(i).remove();
        }
    }

    return core;
})(UTIL, HELPER, Autocomplete, MetaModel, Projection);