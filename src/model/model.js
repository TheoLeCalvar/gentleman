import { hasOwn, isNullOrUndefined } from "zenkai";
import { UUID } from "@utils/index.js";
import { MetaModel } from './metamodel.js';
import { ConceptFactory } from "./concept/factory.js";

export const Model = {
    /** 
     * Creates a `Model` instance.
     * @param {MetaModel} metamodel
     * @returns {Model}
     */
    create(metamodel) {
        const instance = Object.create(this);

        instance.metamodel = metamodel;
        instance.concepts = [];

        return instance;
    },
    schema: null,
    metamodel: null,
    root: null,
    editor: null,
    /**
     * @type {Concept[]}
     */
    concepts: null,

    /**
     * Initialize the model.
     * @param {Object} model 
     * @param {Editor} editor 
     * @param {Object} args 
     */
    init(model, editor) {
        this.schema = initSchema(this.metamodel);
        this.root = ConceptFactory.createConcept(this, this.schema.root['name'], this.schema.root, { value: model });
        this.concepts.push(this.root);

        if (editor) {
            this.editor = editor;
        }

        return this;
    },
    /**
     * Creates and returns a model element
     * @param {string} name
     * @returns {Concept}
     */
    createConcept(name, args) {
        const schema = this.metamodel.getCompleteModelConcept(name);

        var concept = ConceptFactory.createConcept(this, name, schema, args);
        this.concepts.push(concept);

        return concept;
    },
    generateId() {
        return UUID.generate();
    },
    render() {
        return this.root.render();
    },
    export() {
        return JSON.stringify(this.root.toString());
    },
    toString() {
        return JSON.stringify({
            [this.root.name]: this.root.toString()
        });
    },
    project() {
        return this.root.project();
    }
};


function initSchema(metamodel) {
    const schema = { "root": metamodel.getCompleteModelConcept(metamodel.root) };

    if (!hasOwn(schema.root, 'name')) {
        schema.root['name'] = metamodel.root;
    }

    return schema;
}