import { cypressEnvironment } from './cypress-environment'

export const mockPluginsList = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/plugin?lang=en`, {
        body: [
            {
                name: 'Plugin Blueprint',
                authors: [
                    {
                        name: 'Max Mustermann',
                        affiliation: 'XYZ gGmbH',
                        website: 'https://example.com/'
                    },
                    {
                        name: 'Erika Mustermann',
                        affiliation: 'Consultant at XYZ gGmbH',
                        website: 'https://example.com/'
                    }
                ],
                version: '0.0.1',
                concerns: [],
                purpose: '',
                methodology: '',
                sources: [
                    {
                        pages: '14-15',
                        volume: '2',
                        journal: 'J. Geophys. Res.',
                        year: '1954',
                        title: 'Nothing Particular',
                        author: 'J. G. Smith and H. K. Weston',
                        ENTRYTYPE: 'article',
                        ID: 'smit54'
                    }
                ],
                assets: {
                    icon: 'assets/plugin_blueprint/0.0.1/ICON.jpeg'
                },
                id: 'plugin_blueprint',
                library_version: '5.1.0',
                online: true
            },
            {
                name: 'hiWalk',
                authors: [
                    {
                        name: 'Max Mustermann',
                        affiliation: 'XYZ gGmbH',
                        website: 'https://example.com/'
                    },
                    {
                        name: 'Erika Mustermann',
                        affiliation: 'Consultant at XYZ gGmbH',
                        website: 'https://example.com/'
                    }
                ],
                version: '1.0.0',
                state: 'active',
                concerns: ['pedestrian'],
                teaser: null,
                purpose:
                    "The Walkability module provides a collection of indicators related to a number of different aspects that determine the perceived quality (safety, comfort, practicality) of walking along a given street or within a given area of interest. In the future, the module will combine the different indicators into a general walkability index.\n\nCurrently available are:\n\n* A categorisation of walkable paths based on which other road users share the path with pedestrians (such as bicycles and motorised traffic).\n* A grading of the paths' surface quality based on its reported smoothness or surface type.\n* A connectivity measure based on the reachability of other paths within a defined area of interest.\n",
                methodology:
                    'The indicators are based on the [OpenStreetMap (OSM)](https://www.openstreetmap.org/about) database.\nOSM is a free and open geo-database often called the "Wikipedia of maps".\nIt is a feature-rich collection of e.g. streets and paths maintained by voluntary contributors.\n\nDetailed explanations on the methods can be found in the description of each indicator.',
                sources: [],
                assets: {
                    icon: 'assets/walkability/1.0.0/ICON.jpeg'
                },
                id: 'hiwalk',
                operator_schema: {
                    $defs: {
                        NaturalnessIndex: {
                            enum: ['NDVI', 'WATER', 'NATURALNESS'],
                            title: 'NaturalnessIndex',
                            type: 'string'
                        },
                        WalkabilityIndicators: {
                            enum: ['Slope', 'Naturalness', 'Detour Factor'],
                            title: 'WalkabilityIndicators',
                            type: 'string'
                        }
                    },
                    properties: {
                        indicators_to_compute: {
                            default: [],
                            description:
                                'Computing these indicators for large areas may exceed the time limit for individual assessments in the Climate Action Navigator.',
                            examples: [],
                            items: {
                                $ref: '#/$defs/WalkabilityIndicators'
                            },
                            title: 'Optional indicators',
                            type: 'array',
                            uniqueItems: true
                        },
                        naturalness_index: {
                            allOf: [
                                {
                                    $ref: '#/$defs/NaturalnessIndex'
                                }
                            ],
                            default: 'NDVI',
                            description:
                                'Choose NDVI to include only vegetation greenness, WATER to include only water bodies, and NATURALNESS to include both.',
                            examples: ['NDVI'],
                            title: 'What to include in naturalness calculation?'
                        }
                    },
                    title: 'ComputeInputWalkability',
                    type: 'object'
                },
                library_version: '6.0.2',
                online: true
            }
        ]
    }).as('getPlugins')
}

export const mockPluginsListWithoutBlueprint = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/plugin?lang=en`, {
        body: [
            {
                name: 'hiWalk',
                authors: [
                    {
                        name: 'Max Mustermann',
                        affiliation: 'XYZ gGmbH',
                        website: 'https://example.com/'
                    },
                    {
                        name: 'Erika Mustermann',
                        affiliation: 'Consultant at XYZ gGmbH',
                        website: 'https://example.com/'
                    }
                ],
                version: '1.0.0',
                concerns: ['pedestrian'],
                purpose:
                    "The Walkability module provides a collection of indicators related to a number of different aspects that determine the perceived quality (safety, comfort, practicality) of walking along a given street or within a given area of interest. In the future, the module will combine the different indicators into a general walkability index.\n\nCurrently available are:\n\n* A categorisation of walkable paths based on which other road users share the path with pedestrians (such as bicycles and motorised traffic).\n* A grading of the paths' surface quality based on its reported smoothness or surface type.\n* A connectivity measure based on the reachability of other paths within a defined area of interest.\n",
                methodology:
                    'The indicators are based on the [OpenStreetMap (OSM)](https://www.openstreetmap.org/about) database.\nOSM is a free and open geo-database often called the "Wikipedia of maps".\nIt is a feature-rich collection of e.g. streets and paths maintained by voluntary contributors.\n\nDetailed explanations on the methods can be found in the description of each indicator.',
                sources: [],
                assets: {
                    icon: 'assets/hiwalk/1.0.0/ICON.jpeg'
                },
                id: 'hiwalk',
                operator_schema: {
                    $defs: {
                        IDW: {
                            enum: [
                                'Polynomial decay related to retail and park amenities according to Frank et al 2021',
                                'Step function reflecting statistical findings on walking path distance according to Xia et al 2018',
                                'No distance weighting'
                            ],
                            title: 'IDW',
                            type: 'string'
                        },
                        PathRating: {
                            properties: {
                                designated: {
                                    default: 1.0,
                                    description:
                                        'Qualitative (between 0..1) rating of paths designated for exclusive pedestrian use.',
                                    examples: [1.0],
                                    maximum: 1.0,
                                    minimum: 0.0,
                                    title: 'Designated Path Rating',
                                    type: 'number'
                                },
                                designated_shared_with_bikes: {
                                    default: 0.8,
                                    description: 'Qualitative (between 0..1) rating of paths shared with bikes.',
                                    examples: [0.8],
                                    maximum: 1.0,
                                    minimum: 0.0,
                                    title: 'Designated Shared with Bikes Path Rating',
                                    type: 'number'
                                },
                                shared_with_motorized_traffic_low_speed: {
                                    default: 0.6,
                                    description:
                                        'Qualitative rating (between 0..1) of streets without a sidewalk, with low speed limits, such as living streets or service ways.',
                                    examples: [0.6],
                                    maximum: 1.0,
                                    minimum: 0.0,
                                    title: 'Shared with motorized traffic low speed Path Rating',
                                    type: 'number'
                                },
                                shared_with_motorized_traffic_medium_speed: {
                                    default: 0.4,
                                    description:
                                        'Qualitative rating (between 0..1) of streets without a sidewalk, with medium speed limits up to 30 km/h',
                                    examples: [0.4],
                                    maximum: 1.0,
                                    minimum: 0.0,
                                    title: 'Shared with motorized traffic medium speed Path Rating',
                                    type: 'number'
                                },
                                shared_with_motorized_traffic_high_speed: {
                                    default: 0.2,
                                    description:
                                        'Qualitative rating (between 0..1) of streets without a sidewalk, with higher speed limits up to 50 km/h',
                                    examples: [0.2],
                                    maximum: 1.0,
                                    minimum: 0.0,
                                    title: 'Shared with motorized traffic high speed Path Rating',
                                    type: 'number'
                                },
                                not_walkable: {
                                    default: 0.0,
                                    description: 'Qualitative rating (between 0..1) of paths that are not walkable.',
                                    examples: [0.0],
                                    maximum: 1.0,
                                    minimum: 0.0,
                                    title: 'Not Walkable Path Rating',
                                    type: 'number'
                                },
                                unknown: {
                                    default: -9999,
                                    description:
                                        'Qualitative (between 0..1) rating of paths that are in principle walkable but cannot be fit in one of the other categories (default -9999, which is out of scale)',
                                    examples: [0.0],
                                    maximum: 1.0,
                                    minimum: 0.0,
                                    title: 'Unknown Path Rating',
                                    type: 'number'
                                }
                            },
                            title: 'PathRating',
                            type: 'object'
                        },
                        WalkingSpeed: {
                            enum: ['slow', 'medium', 'fast'],
                            title: 'WalkingSpeed',
                            type: 'string'
                        }
                    },
                    properties: {
                        walkable_time: {
                            anyOf: [
                                {
                                    minimum: 0.0,
                                    type: 'number'
                                },
                                {
                                    type: 'null'
                                }
                            ],
                            default: 15,
                            description: 'Maximum duration of a single trip in minutes.',
                            examples: [15],
                            title: 'Maximum Trip Duration'
                        },
                        walking_speed: {
                            anyOf: [
                                {
                                    $ref: '#/$defs/WalkingSpeed'
                                },
                                {
                                    type: 'null'
                                }
                            ],
                            default: 'medium',
                            description:
                                "Choose a walking speed category. The categories map to the following speed in km/h: {'slow': 2, 'medium': 4, 'fast': 6}",
                            examples: ['medium'],
                            title: 'Walking Speed'
                        },
                        path_rating: {
                            anyOf: [
                                {
                                    $ref: '#/$defs/PathRating'
                                },
                                {
                                    type: 'null'
                                }
                            ],
                            default: {
                                designated: 1.0,
                                designated_shared_with_bikes: 0.8,
                                shared_with_motorized_traffic_low_speed: 0.6,
                                shared_with_motorized_traffic_medium_speed: 0.4,
                                shared_with_motorized_traffic_high_speed: 0.2,
                                not_walkable: 0.0,
                                unknown: -9999.0
                            },
                            description: 'Qualitative rating for each of the available path categories.',
                            examples: [
                                {
                                    designated: 1.0,
                                    designated_shared_with_bikes: 0.8,
                                    not_walkable: 0.0,
                                    shared_with_motorized_traffic_high_speed: 0.2,
                                    shared_with_motorized_traffic_low_speed: 0.6,
                                    shared_with_motorized_traffic_medium_speed: 0.4,
                                    unknown: -9999.0
                                }
                            ],
                            title: 'Path Rating Mapping'
                        },
                        admin_level: {
                            anyOf: [
                                {
                                    maximum: 12,
                                    minimum: 6,
                                    type: 'integer'
                                },
                                {
                                    type: 'null'
                                }
                            ],
                            default: 9,
                            description:
                                'The administrative level the results should be aggregated to. See the [OSM wiki documentation](https://wiki.openstreetmap.org/wiki/Tag:boundary=administrative) for available values.',
                            examples: [9],
                            title: 'Administrative level'
                        },
                        idw_method: {
                            anyOf: [
                                {
                                    $ref: '#/$defs/IDW'
                                },
                                {
                                    type: 'null'
                                }
                            ],
                            default:
                                'Step function reflecting statistical findings on walking path distance according to Xia et al 2018',
                            description:
                                'The function that should be used to model distance weighting. The approach is often called Inverse Distance Weighting (IDW) or Distance Decay. Walking trips exhibit a certain distribution. Many trips are rather short while long trips are relatively seldom. This attribute defines which function will be used to weight close vs. distant trip targets.',
                            examples: [
                                'Step function reflecting statistical findings on walking path distance according to Xia et al 2018'
                            ],
                            title: 'Distance Weighting'
                        }
                    },
                    title: 'ComputeInputWalkability',
                    type: 'object'
                },
                library_version: '6.0.2',
                online: true
            }
        ]
    }).as('getPluginsWithoutBlueprint')
}

