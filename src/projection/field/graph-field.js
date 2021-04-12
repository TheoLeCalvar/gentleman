import {
    createDocFragment, createSpan, createDiv, createI, createListItem,
    createElement,
    createButton, removeChildren, isHTMLElement, valOrDefault,
} from "zenkai";
import { hide, show, shake } from "@utils/index.js";
import { StyleHandler } from "./../style-handler.js";
import { Field } from "./field.js";

const createSVGElement = function(name, attributs = {}) {
    let element = document.createElementNS("http://www.w3.org/2000/svg", name);

    for (const key in attributs) {
        element.setAttribute(key, attributs[key])
    }

    return element;
}

const createParam = function(name, value) {
    return createSVGElement('param',  {
        name: name,
        value: value
    })
}

const BaseGraphField = {
    /** @type {SVGElement} */
    arcs: null,
    /** @type {SVGElement} */
    nodes: null,


    init() {
        this.source.register(this);

        return this;
    },

    update(message, value) {
        switch (message) {
            default:
                console.warn(`The message '${message}' with value '${value}' was not handled for graph field`);
                break;
        }

        this.refresh();
    },

    render() {
        const fragment = createDocFragment();

        const { nodes, arcs } = this.schema;
        //TODO
        console.log(nodes)
        console.log(arcs)
        

        if (!isHTMLElement(this.element)) {
            this.element = createDiv({
                id: this.id,
                class: []
            });

            if (this.readonly) {
                this.element.classList.add("readonly");
            }


            const svgRoot = createSVGElement('svg');
            this.element.appendChild(svgRoot);

            const nodes = createSVGElement('g', {id: 'nodes'});
            svgRoot.appendChild(nodes)
            const arcs = createSVGElement('g', {id: 'arcs'});
            svgRoot.appendChild(arcs)

            const use1 = createSVGElement('use', {
                id: 'node1',
                href: '#node'
            })
            use1.appendChild(createParam('label', 'node1'))
            use1.appendChild(createParam('xinit', 100))
            use1.appendChild(createParam('yinit', 100))
            nodes.appendChild(use1)

            StyleHandler.call(this.projection, this.element, this.schema.style);
        }


        this.source.getValue().forEach((value) => {
            console.log(value);
        });

        if (fragment.hasChildNodes()) {
            this.element.appendChild(fragment);
            this.bindEvents();
        }

        this.refresh();

        return this.element;
    },
    /**
     * Verifies that the field has a changes
     * @returns {boolean}
     */
    hasChanges() {
        return false;
    },
    /**
     * Gets the input value
     * @returns {*[]}
     */
    getValue() {
        return this.list.children;
    },
    /**
     * Verifies that the field has a value
     * @returns {boolean}
     */
    hasValue() {
        return this.items.size > 0;
    },
    clear() {
        this.items.clear();
        removeChildren(this.list);
    },
    focusIn(target) {
        this.focused = true;
        this.element.classList.add("active");
    },
    focusOut(target) {
        if (this.readonly) {
            return;
        }

        if (this.messageElement) {
            hide(this.messageElement);
            removeChildren(this.messageElement);
        }

        this.element.classList.remove("active");

        this.refresh();
        this.focused = false;

        return this;
    },
    refresh() {
        
    },
    createElement() {
        return this.source.createElement();
    },
    getNode(id) {
        return this.items.get(id);
    },
    addNode(value) {
        const item = createGraphFieldItem.call(this, value);

        if (value.index) {
            this.list.children[value.index - 1].after(item);
        } else {
            this.list.appendChild(item);
        }

    },
    removeNode(value) {
        let item = this.getItem(value.id);

        if (!isHTMLElement(item)) {
            throw new Error("List error: Item not found");
        }
    },
    /**
     * Appends an element to the field container
     * @param {HTMLElement} element 
     */
    append(element) {
        if (!isHTMLElement(element)) {
            throw new TypeError("Bad argument: The 'element' argument must be an HTML Element");
        }

        this.element.appendChild(element);

        return this;
    },
    delete(target) {
        if (target === this.element) {
            this.source.remove();

            return;
        }

        const { index } = target.dataset;

        var result = this.source.removeElementAt(+index);

        if (result) {
            this.environment.notify("The element was successfully deleted");
        } else {
            this.environment.notify("This element cannot be deleted");
            shake(target);
        }
    },

    /**
     * Handles the `escape` command
     * @param {HTMLElement} target 
     */
    escapeHandler(target) {
        if (this.messageElement) {
            hide(this.messageElement);

            return true;
        }

        return false;
    },
    /**
     * Handles the `enter` command
     * @param {HTMLElement} target 
     */
    enterHandler(target) {
        return false;
    },
    /**
     * Handles the `backspace` command
     * @param {HTMLElement} target 
     */
    backspaceHandler(target) {
        return false;
    },
    /**
     * Handles the `click` command
     * @param {HTMLElement} target 
     */
    clickHandler(target) {
        return false;
    },
    /**
     * Handles the `arrow` command
     * @param {HTMLElement} target 
     */
    arrowHandler(dir, target) {
        return false;
    },

    bindEvents() {

    }
};


export const GraphField = Object.assign(
    Object.create(Field),
    BaseGraphField
);