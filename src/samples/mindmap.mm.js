export const METAMODEL_MINDMAP = {
    "mindmap": {
        "attribute": {
            "title": { "type": "string" },
            "short_description": { "type": "string", "required": false }
        },
        "component": [
            {
                "name": "central_topic",
                "attribute": {
                    "id": { "type": "string" },
                    "topic": { "type": "central_topic" }
                },
                "projection": [
                    {
                        "type": "text",
                        "layout": "Subject of discussion: #id #topic"
                    }
                ],
            }
        ],
        "projection": [
            {
                "type": "text",
                "layout": "Mind map #title #short_description #[central_topic]"
            }
        ]
    },
    "topic": {
        "abstract": true,
        "attribute": {
            "name": { "type": "string" },
            "details": {
                "type": "string", "projection": {
                    type: "text",
                    field: { type: 'field', view: 'textarea' },
                    layout: '$field'
                }
            },
            "related": { "name": "related", "type": "number" },
            "marker": { "name": "marker", "type": "string", "optional": true },
        }
    },
    "central_topic": {
        "base": "topic",
        "component": [
            {
                "name": "main_topics",
                "attribute": {
                    "topics": {
                        "type": "set",
                        "accept": "main_topic",
                        "min": 1,
                        "action": {
                            "add": {
                                "text": "Add a main topic"
                            }
                        }
                    }
                },
                "projection": [
                    {
                        "type": "text",
                        "layout": "List of central topics: #topics",
                        "style": {
                            "topics": {
                                "inline": false,
                                "spacing": { "before": "2px", "after": "2px" }
                            },
                        }
                    },
                    {
                        "type": "text",
                        "layout": "Central topics: #topics",
                        "style": {
                            "topics": {
                                "inline": false,
                                "spacing": { "before": "5px", "after": "5px" }
                            },
                        }
                    }
                ],
            }
        ],
        "projection": [
            {
                "type": "text",
                "layout": "#name #[main_topics]"
            }
        ]
    },
    "main_topic": {
        "base": "topic",
        "component": [
            {
                "name": "sub_topics",
                "attribute": {
                    "topics": { "type": "set", "accept": "sub_topic", "min": 5, }
                },
                "projection": [
                    {
                        "type": "text",
                        "layout": "List of sub topics: #topics",
                        "style": {
                            "topics": {
                                "inline": false,
                                "spacing": { "before": "2px", "after": "2px" }
                            },
                        }
                    }
                ],
            }
        ],
        "projection": [
            {
                "type": "text",
                "label": { "type": "text", "val": "Main topic" },
                "layout": "$label #name #details #[sub_topics]"
            }
        ]
    },
    "sub_topic": {
        "base": "topic",
        "component": [
            {
                "name": "sub_topics",
                "attribute": {
                    "topics": { "type": "set", "accept": "sub_topic" }
                },
                "projection": [
                    {
                        "type": "text",
                        "layout": "#topics"
                    }
                ],
            }
        ],
        "projection": [
            {
                "type": "text",
                "layout": "#name"
            }
        ]
    },
    "@root": "mindmap",
    "@config": {
        "language": "MindMap",
        "settings": {
            "autosave": true
        },
        "style": {
            "attribute": {
                "inline": true,
                "spacing": { "before": "2px", "after": "2px" }
            },
            "component": {
                "inline": false,
                "size": { "width": "FIT_CONTENT", },
                "spacing": { "before": "5px", "after": "5px" },
                "corner": {},
                "background": "#f0f0f0",
            },
        }
    },
};