export const mockPluginBlueprint = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/plugin/plugin_blueprint?lang=en`, {
        body: {
            name: 'Plugin Blueprint',
            authors: [
                {
                    name: 'Max Mustermann',
                    affiliation: 'XYZ gGmbH',
                    website: 'https://example.com/'
                },
                {
                    name: 'Erika Mustermann',
                    affiliation: 'Consultant at XYZ gGmbH',
                    website: 'https://example.com/'
                }
            ],
            version: '0.0.1',
            concerns: [],
            purpose: '',
            methodology: '',
            sources: [
                {
                    pages: '14-15',
                    volume: '2',
                    journal: 'J. Geophys. Res.',
                    year: '1954',
                    title: 'Nothing Particular',
                    author: 'J. G. Smith and H. K. Weston',
                    ENTRYTYPE: 'article',
                    ID: 'smit54'
                }
            ],
            assets: {
                icon: 'assets/plugin_blueprint/0.0.1/ICON.jpeg'
            },
            id: 'plugin_blueprint',
            operator_schema: {
                $defs: {
                    Mapping: {
                        properties: {
                            good: {
                                description: 'A good string.',
                                examples: ['John Doe'],
                                title: 'String for Good',
                                type: 'string'
                            },
                            mediocre: {
                                default: 2.1,
                                description: 'A mediocre float.',
                                examples: [2.1],
                                maximum: 4,
                                minimum: 0.5,
                                title: 'Mediocre Float',
                                type: 'number'
                            },
                            bad: {
                                $ref: '#/$defs/Option',
                                default: 'Option 2',
                                description: 'A bad selection.',
                                examples: ['Option 1'],
                                title: 'Bad Selection'
                            }
                        },
                        required: ['good'],
                        title: 'Mapping',
                        type: 'object'
                    },
                    Option: {
                        enum: ['Option 1', 'Option 2'],
                        title: 'Option',
                        type: 'string'
                    }
                },
                properties: {
                    bool_showcase: {
                        description: 'A required boolean parameter.',
                        examples: [true],
                        title: 'Boolean Input',
                        type: 'boolean'
                    },
                    int_showcase: {
                        default: 3,
                        description: 'An optional integer parameter.',
                        examples: [3],
                        exclusiveMaximum: 100,
                        exclusiveMinimum: 0,
                        title: 'Integer Input',
                        type: 'integer'
                    },
                    float_showcase: {
                        default: 2.1,
                        description: 'An optional floating point parameter.',
                        examples: [2.1],
                        maximum: 4,
                        minimum: 0.5,
                        title: 'Float Input',
                        type: 'number'
                    },
                    string_showcase: {
                        default: 'John Doe',
                        description: 'An optional string parameter.',
                        examples: ['John Doe'],
                        title: 'String Input',
                        type: 'string'
                    },
                    date_showcase: {
                        default: '2020-01-01',
                        description: 'An optional date parameter.',
                        examples: ['2020-01-01'],
                        format: 'date',
                        title: 'Date Input',
                        type: 'string'
                    },
                    select_showcase: {
                        $ref: '#/$defs/Option',
                        default: 'Option 2',
                        description:
                            'An optional selection parameter. The user can choose one of the available options.',
                        examples: ['Option 2'],
                        title: 'Selection Input'
                    },
                    select_multi_showcase: {
                        default: ['Option 2'],
                        description:
                            'An optional selection parameter. The user can choose multiple of the available options.',
                        examples: [['Option 2']],
                        items: {
                            $ref: '#/$defs/Option'
                        },
                        title: 'Multi-Selection Input',
                        type: 'array',
                        uniqueItems: true
                    },
                    mapping_showcase: {
                        $ref: '#/$defs/Mapping',
                        default: {
                            good: 'John Doe',
                            mediocre: 2.1,
                            bad: 'Option 2'
                        },
                        description:
                            'This input represents a custom grouping of input values. They will be shown together in the front-end and will get a dedicated title and description. You can use it e.g. to group input variables that correspond to the same aspect of your indicator.Alternatively it can be used as a mapping input where the user can define key->value pairs representing choices/options that values/results are mapped to. E.g. the user could be asked to provide a tier list for bikeable path categories.',
                        examples: [
                            {
                                bad: 'Option 2',
                                good: 'John Doe',
                                mediocre: 2.1
                            }
                        ],
                        title: 'Grouping or Mapping Input'
                    }
                },
                required: ['bool_showcase'],
                title: 'ComputeInput',
                type: 'object'
            },
            library_version: '5.1.0',
            online: true
        }
    }).as('getPluginBlueprint')
}

export const mockPluginBlueprintGerman = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/plugin/plugin_blueprint?lang=de`, {
        body: {
            name: 'Plugin Blueprint',
            authors: [
                {
                    name: 'Max Mustermann',
                    affiliation: 'XYZ gGmbH',
                    website: 'https://example.com/'
                },
                {
                    name: 'Erika Mustermann',
                    affiliation: 'Consultant at XYZ gGmbH',
                    website: 'https://example.com/'
                }
            ],
            version: '0.0.1',
            concerns: [],
            purpose: '',
            methodology: '',
            sources: [
                {
                    pages: '14-15',
                    volume: '2',
                    journal: 'J. Geophys. Res.',
                    year: '1954',
                    title: 'Nothing Particular',
                    author: 'J. G. Smith and H. K. Weston',
                    ENTRYTYPE: 'article',
                    ID: 'smit54'
                }
            ],
            assets: {
                icon: 'assets/plugin_blueprint/0.0.1/ICON.jpeg'
            },
            id: 'plugin_blueprint',
            operator_schema: {
                $defs: {},
                properties: {
                    bool_showcase: {
                        description: 'Ein erforderlicher boolescher Parameter.',
                        examples: [true],
                        title: 'Boolescher Input',
                        type: 'boolean'
                    }
                },
                required: ['bool_showcase'],
                title: 'ComputeInput',
                type: 'object'
            },
            library_version: '5.1.0',
            online: true
        }
    }).as('getPluginBlueprintGerman')
}

