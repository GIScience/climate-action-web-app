import { cypressEnvironment } from './cypress-environment'

export const interceptORS = () => {
    cy.intercept('GET', 'https://api.openrouteservice.org/geocode/autocomplete?*').as('openRouteServiceRequest')
}

export const mockPluginsList = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/plugin`, {
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
                plugin_id: 'plugin_blueprint',
                library_version: '5.1.0'
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
                plugin_id: 'hiwalk',
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
                library_version: '6.0.2'
            }
        ]
    }).as('getPlugins')
}

export const mockPluginsListWithoutBlueprint = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/plugin`, {
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
                plugin_id: 'hiwalk',
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
                library_version: '6.0.2'
            }
        ]
    }).as('getPluginsWithoutBlueprint')
}

export const mockPluginBlueprint = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/plugin/plugin_blueprint`, {
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
            plugin_id: 'plugin_blueprint',
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
            library_version: '5.1.0'
        }
    }).as('getPluginBlueprint')
}

export const mockPluginHiWalk = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/plugin/hiwalk`, {
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
            plugin_id: 'hiwalk',
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
            library_version: '6.0.2'
        }
    }).as('getPluginHiWalk')
}

export const mockPostPluginRun = () => {
    cy.intercept('POST', `${cypressEnvironment.apiBasePath}/plugin/hiwalk`, {
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
            timestamp: '2025-06-10T12:26:34.929303',
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
                    modality: 'MAP_LAYER_GEOJSON',
                    primary: true,
                    tags: [],
                    file_path: '/tmp/67bc4e3e-605b-4baa-8d18-df733d37f6c0ghd04ds1/walkable.geojson',
                    summary: 'Who shares this path with me?',
                    description:
                        'Paths exclusively for pedestrians are safer and more comfortable than paths shared with bikes or, even worse, fast\nmotorised traffic.',
                    correlation_uuid: '67bc4e3e-605b-4baa-8d18-df733d37f6c0',
                    store_id: '40368c53-5c5d-4070-b6c8-a6ec2b630d27_walkable.geojson',
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
                    modality: 'MAP_LAYER_GEOJSON',
                    primary: true,
                    tags: [],
                    file_path: '/tmp/67bc4e3e-605b-4baa-8d18-df733d37f6c0ghd04ds1/pavement_quality.geojson',
                    summary: 'Can I walk comfortably on this surface?',
                    description:
                        "A path's surface quality refers to how safe and comfortable it is for walking. A smooth, solid surface is especially important for people with limited mobility, as well as for those using wheelchairs, walking frames, or prams/strollers",
                    correlation_uuid: '67bc4e3e-605b-4baa-8d18-df733d37f6c0',
                    store_id: 'a5bbab88-21a6-4bc9-a1c2-155a446c6ea7_pavement_quality.geojson',
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
                    file_path:
                        '/tmp/67bc4e3e-605b-4baa-8d18-df733d37f6c0ghd04ds1/aggregation_aoi_category_stacked_bar.json',
                    summary: 'How is the total length of paths distributed across the path categories?',
                    description: null,
                    correlation_uuid: '67bc4e3e-605b-4baa-8d18-df733d37f6c0',
                    store_id: '761e46a7-3cdb-4068-b477-7e331c5eccfe_aggregation_aoi_category_stacked_bar.json',
                    attachments: null
                },
                {
                    name: 'Distribution of Surface Quality',
                    modality: 'CHART_PLOTLY',
                    primary: true,
                    tags: [],
                    file_path:
                        '/tmp/67bc4e3e-605b-4baa-8d18-df733d37f6c0ghd04ds1/aggregation_aoi_quality_stacked_bar.json',
                    summary: 'How is the total length of paths distributed across the surface quality categories?',
                    description: null,
                    correlation_uuid: '67bc4e3e-605b-4baa-8d18-df733d37f6c0',
                    store_id: 'a20d6a62-9970-42e2-8308-1213fdcadbc8_aggregation_aoi_quality_stacked_bar.json',
                    attachments: null
                }
            ],
            plugin_info: {
                plugin_id: 'hiwalk',
                plugin_version: '2.0.1'
            },
            status: 'SUCCESS',
            message: null,
            artifact_errors: {}
        }
    }).as('getPluginHiWalkComputation')
}

