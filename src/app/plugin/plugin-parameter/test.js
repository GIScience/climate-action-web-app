export const testSchema = {
    "$defs": {
        "Feature_MultiPolygon_Union_Dict__NoneType__": {
            "properties": {
                "bbox": {
                    "anyOf": [
                        {
                            "maxItems": 4,
                            "minItems": 4,
                            "prefixItems": [
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                }
                            ],
                            "type": "array"
                        },
                        {
                            "maxItems": 6,
                            "minItems": 6,
                            "prefixItems": [
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                }
                            ],
                            "type": "array"
                        },
                        {
                            "type": "null"
                        }
                    ],
                    "default": null,
                    "title": "Bbox"
                },
                "type": {
                    "const": "Feature",
                    "title": "Type"
                },
                "geometry": {
                    "anyOf": [
                        {
                            "$ref": "#/$defs/MultiPolygon"
                        },
                        {
                            "type": "null"
                        }
                    ]
                },
                "properties": {
                    "anyOf": [
                        {
                            "type": "object"
                        },
                        {
                            "type": "null"
                        }
                    ],
                    "title": "Properties"
                },
                "id": {
                    "anyOf": [
                        {
                            "type": "integer"
                        },
                        {
                            "type": "string"
                        },
                        {
                            "type": "null"
                        }
                    ],
                    "default": null,
                    "title": "Id"
                }
            },
            "required": [
                "type",
                "geometry",
                "properties"
            ],
            "title": "Feature[MultiPolygon, Union[Dict, NoneType]]",
            "type": "object"
        },
        "MultiPolygon": {
            "description": "MultiPolygon Model",
            "properties": {
                "bbox": {
                    "anyOf": [
                        {
                            "maxItems": 4,
                            "minItems": 4,
                            "prefixItems": [
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                }
                            ],
                            "type": "array"
                        },
                        {
                            "maxItems": 6,
                            "minItems": 6,
                            "prefixItems": [
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                },
                                {
                                    "type": "number"
                                }
                            ],
                            "type": "array"
                        },
                        {
                            "type": "null"
                        }
                    ],
                    "default": null,
                    "title": "Bbox"
                },
                "type": {
                    "const": "MultiPolygon",
                    "title": "Type"
                },
                "coordinates": {
                    "items": {
                        "items": {
                            "items": {
                                "anyOf": [
                                    {
                                        "maxItems": 2,
                                        "minItems": 2,
                                        "prefixItems": [
                                            {
                                                "type": "number"
                                            },
                                            {
                                                "type": "number"
                                            }
                                        ],
                                        "type": "array"
                                    },
                                    {
                                        "maxItems": 3,
                                        "minItems": 3,
                                        "prefixItems": [
                                            {
                                                "type": "number"
                                            },
                                            {
                                                "type": "number"
                                            },
                                            {
                                                "type": "number"
                                            }
                                        ],
                                        "type": "array"
                                    }
                                ]
                            },
                            "minItems": 4,
                            "type": "array"
                        },
                        "type": "array"
                    },
                    "title": "Coordinates",
                    "type": "array"
                }
            },
            "required": [
                "type",
                "coordinates"
            ],
            "title": "MultiPolygon",
            "type": "object"
        },
        "Option": {
            "enum": [
                "Option 1",
                "Option 2"
            ],
            "title": "Option",
            "type": "string"
        }
    },
    "properties": {
        "blueprint_bool": {
            "description": "A required boolean parameter.",
            "examples": [
                true
            ],
            "title": "Boolean Input",
            "type": "boolean"
        },
        "blueprint_int": {
            "anyOf": [
                {
                    "exclusiveMaximum": 100,
                    "exclusiveMinimum": 0,
                    "type": "integer"
                },
                {
                    "type": "null"
                }
            ],
            "default": 3,
            "description": "An optional integer parameter.",
            "examples": [
                3
            ],
            "title": "Integer Input"
        },
        "blueprint_float": {
            "anyOf": [
                {
                    "exclusiveMaximum": 4,
                    "exclusiveMinimum": 0.5,
                    "type": "number"
                },
                {
                    "type": "null"
                }
            ],
            "default": 2.1,
            "description": "An optional floating point parameter.",
            "examples": [
                2.1
            ],
            "title": "Float Input"
        },
        "blueprint_string": {
            "anyOf": [
                {
                    "type": "string"
                },
                {
                    "type": "null"
                }
            ],
            "default": "John Doe",
            "description": "An optional string parameter.",
            "examples": [
                "John Doe"
            ],
            "title": "String Input"
        },
        "blueprint_date": {
            "anyOf": [
                {
                    "format": "date",
                    "type": "string"
                },
                {
                    "type": "null"
                }
            ],
            "default": "2020-01-01",
            "description": "An optional date parameter.",
            "examples": [
                "2020-01-01"
            ],
            "title": "Date Input"
        },
        "blueprint_select": {
            "anyOf": [
                {
                    "$ref": "#/$defs/Option"
                },
                {
                    "type": "null"
                }
            ],
            // "default": "Option 2",
            "description": "An optional selection parameter. The user can choose one of the available options.",
            // "examples": [
            //     "Option 2"
            // ],
            "title": "Selection Input"
        },
        "blueprint_select1": {
            "anyOf": [
                {
                    "type": "number",
                    "uniqueItems": true,
                    "enum": [1, 2, 3]
                },
                {
                    "type": "null"
                }
            ],
            "description": "An optional selection parameter. The user can choose one of the available options.",
            "title": "Selection Input1"
        },
        "blueprint_select_multi": {
            "anyOf": [
                {
                    "items": {
                        "$ref": "#/$defs/Option"
                    },
                    "type": "array"
                },
                {
                    "type": "null"
                }
            ],
            "default": [
                "Option 2"
            ],
            "description": "An optional selection parameter. The user can choose multiple of the available options.",
            "examples": [
                [
                    "Option 2"
                ]
            ],
            "title": "Multi-Selection Input"
        },
        "blueprint_aoi": {
            "allOf": [
                {
                    "$ref": "#/$defs/Feature_MultiPolygon_Union_Dict__NoneType__"
                }
            ],
            "description": "A required area of interest parameter.",
            "examples": [
                {
                    "geometry": {
                        "coordinates": [
                            [
                                [
                                    [
                                        12.3,
                                        48.22
                                    ],
                                    [
                                        12.3,
                                        48.34
                                    ],
                                    [
                                        12.48,
                                        48.34
                                    ],
                                    [
                                        12.48,
                                        48.22
                                    ],
                                    [
                                        12.3,
                                        48.22
                                    ]
                                ]
                            ]
                        ],
                        "type": "MultiPolygon"
                    },
                    "properties": {},
                    "type": "Feature"
                }
            ],
            "title": "Area of Interest Input"
        }
    },
    "required":
        [
            "blueprint_bool",
            "blueprint_aoi"
        ],
    "title": "BlueprintComputeInput",
    "type": "object"
}