export const mockPluginHiWalk = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/plugin/hiwalk?lang=en`, {
        body: {
            name: 'hiWalk',
            authors: [
                {
                    name: 'Max Mustermann',
                    affiliation: 'XYZ gGmbH',
                    website: 'https://example.com/'
                },
                {
                    name: 'Erika Mustermann',
                    affiliation: 'Consultant at XYZ gGmbH',
                    website: 'https://example.com/'
                }
            ],
            version: '1.0.0',
            state: 'active',
            concerns: ['pedestrian'],
            teaser: null,
            purpose:
                "The Walkability module provides a collection of indicators related to a number of different aspects that determine the perceived quality (safety, comfort, practicality) of walking along a given street or within a given area of interest. In the future, the module will combine the different indicators into a general walkability index.\n\nCurrently available are:\n\n* A categorisation of walkable paths based on which other road users share the path with pedestrians (such as bicycles and motorised traffic).\n* A grading of the paths' surface quality based on its reported smoothness or surface type.\n* A connectivity measure based on the reachability of other paths within a defined area of interest.\n",
            methodology:
                'The indicators are based on the [OpenStreetMap (OSM)](https://www.openstreetmap.org/about) database.\nOSM is a free and open geo-database often called the "Wikipedia of maps".\nIt is a feature-rich collection of e.g. streets and paths maintained by voluntary contributors.\n\nDetailed explanations on the methods can be found in the description of each indicator.',
            sources: [],
            assets: {
                icon: 'assets/walkability/1.0.0/ICON.jpeg'
            },
            id: 'hiwalk',
            operator_schema: {
                $defs: {
                    NaturalnessIndex: {
                        enum: ['NDVI', 'WATER', 'NATURALNESS'],
                        title: 'NaturalnessIndex',
                        type: 'string'
                    },
                    WalkabilityIndicators: {
                        enum: ['Slope', 'Naturalness', 'Detour Factor'],
                        title: 'WalkabilityIndicators',
                        type: 'string'
                    }
                },
                properties: {
                    indicators_to_compute: {
                        default: [],
                        description:
                            'Computing these indicators for large areas may exceed the time limit for individual assessments in the Climate Action Navigator.',
                        examples: [],
                        items: {
                            $ref: '#/$defs/WalkabilityIndicators'
                        },
                        title: 'Optional indicators',
                        type: 'array',
                        uniqueItems: true
                    },
                    naturalness_index: {
                        allOf: [
                            {
                                $ref: '#/$defs/NaturalnessIndex'
                            }
                        ],
                        default: 'NDVI',
                        description:
                            'Choose NDVI to include only vegetation greenness, WATER to include only water bodies, and NATURALNESS to include both.',
                        examples: ['NDVI'],
                        title: 'What to include in naturalness calculation?'
                    }
                },
                title: 'ComputeInputWalkability',
                type: 'object'
            },
            library_version: '6.0.2',
            online: true
        }
    }).as('getPluginHiWalk')
}

export const mockPostPluginRun = () => {
    cy.intercept('POST', `${cypressEnvironment.apiBasePath}/plugin/hiwalk?lang=en`, {
        body: {
            correlation_uuid: '8d81bea0-7183-4083-aae0-b751f9813de5'
        },
        delay: 100
    }).as('postPluginRun')
}

export const mockComputationRunState = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/computation/8d81bea0-7183-4083-aae0-b751f9813de5/state`, {
        body: {
            state: 'SUCCESS',
            message: ''
        }
    }).as('getComputationRunState')
}

export const mockPluginHiWalkComputation = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/store/8d81bea0-7183-4083-aae0-b751f9813de5/metadata`, {
        body: {
            correlation_uuid: '8d81bea0-7183-4083-aae0-b751f9813de5',
            request_ts: '2025-06-10T12:26:34.929303',
            deduplication_key: 'df845f2d-f836-4288-7ee2-91d9dad16cca',
            cache_epoch: 120,
            valid_until: '2025-08-28T00:00:00',
            params: {
                naturalness_index: 'NDVI',
                indicators_to_compute: []
            },
            requested_params: {
                naturalness_index: 'NDVI',
                indicators_to_compute: []
            },
            aoi: {
                type: 'Feature',
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [
                        [
                            [
                                [0.0, 0.0],
                                [1.0, 0.0],
                                [1.0, 1.0],
                                [0.0, 0.0]
                            ]
                        ]
                    ]
                },
                properties: {
                    name: 'Ventotene',
                    id: '-40782'
                }
            },
            artifacts: [
                {
                    name: 'Path Category',
                    modality: 'VECTOR_MAP_LAYER',
                    primary: true,
                    tags: [],
                    summary: 'Who shares this path with me?',
                    description:
                        'Paths exclusively for pedestrians are safer and more comfortable than paths shared with bikes or, even worse, fast\nmotorised traffic.',
                    correlation_uuid: '67bc4e3e-605b-4baa-8d18-df733d37f6c0',
                    filename: '40368c53-5c5d-4070-b6c8-a6ec2b630d27_walkable.geojson',
                    sources: [],
                    rank: 0,
                    attachments: {
                        legend: {
                            legend_data: {
                                Designated: '#3b4cc0',
                                'Shared with bikes': '#7b9ff9',
                                'Shared with cars up to 15 km/h': '#dcdddd',
                                'Shared with cars up to 30 km/h': '#f2cbb7',
                                'Shared with cars up to 50 km/h': '#f7ac8e',
                                'Shared with cars above 50 km/h': '#ee8468',
                                'Shared with cars of unknown speed': '#d65244',
                                'No access': '#b40426',
                                Unknown: '#808080'
                            },
                            legend_type: 'DISCRETE'
                        }
                    }
                },
                {
                    name: 'Surface Quality',
                    modality: 'VECTOR_MAP_LAYER',
                    primary: true,
                    tags: [],
                    summary: 'Can I walk comfortably on this surface?',
                    description:
                        "A path's surface quality refers to how safe and comfortable it is for walking. A smooth, solid surface is especially important for people with limited mobility, as well as for those using wheelchairs, walking frames, or prams/strollers",
                    correlation_uuid: '67bc4e3e-605b-4baa-8d18-df733d37f6c0',
                    filename: 'a5bbab88-21a6-4bc9-a1c2-155a446c6ea7_pavement_quality.geojson',
                    sources: [],
                    rank: 1,
                    attachments: {
                        legend: {
                            legend_data: {
                                good: '#3b4cc0',
                                potentially_good: '#7b9ff9',
                                mediocre: '#dcdddd',
                                potentially_mediocre: '#f7ac8e',
                                poor: '#b40426',
                                unknown: '#808080'
                            },
                            legend_type: 'DISCRETE'
                        }
                    }
                },
                {
                    name: 'Distribution of Path Categories',
                    modality: 'CHART_PLOTLY',
                    primary: true,
                    tags: [],
                    summary: 'How is the total length of paths distributed across the path categories?',
                    description: null,
                    correlation_uuid: '67bc4e3e-605b-4baa-8d18-df733d37f6c0',
                    filename: '761e46a7-3cdb-4068-b477-7e331c5eccfe_aggregation_aoi_category_stacked_bar.json',
                    sources: [],
                    rank: 2,
                    attachments: {}
                },
                {
                    name: 'Distribution of Surface Quality',
                    modality: 'CHART_PLOTLY',
                    primary: true,
                    tags: [],
                    summary: 'How is the total length of paths distributed across the surface quality categories?',
                    description: null,
                    correlation_uuid: '67bc4e3e-605b-4baa-8d18-df733d37f6c0',
                    filename: 'a20d6a62-9970-42e2-8308-1213fdcadbc8_aggregation_aoi_quality_stacked_bar.json',
                    sources: [],
                    rank: 3,
                    attachments: {}
                }
            ],
            plugin_info: {
                id: 'hiwalk',
                version: '2.0.1'
            },
            status: 'SUCCESS',
            message: null,
            artifact_errors: {}
        }
    }).as('getPluginHiWalkComputation')
}

export const mockPluginBlueprint404 = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/plugin/plugin_blueprint?lang=en`, {
        statusCode: 404
    }).as('getPluginBlueprint404')
}

