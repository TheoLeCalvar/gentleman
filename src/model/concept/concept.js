import { isString, valOrDefault, hasOwn, isNullOrUndefined, isIterable, isObject, isNullOrWhitespace, toBoolean } from "zenkai";
import { AttributeHandler, ObserverHandler } from "@structure/index.js";


const _Concept = {
    /** Reference to parent model */
    model: null,
    /** Cache of the schema describing the concept */
    schema: null,
    /** Link to the concept data source */
    source: null,
    /** @type {int} */
    id: null,
    /** @type {string} */
    name: null,
    /** @type {string} */
    description: null,
    /** @type {string} */
    alias: null,
    /** @type {*} */
    ref: null,
    /** @type {string[]} */
    actions: null,
    /** @type {string[]} */
    operations: null,
    /** @type {string[]} */
    accept: null,
    /** @type {Concept} */
    parent: null,
    /** @type {int[]} */
    references: null,
    /** Concept value */
    value: null,
    /** Possible values for the concept */
    values: null,
    /** Concept actions configuration */
    action: null,
    /** Concept shadow list */
    shadows: null,
    /** Concept value history list */
    history: null,
    kind: "concept",

    init(args = {}) {
        this.accept = args.accept;
        this.parent = args.parent;
        this.ref = args.ref;
        this.default = valOrDefault(this.schema.default, null);
        this.values = valOrDefault(args.values, valOrDefault(this.schema.values, []));
        this.alias = valOrDefault(args.alias, this.schema.alias);
        this.description = valOrDefault(args.description, this.schema.description);


        this.initObserver();
        this.initAttribute();
        this.initValue(args.value);

        return this;
    },
    initValue() { throw new Error("This function has not been implemented"); },

    /**
     * Gets the reference name (attribute) or initial name
     * @returns {string}
     */
    getName() {
        if (this.ref && this.ref.object === "attribute") {
            return this.ref.name;
        }

        return this.name;
    },
    /**
     * Gets the alias or the name
     * @returns {string}
     */
    getAlias() {
        return valOrDefault(this.alias, this.getName());
    },

    getAcceptedValues() {
        if (!isIterable(this.accept) && isNullOrUndefined(this.accept.name)) {
            return "";
        }

        if (isString(this.accept)) {
            return this.accept;
        }

        if (hasOwn(this.accept, "name")) {
            return this.accept.name;
        }

        if (Array.isArray(this.accept)) {
            return this.accept.map(accept => this.getAcceptedValues.call({ accept: accept })).join(" or ");
        }
    },
    getCandidates() {
        this.values.forEach(value => {
            if (isObject(value)) {
                value.type = "value";
            }
        });

        return this.values;
    },
    getStructure() {
        return [...this.listAttributes()];
    },
    exportValue() {
        return this.getValue();
    },
  
    /**
     * Gets the value of a property
     * @param {string} name 
     */
    getProperty(name, meta) {
        if (name === "refname") {
            return this.ref.name;
        }

        if (name === "name") {
            return this.name;
        }

        if (name === "value") {
            return this.value;
        }

        let propSchema = valOrDefault(this.schema.properties, []);
        let property = propSchema.find(prop => prop.name === name);

        if (isNullOrUndefined(property)) {
            return undefined;
        }

        const { type, value } = property;

        if (type === "string") {
            return StringProperty.call(this, value);
        }

        if (type === "number") {
            return +value;
        }

        if (type === "boolean") {
            return toBoolean(value);
        }

        return value;
    },


    /**
     * Get constraint values
     * @returns {string[]}
     */
    getConstraint(name) {
        if (!this.hasConstraint(name)) {
            return undefined;
        }

        return this.constraint[name];
    },

    /**
     * Verifies if concept has constraint
     * @param {string} name
     * @returns {string[]}
     */
    hasConstraint(name) {
        if (isNullOrUndefined(this.constraint)) {
            return false;
        }

        if (isNullOrUndefined(name)) {
            return true;
        }

        return hasOwn(this.constraint, name);
    },

    /**
     * Returns a value indicating whether the concept has a parent
     * @returns {boolean}
     */
    hasParent() {
        return !this.isRoot();
    },
    /**
     * Gets the concept parent if exist
     * @param {string} [name]
     * @returns {Concept}
     */
    getParent(name) {
        if (this.isRoot()) {
            return null;
        }

        if (isNullOrWhitespace(name)) {
            return this.parent;
        }

        const parent = this.parent;

        if (parent.name === name) {
            return parent;
        }

        return parent.getParent(name);
    },
    /**
     * Gets the concept parent if exist
     * @param {string} [name]
     * @returns {Concept}
     */
    getParentWith(prototype) {
        if (this.isRoot()) {
            return null;
        }

        if (isNullOrWhitespace(prototype)) {
            return this.parent;
        }

        const parent = this.parent;

        if (parent.hasPrototype(prototype)) {
            return parent;
        }

        return parent.getParentWith(prototype);
    },
    hasPrototype(name) {
        if (isNullOrUndefined(this.schema.prototype)) {
            return false;
        }
        
        let prototype = this.model.getConceptSchema(this.schema.prototype);

        while (!isNullOrUndefined(prototype)) {
            if (prototype.name === name) {
                return true;
            }

            prototype = this.model.getConceptSchema(prototype.prototype);
        }

        return false;
    },
    /**
     * Gets the concept ancestor
     * @param {string} [name]
     * @returns {Concept[]}
     */
    getAncestor(name) {
        const parents = [];

        var parent = this.getParent(name);

        while (parent) {
            parents.push(parent);
            parent = parent.getParent(name);
        }

        return parents;
    },
    /**
     * Gets the children of parent
     * @param {string} [name]
     * @returns {Concept}
     */
    getChildren(name) {
        const children = [];

        if (isNullOrUndefined(name)) {
            this.getAttributes().forEach(attr => {
                children.push(attr.target);
            });
        } else {
            this.getAttributes().forEach(attr => {
                if (attr.target.name === name) {
                    children.push(attr.target);
                } else {
                    children.push(...attr.target.getChildren(name));
                }
            });
        }

        return children;
    },
    /**
     * Gets the descendants of a concept
     * @param {string} [name]
     * @returns {Concept}
     */
    getDescendant(name) {
        const descendants = [];

        this.getChildren(name).forEach(children => {
            descendants.push(children);
            descendants.push(...children.getDescendant(name));
        });

        return descendants;
    },

    delete(force = false) {
        if (!force) {
            const { object } = this.ref;

            let result = { success: true };

            if (object === "concept") {
                result = this.getParent().removeValue(this);
            } else if (object === "attribute") {
                result = this.getParent().removeAttribute(this.ref.name);
            }


            if (!result.success) {
                return result;
            }
        }

        this.getChildren().forEach(child => {
            child.delete(true);
        });

        try {
            if (this.model.removeConcept(this.id)) {
                this.notify("delete");
            }
        } catch (error) {
            console.error(this);
            return {
                message: `Concept not found`,
                success: false,
            };
        }

        return {
            message: `The concept '${this.name}' was successfully deleted.`,
            success: true,
        };
    },

    /** @returns {boolean} */
    isRoot() {
        return isNullOrUndefined(this.parent);
    },

    copy(save = true) {
        var copy = {
            name: this.name,
            nature: this.nature,
        };

        var attributes = [];
        this.getAttributes().forEach(attr => {
            attributes.push({
                "name": attr.name,
                "value": attr.copy(false)
            });
        });

        copy.attributes = attributes;

        if (save) {
            this.model.addValue(copy);
        }

        return copy;
    },
    paste(value) {
        this.initValue(value);
    },
    export() {
        var output = {
            id: this.id,
            root: this.isRoot(),
            name: this.name
        };

        var attributes = [];
        this.getAttributes().forEach(attr => {
            attributes.push({
                "name": attr.name,
                "value": attr.export()
            });
        });

        output.attributes = attributes;

        return output;
    },
    toString() {
        var output = {};

        this.attributes.forEach(attr => {
            Object.assign(output, attr.toString());
        });

        return output;
    },
};

function StringProperty(value) {
    if (isString(value)) {
        return value;
    }

    const { type } = value;
    switch (type) {
        case "concat":
            return concatHandler.call(this, value.concat);

        default:
            break;
    }
}


function resolveTerm(term, defValue) {
    const { type } = term;

    if (type === "string") {
        return StringProperty.call(this, term.value);
    }

    if (type === "property") {
        return this.getProperty(term.name);
    }

    if (defValue) {
        return defValue;
    }

    return term;
}

/**
 * Check if two terms are equal
 * @param {*[]} terms 
 */
function concatHandler(terms, separator = "") {
    if (!Array.isArray(terms)) {
        throw new TypeError("Terms need to be an array");
    }

    if (terms.length < 2) {
        return resolveTerm.call(this, terms[0]);
    }

    return terms.map(term => resolveTerm.call(this, term)).join(separator);
}


export const Concept = Object.assign(
    _Concept,
    ObserverHandler,
    AttributeHandler
);


Object.defineProperty(Concept, 'attributeSchema', { get() { return this.schema.attributes; } });
Object.defineProperty(Concept, '_prototype', { get() { return this.schema.prototype; } });