export const mockPluginBlueprint404 = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/plugin/plugin_blueprint`, {
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
            timestamp: '2024-12-17T08:55:23.807074Z',
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
                    file_path: '/tmp/8649e714-f29d-423f-85ce-cd55f4e5022aqsjobeas/markdown.md',
                    summary: 'A JSON-block of the input parameters',
                    description: null,
                    correlation_uuid: '8649e714-f29d-423f-85ce-cd55f4e5022a',
                    store_id: '73fb8180-efb4-43b7-8d69-f223d5473dc7_markdown.md',
                    attachments: {}
                },
                {
                    name: 'Character Count',
                    modality: 'TABLE',
                    primary: true,
                    tags: ['input'],
                    file_path: '/tmp/8649e714-f29d-423f-85ce-cd55f4e5022aqsjobeas/table.csv',
                    summary: 'The table lists the number of occurrences for each character in the input parameters.',
                    description: 'A table with two columns.',
                    correlation_uuid: '8649e714-f29d-423f-85ce-cd55f4e5022a',
                    store_id: '2b983131-5bf9-4cdb-9c36-f6e910817407_table.csv',
                    attachments: {}
                }
            ],
            plugin_info: {
                plugin_id: 'plugin_blueprint',
                plugin_version: '0.3.0'
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
            timestamp: new Date('2023-09-27T16:42:52+01:00'),
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
                    modality: 'MAP_LAYER_GEOTIFF',
                    primary: true,
                    file_path: 'cypress/fixtures/sample_raster_blueprint.tiff',
                    summary: 'A land-use and land-cover classification of a user defined area.',
                    description: 'The classification is created using a deep learning model.',
                    correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                    store_id: 'a126bc7d-1236-4459-97d8-65afc529053e_raster_blueprint.tiff',
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
                name: 'Plugin Blueprint',
                plugin_id: 'plugin_blueprint'
            },
            status: 'SUCCESS',
            message: '-'
        }
    }).as('getGeoTiffComputation')
}

export const mockGeoJsonComputation = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/store/3495b256-6ebc-4cd1-a2f5-8216f57f7f85/metadata`, {
        body: {
            correlation_uuid: '3495b256-6ebc-4cd1-a2f5-8216f57f7f85',
            timestamp: new Date('2023-09-27T16:42:52+01:00'),
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
                    modality: 'MAP_LAYER_GEOJSON',
                    primary: true,
                    file_path: 'cypress/fixtures/sample_vector_blueprint.geojson',
                    summary:
                        'Connectivity of path segments:\n\nThe map shows how accessible the locations surrounding each path are. High connectivity for a given path means a high share of the surrounding paths can be reached in the maximum trip duration.\n\nMore specifically, we define connectivity as the proportion of accessible locations out of the total number of locations in an area of interest (AOI). The AOI includes all the road intersections that can be reached from a given point traveling at the walking speed for the maximum trip duration in a straight line (\"as the crow flies\"). A target location is considered accessible if the actual walking distance through the street network is smaller or equal to the radius of the AOI.\n\nWhen calculating connectivity, it is possible to take into account that people are more likely to walk shorter rather than longer distances, and therefore give more weight to closer locations. For more details see the description below.\n\n\n',
                    description:
                        'For each segment the connectivity is calculated as:\n\n`Connectivity = #(Segments in AOI) / ∑(Weighting of reachable segments),`\n\nwhere the AOI is centred on the root segment with a radius corresponding to the maximum walking distance:\n\n`Maximum walking distance = Walking speed * Maximum trip time`\n\nand a destination segment in the AOI is counted as reachable if:\n\n`Actual walking distance ≤ Maximum walking distance`\n\nThe weighting of the reachable segments is determined from the beeline distance to the root segment using a distance decay function chosen in the input. One can choose between:\n\nNo decay:\n* `w(d) = 1`\n\nPolynomial decay ([Frank et al. 2010](https://bjsm.bmj.com/content/44/13/924)):\n* `w(d) =`\n  * `[335.9229 * d⁵ - 1327.84 * d⁴ + 1802.56 * d³ - 935.68 * d² + 61.92 * d + 100.1072] / 100` if `d ≤ 1.5`\n  * `0` if `d > 1.5`\n\n(Default) A step function ([Xia et al. 2018](https://www.mdpi.com/2071-1050/10/11/3879/pdf?version=1540460686)):\n* `w(d) =`\n  * `1 if d < 0.4`\n  * `0.6 if d < 0.8`\n  * `0.25 if d < 1.2`\n  * `0.08 if d < 1.8`\n  * `0 if d ≥ 1.8`\n\nwhere `w` is the weighting and `d` the beeline distance in kilometers.',
                    correlation_uuid: '3495b256-6ebc-4cd1-a2f5-8216f57f7f85',
                    store_id: '2075e569-8576-4842-ba7a-13f703275da3_raster_blueprint.geojson',
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
                name: 'Plugin Blueprint',
                plugin_id: 'plugin_blueprint'
            },
            status: 'SUCCESS',
            message: '-'
        }
    }).as('getGeoJsonComputation')
}