export const mockPluginBluePrintIcon = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/store/plugin_blueprint/icon`, {
        fixture: 'plugin_bp_icon.jpeg'
    }).as('getPluginBlueprintIcon')
}

export const mockPluginWalkabilitytIcon = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/store/hiwalk/icon`, {
        fixture: 'plugin_walkability_icon.jpeg'
    }).as('getPluginWalkabilityIcon')
}

export const mockPluginBlueprintComputation = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/store/8649e714-f29d-423f-85ce-cd55f4e5022a/metadata`, {
        body: {
            correlation_uuid: '8649e714-f29d-423f-85ce-cd55f4e5022a',
            request_ts: '2024-12-17T08:55:23.807074Z',
            params: {
                bool_showcase: true
            },
            aoi: {
                type: 'Feature',
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [
                        [
                            [
                                [0.0, 0.0],
                                [1.0, 0.0],
                                [1.0, 1.0],
                                [0.0, 0.0]
                            ]
                        ]
                    ]
                },
                properties: {
                    name: 'Heidelberg',
                    id: '-285864'
                },
                id: 'admin_world_water.-285864'
            },
            artifacts: [
                {
                    name: 'A Text',
                    modality: 'MARKDOWN',
                    primary: true,
                    tags: ['input'],
                    summary: 'A JSON-block of the input parameters',
                    description: null,
                    correlation_uuid: '8649e714-f29d-423f-85ce-cd55f4e5022a',
                    filename: '73fb8180-efb4-43b7-8d69-f223d5473dc7_markdown.md',
                    sources: [],
                    rank: 0,
                    attachments: {}
                },
                {
                    name: 'Character Count',
                    modality: 'TABLE',
                    primary: true,
                    tags: ['input'],
                    summary: 'The table lists the number of occurrences for each character in the input parameters.',
                    description: 'A table with two columns.',
                    correlation_uuid: '8649e714-f29d-423f-85ce-cd55f4e5022a',
                    filename: '2b983131-5bf9-4cdb-9c36-f6e910817407_table.csv',
                    sources: [],
                    rank: 1,
                    attachments: {}
                }
            ],
            plugin_info: {
                id: 'plugin_blueprint',
                version: '0.3.0'
            },
            status: 'SUCCESS',
            message: '-'
        }
    }).as('getPluginBlueprintComputation')
}

export const mockBlueprintTable = () => {
    cy.intercept(
        `${cypressEnvironment.apiBasePath}/store/8649e714-f29d-423f-85ce-cd55f4e5022a/2b983131-5bf9-4cdb-9c36-f6e910817407_table.csv`,
        {
            fixture: 'sample_table_blueprint.csv'
        }
    ).as('getBlueprintTable')
}

export const mockGeoTiffComputation = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/store/8a897536-c4b4-4e5a-9d70-50430183ac66/metadata`, {
        body: {
            correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
            request_ts: new Date('2023-09-27T16:42:52+01:00'),
            params: {
                bool_blueprint: true
            },
            aoi: {
                type: 'Feature',
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [
                        [
                            [
                                [116.3500629, 39.9222736],
                                [116.3505557, 39.9109802],
                                [116.3502807, 39.9081009],
                                [116.3503101, 39.9056782],
                                [116.3505186, 39.901277],
                                [116.3509736, 39.9004266],
                                [116.3518984, 39.8993272],
                                [116.3527821, 39.8986917],
                                [116.3540159, 39.8981715],
                                [116.3540312, 39.8978679],
                                [116.3681236, 39.8983514],
                                [116.3672525, 39.9226073],
                                [116.3500629, 39.9222736]
                            ]
                        ]
                    ]
                },
                properties: {
                    osm_id: -13210713,
                    boundary: 'administrative',
                    admin_level: 8,
                    parents: [-15887483, -912940, -270056],
                    name: '金融街街道',
                    local_name: '金融街街道',
                    name_en: null,
                    id: 'uzyj1dj'
                }
            },
            artifacts: [
                {
                    name: 'LULC Classification',
                    modality: 'RASTER_MAP_LAYER',
                    primary: true,
                    tags: [],
                    summary: 'A land-use and land-cover classification of a user defined area.',
                    description: 'The classification is created using a deep learning model.',
                    correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                    filename: 'a126bc7d-1236-4459-97d8-65afc529053e_raster_blueprint.tiff',
                    sources: [],
                    rank: 0,
                    attachments: {
                        legend: {
                            legend_data: {
                                unknown: '#000',
                                'built-up': '#f00',
                                forest: '#4dc800',
                                water: '#82c8fa',
                                farmland: '#ffff50',
                                permanent_crops: '#e68000',
                                grass: '#cdebb0'
                            },
                            legend_type: 'DISCRETE'
                        }
                    }
                }
            ],
            plugin_info: {
                id: 'plugin_blueprint',
                version: '1.0.0'
            },
            status: 'SUCCESS',
            message: '-'
        }
    }).as('getGeoTiffComputation')
}

export const mockGeoJsonComputationJinrongjie = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/store/3495b256-6ebc-4cd1-a2f5-8216f57f7f85/metadata`, {
        body: {
            correlation_uuid: '3495b256-6ebc-4cd1-a2f5-8216f57f7f85',
            request_ts: new Date('2023-09-27T16:42:52+01:00'),
            params: {
                bool_blueprint: true
            },
            aoi: {
                type: 'Feature',
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [
                        [
                            [
                                [116.3500629, 39.9222736],
                                [116.3505557, 39.9109802],
                                [116.3502807, 39.9081009],
                                [116.3503101, 39.9056782],
                                [116.3505186, 39.901277],
                                [116.3509736, 39.9004266],
                                [116.3518984, 39.8993272],
                                [116.3527821, 39.8986917],
                                [116.3540159, 39.8981715],
                                [116.3540312, 39.8978679],
                                [116.3681236, 39.8983514],
                                [116.3672525, 39.9226073],
                                [116.3500629, 39.9222736]
                            ]
                        ]
                    ]
                },
                properties: {
                    osm_id: -13210713,
                    boundary: 'administrative',
                    admin_level: 8,
                    parents: [-15887483, -912940, -270056],
                    name: 'Jinrongjie',
                    local_name: 'Jinrongjie',
                    name_en: null,
                    id: 'uzyj1dj'
                }
            },
            artifacts: [
                {
                    name: 'Connectivity',
                    modality: 'VECTOR_MAP_LAYER',
                    primary: true,
                    tags: [],
                    summary:
                        'Connectivity of path segments:\n\nThe map shows how accessible the locations surrounding each path are. High connectivity for a given path means a high share of the surrounding paths can be reached in the maximum trip duration.\n\nMore specifically, we define connectivity as the proportion of accessible locations out of the total number of locations in an area of interest (AOI). The AOI includes all the road intersections that can be reached from a given point traveling at the walking speed for the maximum trip duration in a straight line (\"as the crow flies\"). A target location is considered accessible if the actual walking distance through the street network is smaller or equal to the radius of the AOI.\n\nWhen calculating connectivity, it is possible to take into account that people are more likely to walk shorter rather than longer distances, and therefore give more weight to closer locations. For more details see the description below.\n\n\n',
                    description:
                        'For each segment the connectivity is calculated as:\n\n`Connectivity = #(Segments in AOI) / ∑(Weighting of reachable segments),`\n\nwhere the AOI is centred on the root segment with a radius corresponding to the maximum walking distance:\n\n`Maximum walking distance = Walking speed * Maximum trip time`\n\nand a destination segment in the AOI is counted as reachable if:\n\n`Actual walking distance ≤ Maximum walking distance`\n\nThe weighting of the reachable segments is determined from the beeline distance to the root segment using a distance decay function chosen in the input. One can choose between:\n\nNo decay:\n* `w(d) = 1`\n\nPolynomial decay ([Frank et al. 2010](https://bjsm.bmj.com/content/44/13/924)):\n* `w(d) =`\n  * `[335.9229 * d⁵ - 1327.84 * d⁴ + 1802.56 * d³ - 935.68 * d² + 61.92 * d + 100.1072] / 100` if `d ≤ 1.5`\n  * `0` if `d > 1.5`\n\n(Default) A step function ([Xia et al. 2018](https://www.mdpi.com/2071-1050/10/11/3879/pdf?version=1540460686)):\n* `w(d) =`\n  * `1 if d < 0.4`\n  * `0.6 if d < 0.8`\n  * `0.25 if d < 1.2`\n  * `0.08 if d < 1.8`\n  * `0 if d ≥ 1.8`\n\nwhere `w` is the weighting and `d` the beeline distance in kilometers.',
                    correlation_uuid: '3495b256-6ebc-4cd1-a2f5-8216f57f7f85',
                    filename: '2075e569-8576-4842-ba7a-13f703275da3_raster_blueprint.geojson',
                    sources: [],
                    rank: 0,
                    attachments: {
                        legend: {
                            legend_data: {
                                cmap_name: 'seismic',
                                ticks: {
                                    'Low Connectivity': 1.0,
                                    'Medium Connectivity': 0.5,
                                    'High Connectivity': 0.0
                                }
                            },
                            legend_type: 'CONTINUOUS'
                        }
                    }
                },
                {
                    name: 'Detour Factor',
                    primary: true,
                    tags: [],
                    filename: 'sample_vector_detourfactors-jinrongjie.geojson',
                    summary: 'Can I reach my surroundings without big detours?',
                    description: 'Detour factors measure how directly you can walk to surrounding locations.',
                    sources: [],
                    modality: 'VECTOR_MAP_LAYER',
                    attachments: {
                        legend: {
                            title: null,
                            legend_data: {
                                Unreachable: '#990404',
                                'High Detour': '#e75a13',
                                'Medium Detour': '#eea321'
                            },
                            legend_type: 'DISCRETE'
                        }
                    },
                    correlation_uuid: '3495b256-6ebc-4cd1-a2f5-8216f57f7f85',
                    rank: 6
                }
            ],
            plugin_info: {
                id: 'plugin_blueprint',
                version: '1.0.0'
            },
            status: 'SUCCESS',
            message: '-'
        }
    }).as('getGeoJsonComputationJinrongjie')
}