export const mockSimpleGeoJsonComputation = () => {
    cy.intercept(`${cypressEnvironment.apiBasePath}/store/1cfd2634-1724-43a2-ab1e-6466ba433364/metadata`, {
        body: {
            correlation_uuid: '1cfd2634-1724-43a2-ab1e-6466ba433364',
            timestamp: new Date('2023-09-27T16:42:52+01:00'),
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
                    modality: 'MAP_LAYER_GEOJSON',
                    primary: true,
                    file_path: 'cypress/fixtures/sample_vector_blueprint.geojson',
                    summary:
                        'Connectivity of path segments:\n\nThe map shows how accessible the locations surrounding each path are. High connectivity for a given path means a high share of the surrounding paths can be reached in the maximum trip duration.\n\nMore specifically, we define connectivity as the proportion of accessible locations out of the total number of locations in an area of interest (AOI). The AOI includes all the road intersections that can be reached from a given point traveling at the walking speed for the maximum trip duration in a straight line (\"as the crow flies\"). A target location is considered accessible if the actual walking distance through the street network is smaller or equal to the radius of the AOI.\n\nWhen calculating connectivity, it is possible to take into account that people are more likely to walk shorter rather than longer distances, and therefore give more weight to closer locations. For more details see the description below.\n\n\n',
                    description:
                        'For each segment the connectivity is calculated as:\n\n`Connectivity = #(Segments in AOI) / ∑(Weighting of reachable segments),`\n\nwhere the AOI is centred on the root segment with a radius corresponding to the maximum walking distance:\n\n`Maximum walking distance = Walking speed * Maximum trip time`\n\nand a destination segment in the AOI is counted as reachable if:\n\n`Actual walking distance ≤ Maximum walking distance`\n\nThe weighting of the reachable segments is determined from the beeline distance to the root segment using a distance decay function chosen in the input. One can choose between:\n\nNo decay:\n* `w(d) = 1`\n\nPolynomial decay ([Frank et al. 2010](https://bjsm.bmj.com/content/44/13/924)):\n* `w(d) =`\n  * `[335.9229 * d⁵ - 1327.84 * d⁴ + 1802.56 * d³ - 935.68 * d² + 61.92 * d + 100.1072] / 100` if `d ≤ 1.5`\n  * `0` if `d > 1.5`\n\n(Default) A step function ([Xia et al. 2018](https://www.mdpi.com/2071-1050/10/11/3879/pdf?version=1540460686)):\n* `w(d) =`\n  * `1 if d < 0.4`\n  * `0.6 if d < 0.8`\n  * `0.25 if d < 1.2`\n  * `0.08 if d < 1.8`\n  * `0 if d ≥ 1.8`\n\nwhere `w` is the weighting and `d` the beeline distance in kilometers.',
                    correlation_uuid: '1cfd2634-1724-43a2-ab1e-6466ba433364',
                    store_id: '4d715d0f-a3ec-4d9c-8aed-d01a4e07165a_block_blueprint.geojson',
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
                name: 'Plugin Blueprint',
                plugin_id: 'plugin_blueprint'
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

export const mockGeoJson = () => {
    cy.intercept(
        `${cypressEnvironment.apiBasePath}/store/3495b256-6ebc-4cd1-a2f5-8216f57f7f85/2075e569-8576-4842-ba7a-13f703275da3_raster_blueprint.geojson`,
        {
            fixture: 'sample_vector_blueprint.geojson'
        }
    ).as('getGeoJson')
}

export const mockSimpleGeoJson = () => {
    cy.intercept(
        `${cypressEnvironment.apiBasePath}/store/1cfd2634-1724-43a2-ab1e-6466ba433364/4d715d0f-a3ec-4d9c-8aed-d01a4e07165a_block_blueprint.geojson`,
        {
            fixture: 'simple_vector_blueprint.geojson'
        }
    ).as('getSimpleGeoJson')
}