export const mockGeoJsonComputationWestChangan = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/store/0f4552a1-79c4-452c-9e01-3c33a9bae0e8/metadata`, {
        body: {
            correlation_uuid: '0f4552a1-79c4-452c-9e01-3c33a9bae0e8',
            request_ts: new Date('2023-05-25T16:57:52+01:00'),
            params: {
                bool_blueprint: true
            },
            aoi: {
                type: 'Feature',
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [
                        [
                            [
                                [116.36729191619845, 39.92106930491204],
                                [116.36788351619852, 39.90443380490862],
                                [116.36798711619858, 39.90086520490789],
                                [116.36812361619855, 39.898351404907345],
                                [116.37799271619996, 39.89866260490746],
                                [116.38609911620111, 39.898918104907494],
                                [116.38674661620121, 39.89892810490747],
                                [116.38709961620125, 39.89892310490745],
                                [116.38787301620135, 39.89887570490748],
                                [116.38977311620158, 39.89872340490743],
                                [116.38971731620163, 39.89904530490753],
                                [116.38964031620154, 39.90033930490776],
                                [116.38950361620154, 39.90297610490833],
                                [116.38937031620154, 39.90560950490891],
                                [116.38932271620156, 39.90654810490909],
                                [116.3885066162014, 39.906532104909076],
                                [116.38850161620134, 39.906632804909094],
                                [116.38580641620104, 39.906572304909076],
                                [116.38580821620101, 39.90678640490913],
                                [116.38606701620107, 39.906790304909094],
                                [116.38630971620113, 39.90700930490914],
                                [116.38655521620116, 39.90722610490923],
                                [116.38647021620113, 39.90907680490963],
                                [116.38640681620107, 39.90907640490963],
                                [116.38639701620109, 39.909278304909634],
                                [116.38559821620103, 39.909266804909606],
                                [116.385562016201, 39.91029150490988],
                                [116.38554621620104, 39.91087620491001],
                                [116.38549121620096, 39.91087600490994],
                                [116.38548761620103, 39.91097240491001],
                                [116.38582181620104, 39.91098470490999],
                                [116.38580871620103, 39.91153040491008],
                                [116.38636981620108, 39.91155400491016],
                                [116.38634821620109, 39.91207880491024],
                                [116.38631661620116, 39.91322940491048],
                                [116.38629881620113, 39.9136226049105],
                                [116.3862715162011, 39.913621904910514],
                                [116.38626571620108, 39.91372630491057],
                                [116.38596491620105, 39.919582804911755],
                                [116.38590911620109, 39.921060204912095],
                                [116.38814681620134, 39.92113800491214],
                                [116.38922741620148, 39.9211726049121],
                                [116.3896376162016, 39.92118890491216],
                                [116.39028041620165, 39.921213904912065],
                                [116.3902449162017, 39.92181310491222],
                                [116.38581991620106, 39.921703204912205],
                                [116.385536216201, 39.92167820491224],
                                [116.38542241620101, 39.92165030491222],
                                [116.38526011620094, 39.921577004912194],
                                [116.38508351620096, 39.92144260491213],
                                [116.38487231620088, 39.921204604912134],
                                [116.3845992162009, 39.920857904912026],
                                [116.38339041620074, 39.92084710491207],
                                [116.38307781620064, 39.92085870491201],
                                [116.38276681620056, 39.920902904912055],
                                [116.38241791620058, 39.92100460491207],
                                [116.38225661620052, 39.921054604912115],
                                [116.38210181620055, 39.92108520491206],
                                [116.38181861620053, 39.92108480491211],
                                [116.38085151620035, 39.92105100491207],
                                [116.38048831620024, 39.92106210491207],
                                [116.38022461620025, 39.921104604912074],
                                [116.37995561620023, 39.921124004912144],
                                [116.37829941620004, 39.9210783049121],
                                [116.37804181619998, 39.92110450491211],
                                [116.37759371619987, 39.92122210491215],
                                [116.37735411619988, 39.92124620491214],
                                [116.36729191619845, 39.92106930491204]
                            ],
                            [
                                [116.38188301620048, 39.90060140490783],
                                [116.38235661620054, 39.9006251049079],
                                [116.38275131620063, 39.90059060490782],
                                [116.38298121620063, 39.900559404907824],
                                [116.38307521620068, 39.90053270490779],
                                [116.38307291620067, 39.90042830490779],
                                [116.38296561620068, 39.90015050490774],
                                [116.38299911620068, 39.89920390490755],
                                [116.38197311620047, 39.89915760490757],
                                [116.38188301620048, 39.90060140490783]
                            ]
                        ]
                    ]
                },
                properties: {
                    name: "West Chang'an",
                    id: '-13210714'
                }
            },
            artifacts: [
                {
                    name: 'Path Category',
                    modality: 'VECTOR_MAP_LAYER',
                    primary: true,
                    tags: ['traffic'],
                    summary: 'Who shares this path with me?',
                    description:
                        'Paths exclusively for pedestrians are safer and more comfortable than paths shared with bikes or, even worse, fast\nmotorised traffic. This indicator categorises paths according to which other users share space with pedestrians.\n\nCategories (from better to worse):\n* Designated: Paths exclusively for pedestrians (e.g., sidewalks).\n* Shared with bikes: Paths where pedestrians share space with cyclists.\n* Shared with cars up to 15 km/h: Streets without a sidewalk and with speed limits up to 15 km/h, such as living streets and service ways.\n* Shared with cars up to 30 km/h: Streets without a sidewalk, with speed limits up to 30 km/h.\n* Shared with cars up to 50 km/h: Streets without a sidewalk, with speed limits up to 50 km/h.\n* Shared with cars above 50 km/h: Streets without a sidewalk and with speed limits higher than 50 km/h. Shown to explicitly highlight barriers\n* Shared with cars of unknown speed: Streets without a sidewalk and with unknown speed limit.\n* Unknown: Paths without enough information to categorise (e.g., streets with no information about sidewalk presence).\n\nThe categorisation is based on OpenStreetMap (OSM) tags.',
                    correlation_uuid: '0f4552a1-79c4-452c-9e01-3c33a9bae0e8',
                    filename: '67bff711-54af-4ee3-a5dd-7e76907bc5d8_walkable.geojson',
                    sources: [],
                    rank: 0,
                    attachments: {
                        legend: {
                            legend_data: {
                                Designated: '#3b4cc0',
                                'Shared with bikes': '#7b9ff9',
                                'Shared with cars up to 15 km/h': '#c0d4f5',
                                'Shared with cars up to 30 km/h': '#f2cbb7',
                                'Shared with cars up to 50 km/h': '#ee8468',
                                'Shared with cars above 50 km/h': '#b40426',
                                'Shared with cars of unknown speed': '#b40426',
                                Unknown: '#808080'
                            },
                            legend_type: 'DISCRETE'
                        }
                    }
                }
            ],
            plugin_info: {
                id: 'plugin_blueprint',
                version: '1.0.0'
            },
            status: 'SUCCESS',
            message: '-'
        }
    }).as('getGeoJsonComputationWestChangan')
}

export const mockSimpleGeoJsonComputation = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/store/1cfd2634-1724-43a2-ab1e-6466ba433364/metadata`, {
        body: {
            correlation_uuid: '1cfd2634-1724-43a2-ab1e-6466ba433364',
            request_ts: new Date('2023-09-27T16:42:52+01:00'),
            params: {
                bool_blueprint: true
            },
            aoi: {
                type: 'Feature',
                geometry: {
                    type: 'MultiPolygon',
                    coordinates: [
                        [
                            [
                                [116.3500629, 39.9222736],
                                [116.3505557, 39.9109802],
                                [116.3502807, 39.9081009],
                                [116.3503101, 39.9056782],
                                [116.3505186, 39.901277],
                                [116.3509736, 39.9004266],
                                [116.3518984, 39.8993272],
                                [116.3527821, 39.8986917],
                                [116.3540159, 39.8981715],
                                [116.3540312, 39.8978679],
                                [116.3681236, 39.8983514],
                                [116.3672525, 39.9226073],
                                [116.3500629, 39.9222736]
                            ]
                        ]
                    ]
                },
                properties: {
                    osm_id: -13210713,
                    boundary: 'administrative',
                    admin_level: 8,
                    parents: [-15887483, -912940, -270056],
                    name: 'Jinrongjie',
                    local_name: 'Jinrongjie',
                    name_en: null,
                    id: 'uzyj1dj'
                }
            },
            artifacts: [
                {
                    name: 'Connectivity',
                    modality: 'VECTOR_MAP_LAYER',
                    primary: true,
                    tags: [],
                    summary:
                        'Connectivity of path segments:\n\nThe map shows how accessible the locations surrounding each path are. High connectivity for a given path means a high share of the surrounding paths can be reached in the maximum trip duration.\n\nMore specifically, we define connectivity as the proportion of accessible locations out of the total number of locations in an area of interest (AOI). The AOI includes all the road intersections that can be reached from a given point traveling at the walking speed for the maximum trip duration in a straight line (\"as the crow flies\"). A target location is considered accessible if the actual walking distance through the street network is smaller or equal to the radius of the AOI.\n\nWhen calculating connectivity, it is possible to take into account that people are more likely to walk shorter rather than longer distances, and therefore give more weight to closer locations. For more details see the description below.\n\n\n',
                    description:
                        'For each segment the connectivity is calculated as:\n\n`Connectivity = #(Segments in AOI) / ∑(Weighting of reachable segments),`\n\nwhere the AOI is centred on the root segment with a radius corresponding to the maximum walking distance:\n\n`Maximum walking distance = Walking speed * Maximum trip time`\n\nand a destination segment in the AOI is counted as reachable if:\n\n`Actual walking distance ≤ Maximum walking distance`\n\nThe weighting of the reachable segments is determined from the beeline distance to the root segment using a distance decay function chosen in the input. One can choose between:\n\nNo decay:\n* `w(d) = 1`\n\nPolynomial decay ([Frank et al. 2010](https://bjsm.bmj.com/content/44/13/924)):\n* `w(d) =`\n  * `[335.9229 * d⁵ - 1327.84 * d⁴ + 1802.56 * d³ - 935.68 * d² + 61.92 * d + 100.1072] / 100` if `d ≤ 1.5`\n  * `0` if `d > 1.5`\n\n(Default) A step function ([Xia et al. 2018](https://www.mdpi.com/2071-1050/10/11/3879/pdf?version=1540460686)):\n* `w(d) =`\n  * `1 if d < 0.4`\n  * `0.6 if d < 0.8`\n  * `0.25 if d < 1.2`\n  * `0.08 if d < 1.8`\n  * `0 if d ≥ 1.8`\n\nwhere `w` is the weighting and `d` the beeline distance in kilometers.',
                    correlation_uuid: '1cfd2634-1724-43a2-ab1e-6466ba433364',
                    filename: '4d715d0f-a3ec-4d9c-8aed-d01a4e07165a_block_blueprint.geojson',
                    sources: [],
                    rank: 0,
                    attachments: {
                        legend: {
                            legend_data: {
                                cmap_name: 'seismic',
                                ticks: {
                                    'Low Connectivity': 1.0,
                                    'Medium Connectivity': 0.5,
                                    'High Connectivity': 0.0
                                }
                            },
                            legend_type: 'CONTINUOUS'
                        }
                    }
                }
            ],
            plugin_info: {
                id: 'plugin_blueprint',
                version: '1.0.0'
            },
            status: 'SUCCESS',
            message: '-'
        }
    }).as('getSimpleGeoJsonComputation')
}

export const mockGeoTiff = () => {
    cy.intercept(
        `${cypressEnvironment.apiBasePath}/store/8a897536-c4b4-4e5a-9d70-50430183ac66/a126bc7d-1236-4459-97d8-65afc529053e_raster_blueprint.tiff`,
        {
            fixture: 'sample_raster_blueprint.tiff'
        }
    ).as('getGeoTiff')
}

export const mockGeoJsonDetourFactorsJinrongjie = () => {
    cy.intercept(
        `${cypressEnvironment.apiBasePath}/store/3495b256-6ebc-4cd1-a2f5-8216f57f7f85/sample_vector_detourfactors-jinrongjie.geojson`,
        {
            fixture: 'sample_vector_detourfactors-jinrongjie.geojson'
        }
    ).as('getGeoJsonDetourFactorsJinrongjie')
}

export const mockGeoJsonJinrongjie = () => {
    cy.intercept(
        `${cypressEnvironment.apiBasePath}/store/3495b256-6ebc-4cd1-a2f5-8216f57f7f85/2075e569-8576-4842-ba7a-13f703275da3_raster_blueprint.geojson`,
        {
            fixture: 'sample_vector_blueprint-jinrongjie.geojson'
        }
    ).as('getGeoJsonJinrongjie')
}

export const mockGeoJsonWestChangan = () => {
    cy.intercept(
        `${cypressEnvironment.apiBasePath}/store/0f4552a1-79c4-452c-9e01-3c33a9bae0e8/67bff711-54af-4ee3-a5dd-7e76907bc5d8_walkable.geojson`,
        {
            fixture: 'sample_vector_blueprint-westchangan.geojson'
        }
    ).as('getGeoJsonWestChangan')
}

export const mockSimpleGeoJson = () => {
    cy.intercept(
        `${cypressEnvironment.apiBasePath}/store/1cfd2634-1724-43a2-ab1e-6466ba433364/4d715d0f-a3ec-4d9c-8aed-d01a4e07165a_block_blueprint.geojson`,
        {
            fixture: 'simple_vector_blueprint.geojson'
        }
    ).as('getSimpleGeoJson')
}

export const interceptSearchORS = () => {
    cy.intercept('https://api.openrouteservice.org/geocode/autocomplete?*', {
        body: {
            geocoding: {
                version: '0.2',
                attribution: 'https://openrouteservice.org/terms-of-service/#attribution-geocode',
                query: {
                    text: 'Berlin',
                    parser: 'pelias',
                    parsed_text: {
                        subject: 'Berlin',
                        locality: 'Berlin'
                    },
                    size: 10,
                    layers: [
                        'address',
                        'venue',
                        'neighbourhood',
                        'locality',
                        'borough',
                        'localadmin',
                        'county',
                        'macrocounty'
                    ],
                    private: false,
                    lang: {
                        name: 'English',
                        iso6391: 'en',
                        iso6393: 'eng',
                        via: 'header',
                        defaulted: false
                    },
                    querySize: 20
                },
                engine: {
                    name: 'Pelias',
                    author: 'Mapzen',
                    version: '1.0'
                },
                timestamp: 1773219199600
            },
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [13.407032, 52.524932]
                    },
                    properties: {
                        id: '101909779',
                        gid: 'whosonfirst:locality:101909779',
                        layer: 'locality',
                        source: 'whosonfirst',
                        source_id: '101909779',
                        name: 'Berlin',
                        accuracy: 'centroid',
                        country: 'Germany',
                        country_gid: 'whosonfirst:country:85633111',
                        country_a: 'DEU',
                        region: 'Berlin',
                        region_gid: 'whosonfirst:region:85682499',
                        region_a: 'BE',
                        localadmin: 'Berlin',
                        localadmin_gid: 'whosonfirst:localadmin:1377694153',
                        locality: 'Berlin',
                        locality_gid: 'whosonfirst:locality:101909779',
                        continent: 'Europe',
                        continent_gid: 'whosonfirst:continent:102191581',
                        label: 'Berlin, Germany',
                        addendum: {
                            concordances: {
                                'gp:id': 667027,
                                'wd:id': 'Q64',
                                'gn:id': 6547383,
                                'qs:id': 630199
                            }
                        }
                    },
                    bbox: [13.088333, 52.338242, 13.760469, 52.674917]
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [13.41377, 52.5233]
                    },
                    properties: {
                        id: '6547383',
                        gid: 'geonames:locality:6547383',
                        layer: 'locality',
                        source: 'geonames',
                        source_id: '6547383',
                        name: 'Berlin',
                        accuracy: 'centroid',
                        country: 'Germany',
                        country_gid: 'whosonfirst:country:85633111',
                        country_a: 'DEU',
                        region: 'Berlin',
                        region_gid: 'whosonfirst:region:85682499',
                        region_a: 'BE',
                        localadmin: 'Berlin',
                        localadmin_gid: 'whosonfirst:localadmin:1377694153',
                        locality: 'Berlin',
                        locality_gid: 'geonames:locality:6547383',
                        continent: 'Europe',
                        continent_gid: 'whosonfirst:continent:102191581',
                        label: 'Berlin, Germany',
                        addendum: {
                            geonames: {
                                feature_code: 'ADM3'
                            }
                        }
                    }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [13.58228, 52.44254]
                    },
                    properties: {
                        id: '2885657',
                        gid: 'geonames:neighbourhood:2885657',
                        layer: 'neighbourhood',
                        source: 'geonames',
                        source_id: '2885657',
                        name: 'Berlin Köpenick',
                        accuracy: 'centroid',
                        country: 'Germany',
                        country_gid: 'whosonfirst:country:85633111',
                        country_a: 'DEU',
                        region: 'Berlin',
                        region_gid: 'whosonfirst:region:85682499',
                        region_a: 'BE',
                        localadmin: 'Berlin',
                        localadmin_gid: 'whosonfirst:localadmin:1377694153',
                        locality: 'Berlin',
                        locality_gid: 'whosonfirst:locality:101909779',
                        borough: 'Treptow-Kopenick',
                        borough_gid: 'whosonfirst:borough:1108815559',
                        neighbourhood: 'Kopenick',
                        neighbourhood_gid: 'whosonfirst:neighbourhood:420784377',
                        continent: 'Europe',
                        continent_gid: 'whosonfirst:continent:102191581',
                        label: 'Berlin Köpenick, Berlin, Germany',
                        addendum: {
                            geonames: {
                                feature_code: 'PPLX'
                            }
                        }
                    }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [13.44469, 52.49376]
                    },
                    properties: {
                        id: '7290255',
                        gid: 'geonames:neighbourhood:7290255',
                        layer: 'neighbourhood',
                        source: 'geonames',
                        source_id: '7290255',
                        name: 'Alt-Treptow',
                        accuracy: 'centroid',
                        country: 'Germany',
                        country_gid: 'whosonfirst:country:85633111',
                        country_a: 'DEU',
                        region: 'Berlin',
                        region_gid: 'whosonfirst:region:85682499',
                        region_a: 'BE',
                        localadmin: 'Berlin',
                        localadmin_gid: 'whosonfirst:localadmin:1377694153',
                        locality: 'Berlin',
                        locality_gid: 'whosonfirst:locality:101909779',
                        borough: 'Treptow-Kopenick',
                        borough_gid: 'whosonfirst:borough:1108815559',
                        neighbourhood: 'Alt-Treptow',
                        neighbourhood_gid: 'whosonfirst:neighbourhood:85928793',
                        continent: 'Europe',
                        continent_gid: 'whosonfirst:continent:102191581',
                        label: 'Alt-Treptow, Berlin, Germany',
                        addendum: {
                            geonames: {
                                feature_code: 'PPLX'
                            }
                        }
                    }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [13.576713, 52.678721]
                    },
                    properties: {
                        id: '101758637',
                        gid: 'whosonfirst:locality:101758637',
                        layer: 'locality',
                        source: 'whosonfirst',
                        source_id: '101758637',
                        name: 'Bernau bei Berlin',
                        accuracy: 'centroid',
                        country: 'Germany',
                        country_gid: 'whosonfirst:country:85633111',
                        country_a: 'DEU',
                        region: 'Brandenburg',
                        region_gid: 'whosonfirst:region:85682553',
                        region_a: 'BB',
                        county: 'Barnim',
                        county_gid: 'whosonfirst:county:102063973',
                        localadmin: 'Bernau bei Berlin',
                        localadmin_gid: 'whosonfirst:localadmin:1377694207',
                        locality: 'Bernau bei Berlin',
                        locality_gid: 'whosonfirst:locality:101758637',
                        continent: 'Europe',
                        continent_gid: 'whosonfirst:continent:102191581',
                        label: 'Bernau bei Berlin, BB, Germany',
                        addendum: {
                            concordances: {
                                'gn:id': 2950096,
                                'gp:id': 638275,
                                'qs_pg:id': 385768,
                                'wd:id': 'Q9300',
                                'wk:page': 'Bernau bei Berlin',
                                'qs:id': 104039
                            }
                        }
                    },
                    bbox: [13.467358, 52.608694, 13.668668, 52.757101]
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-88.129117, 42.973476]
                    },
                    properties: {
                        id: '101733503',
                        gid: 'whosonfirst:locality:101733503',
                        layer: 'locality',
                        source: 'whosonfirst',
                        source_id: '101733503',
                        name: 'New Berlin',
                        accuracy: 'centroid',
                        country: 'United States',
                        country_gid: 'whosonfirst:country:85633793',
                        country_a: 'USA',
                        region: 'Wisconsin',
                        region_gid: 'whosonfirst:region:85688517',
                        region_a: 'WI',
                        county: 'Waukesha County',
                        county_gid: 'whosonfirst:county:102081741',
                        localadmin: 'New Berlin',
                        localadmin_gid: 'whosonfirst:localadmin:404492511',
                        locality: 'New Berlin',
                        locality_gid: 'whosonfirst:locality:101733503',
                        continent: 'North America',
                        continent_gid: 'whosonfirst:continent:102191575',
                        label: 'New Berlin, WI, USA',
                        addendum: {
                            concordances: {
                                'fct:id': '08c8b28e-8f76-11e1-848f-cfd5bf3ef515',
                                'fips:code': '5556375',
                                'gn:id': 5264381,
                                'gp:id': 2458030,
                                'qs_pg:id': 825897,
                                'uscensus:geoid': 5556375,
                                'wd:id': 'Q1005623',
                                'wk:page': 'New Berlin, Wisconsin'
                            }
                        }
                    },
                    bbox: [-88.188994, 42.922858, -88.067252, 43.017325]
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-88.12914, 42.97259]
                    },
                    properties: {
                        id: '5264390',
                        gid: 'geonames:locality:5264390',
                        layer: 'locality',
                        source: 'geonames',
                        source_id: '5264390',
                        name: 'City of New Berlin',
                        accuracy: 'centroid',
                        country: 'United States',
                        country_gid: 'whosonfirst:country:85633793',
                        country_a: 'USA',
                        region: 'Wisconsin',
                        region_gid: 'whosonfirst:region:85688517',
                        region_a: 'WI',
                        county: 'Waukesha County',
                        county_gid: 'whosonfirst:county:102081741',
                        county_a: 'WK',
                        localadmin: 'New Berlin',
                        localadmin_gid: 'whosonfirst:localadmin:404492511',
                        locality: 'City of New Berlin',
                        locality_gid: 'geonames:locality:5264390',
                        continent: 'North America',
                        continent_gid: 'whosonfirst:continent:102191575',
                        label: 'City of New Berlin, WI, USA',
                        addendum: {
                            geonames: {
                                feature_code: 'ADM3'
                            }
                        }
                    }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [13.58708, 52.67982]
                    },
                    properties: {
                        id: '2950096',
                        gid: 'geonames:locality:2950096',
                        layer: 'locality',
                        source: 'geonames',
                        source_id: '2950096',
                        name: 'Bernau bei Berlin',
                        accuracy: 'centroid',
                        country: 'Germany',
                        country_gid: 'whosonfirst:country:85633111',
                        country_a: 'DEU',
                        region: 'Brandenburg',
                        region_gid: 'whosonfirst:region:85682553',
                        region_a: 'BB',
                        county: 'Barnim',
                        county_gid: 'whosonfirst:county:102063973',
                        county_a: 'BR',
                        localadmin: 'Bernau bei Berlin',
                        localadmin_gid: 'whosonfirst:localadmin:1377694207',
                        locality: 'Bernau bei Berlin',
                        locality_gid: 'geonames:locality:2950096',
                        continent: 'Europe',
                        continent_gid: 'whosonfirst:continent:102191581',
                        label: 'Bernau bei Berlin, BB, Germany',
                        addendum: {
                            geonames: {
                                feature_code: 'PPL'
                            }
                        }
                    }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-72.77582, 41.61139]
                    },
                    properties: {
                        id: '5282251',
                        gid: 'geonames:locality:5282251',
                        layer: 'locality',
                        source: 'geonames',
                        source_id: '5282251',
                        name: 'Town of Berlin',
                        accuracy: 'centroid',
                        country: 'United States',
                        country_gid: 'whosonfirst:country:85633793',
                        country_a: 'USA',
                        region: 'Connecticut',
                        region_gid: 'whosonfirst:region:85688629',
                        region_a: 'CT',
                        county: 'Hartford County',
                        county_gid: 'whosonfirst:county:102085381',
                        county_a: 'HA',
                        localadmin: 'Berlin',
                        localadmin_gid: 'whosonfirst:localadmin:404495869',
                        locality: 'Town of Berlin',
                        locality_gid: 'geonames:locality:5282251',
                        continent: 'North America',
                        continent_gid: 'whosonfirst:continent:102191575',
                        label: 'Town of Berlin, CT, USA',
                        addendum: {
                            geonames: {
                                feature_code: 'ADM3'
                            }
                        }
                    }
                },
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-72.782292, 41.61178]
                    },
                    properties: {
                        id: '404495869',
                        gid: 'whosonfirst:localadmin:404495869',
                        layer: 'localadmin',
                        source: 'whosonfirst',
                        source_id: '404495869',
                        name: 'Berlin',
                        accuracy: 'centroid',
                        country: 'United States',
                        country_gid: 'whosonfirst:country:85633793',
                        country_a: 'USA',
                        region: 'Connecticut',
                        region_gid: 'whosonfirst:region:85688629',
                        region_a: 'CT',
                        county: 'Hartford County',
                        county_gid: 'whosonfirst:county:102085381',
                        localadmin: 'Berlin',
                        localadmin_gid: 'whosonfirst:localadmin:404495869',
                        continent: 'North America',
                        continent_gid: 'whosonfirst:continent:102191575',
                        label: 'Berlin, CT, USA',
                        addendum: {
                            concordances: {
                                'uscensus:geoid': 900304300
                            }
                        }
                    },
                    bbox: [-72.840244, 41.554195, -72.711134, 41.652706]
                }
            ],
            bbox: [-88.188994, 41.554195, 13.760469, 52.757101]
        }
    }).as('openRouteServiceSearchRequest')
}

export const interceptWalkthroughORS = () => {
    cy.intercept('https://api.openrouteservice.org/geocode/autocomplete?*', {
        body: {
            geocoding: {
                version: '0.2',
                attribution: 'https://openrouteservice.org/terms-of-service/#attribution-geocode',
                query: {
                    text: 'Ventotene',
                    parser: 'pelias',
                    parsed_text: {
                        subject: 'Ventotene',
                        locality: 'Ventotene'
                    },
                    size: 10,
                    layers: [
                        'address',
                        'venue',
                        'neighbourhood',
                        'locality',
                        'borough',
                        'localadmin',
                        'county',
                        'macrocounty'
                    ],
                    private: false,
                    lang: {
                        name: 'English',
                        iso6391: 'en',
                        iso6393: 'eng',
                        via: 'header',
                        defaulted: false
                    },
                    querySize: 20
                },
                engine: {
                    name: 'Pelias',
                    author: 'Mapzen',
                    version: '1.0'
                },
                timestamp: 1773225877895
            },
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [13.430873, 40.796962]
                    },
                    properties: {
                        id: '101802469',
                        gid: 'whosonfirst:locality:101802469',
                        layer: 'locality',
                        source: 'whosonfirst',
                        source_id: '101802469',
                        name: 'Ventotene',
                        accuracy: 'centroid',
                        country: 'Italy',
                        country_gid: 'whosonfirst:country:85633253',
                        country_a: 'ITA',
                        macroregion: 'Lazio',
                        macroregion_gid: 'whosonfirst:macroregion:404227517',
                        region: 'Latina',
                        region_gid: 'whosonfirst:region:85685467',
                        region_a: 'LT',
                        localadmin: 'Ventotene',
                        localadmin_gid: 'whosonfirst:localadmin:404461861',
                        locality: 'Ventotene',
                        locality_gid: 'whosonfirst:locality:101802469',
                        continent: 'Europe',
                        continent_gid: 'whosonfirst:continent:102191581',
                        label: 'Ventotene, LT, Italy',
                        addendum: {
                            concordances: {
                                'fct:id': '12b99f9c-8f76-11e1-848f-cfd5bf3ef515',
                                'gn:id': 3164577,
                                'gp:id': 725755,
                                'qs_pg:id': 347497,
                                'wd:id': 'Q128230',
                                'qs:id': 1031268
                            }
                        }
                    },
                    bbox: [13.4277562668, 40.7941657683, 13.4349264985, 40.8041050708]
                }
            ],
            bbox: [12.52571, 40.7710999, 13.558462, 41.947441]
        }
    }).as('openRouteServiceWalkthroughRequest')
}
