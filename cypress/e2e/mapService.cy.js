describe('mapService', () => {
    beforeEach(() => {
        cy.visit('/')
    })

    it('display the layerswitcher', () => {
        cy.get('.ol-layerswitcher').should('exist')

        const expectedTexts = ['OSM Carto', 'Bing Aerial Imagery', 'HeiGIT Carto'];

        cy.get('.ol-layerswitcher li.baselayer label span')
            .should('have.length', 3)
            .each((item) => {
                cy.wrap(item).invoke('text').then((text) => {
                    expect(expectedTexts).to.include(text);
                });
            });
    })

    it('remembers the selected layer', () => {
        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.get('.ol-layerswitcher li.baselayer label span').eq(1).click()

        cy.get('.ol-layerswitcher li.baselayer').eq(1).should('have.class', 'ol-visible')

        cy.reload(true)

        cy.get('.ol-layerswitcher li.baselayer').eq(1).should('have.class', 'ol-visible')

        cy.get('.ol-layerswitcher li.baselayer label span').eq(1).invoke('text').then((text) => {
            cy.location('origin').then((origin) => {
                cy.getAllLocalStorage().then((result) => {
                    expect(result[origin].selected_map_layer).to.equal(text);
                });
            });
        });
    })

    it('remembers the selected layer even when a geotiff is loaded', () => {
        cy.intercept('/api/v1/gateway/plugin/', {
            body:
                [
                    {
                        'name': 'Plugin Blueprint',
                        'authors': [
                            {
                                'name': 'Moritz Schott',
                                'affiliation': 'HeiGIT gGmbH',
                                'website': 'https://heigit.org/heigit-team/'
                            },
                            {
                                'name': 'Maciej Adamiak',
                                'affiliation': 'Consultant at HeiGIT gGmbH',
                                'website': 'https://heigit.org/heigit-team/'
                            }
                        ],
                        'purpose': '',
                        'methodology': '',
                        'sources': [
                            {
                                'pages': '14-15',
                                'volume': '2',
                                'journal': 'J. Geophys. Res.',
                                'year': '1954',
                                'title': 'Nothing Particular',
                                'author': 'J. G. Smith and H. K. Weston',
                                'ENTRYTYPE': 'article',
                                'ID': 'smit54'
                            }
                        ],
                        'plugin_id': 'plugin_blueprint',
                        'library_version': '5.1.0'
                    }
                ]
        }).as('getPlugins')

        cy.intercept('/api/v1/gateway/plugin/plugin_blueprint', {
            body: 
                {
                    'name': 'Plugin Blueprint',
                    'authors': [
                        {
                            'name': 'Moritz Schott',
                            'affiliation': 'HeiGIT gGmbH',
                            'website': 'https://heigit.org/heigit-team/'
                        },
                        {
                            'name': 'Maciej Adamiak',
                            'affiliation': 'Consultant at HeiGIT gGmbH',
                            'website': 'https://heigit.org/heigit-team/'
                        }
                    ],
                    'purpose': '',
                    'sources': [
                        {
                            'pages': '14-15',
                            'volume': '2',
                            'journal': 'J. Geophys. Res.',
                            'year': '1954',
                            'title': 'Nothing Particular',
                            'author': 'J. G. Smith and H. K. Weston',
                            'ENTRYTYPE': 'article',
                            'ID': 'smit54'
                        },
                    ],
                    'methodology': '',
                    'plugin_id': 'plugin_blueprint',
                    'library_version': '5.1.0'
                }
           
        }).as('getPluginDetails')

        cy.intercept('/api/v1/gateway/store/8a897536-c4b4-4e5a-9d70-50430183ac66/metadata/', {
            body: {
                'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                'timestamp': new Date('2023-09-27T16:42:52+01:00'),
                'params': {
                    'bool_blueprint': true,
                    'aoi': {
                        'type': 'Feature',
                        'geometry': {
                            'type': 'MultiPolygon',
                            'coordinates': [
                                [
                                    [
                                        [
                                            116.3500629,
                                            39.9222736
                                        ],
                                        [
                                            116.3505557,
                                            39.9109802
                                        ],
                                        [
                                            116.3502807,
                                            39.9081009
                                        ],
                                        [
                                            116.3503101,
                                            39.9056782
                                        ],
                                        [
                                            116.3505186,
                                            39.901277
                                        ],
                                        [
                                            116.3509736,
                                            39.9004266
                                        ],
                                        [
                                            116.3518984,
                                            39.8993272
                                        ],
                                        [
                                            116.3527821,
                                            39.8986917
                                        ],
                                        [
                                            116.3540159,
                                            39.8981715
                                        ],
                                        [
                                            116.3540312,
                                            39.8978679
                                        ],
                                        [
                                            116.3681236,
                                            39.8983514
                                        ],
                                        [
                                            116.3672525,
                                            39.9226073
                                        ],
                                        [
                                            116.3500629,
                                            39.9222736
                                        ]
                                    ]
                                ]
                            ],
                        },
                        'properties': {
                            'osm_id': -13210713,
                            'boundary': 'administrative',
                            'admin_level': 8,
                            'parents': [
                                -15887483,
                                -912940,
                                -270056
                            ],
                            'name': '金融街街道',
                            'local_name': '金融街街道',
                            'name_en': null,
                            'id': 'uzyj1dj'
                        }
                    }
                },
                'plugin_info': {
                    'name': 'Plugin Blueprint',
                    'plugin_id': 'plugin_blueprint'
                },
                'artifacts': [
                    {
                        'name': 'LULC Classification',
                        'modality': 'MAP_LAYER_GEOTIFF',
                        'primary': true,
                        'file_path': 'cypress/fixtures/sample_raster_blueprint.tiff',
                        'summary': 'A land-use and land-cover classification of a user defined area.',
                        'description': 'The classification is created using a deep learning model.',
                        'correlation_uuid': '8a897536-c4b4-4e5a-9d70-50430183ac66',
                        'store_id': 'a126bc7d-1236-4459-97d8-65afc529053e_raster_blueprint.tiff',
                        'attachments': {
                            'LEGEND': {
                                'legend_data': {
                                    'unknown': '#000',
                                    'built-up': '#f00',
                                    'forest': '#4dc800',
                                    'water': '#82c8fa',
                                    'farmland': '#ffff50',
                                    'permanent_crops': '#e68000',
                                    'grass': '#cdebb0'
                                },
                                'legend_type': 'DISCRETE'
                            }
                        }
                    }
                ]
            }
        }).as('getComputations')

        cy.intercept('/api/v1/gateway/store/8a897536-c4b4-4e5a-9d70-50430183ac66/a126bc7d-1236-4459-97d8-65afc529053e_raster_blueprint.tiff', {
            fixture: 'sample_raster_blueprint.tiff'
        }).as('getGeoTIFF')

        cy.window().then((win) => {
            win.localStorage.setItem('plugin_runs', JSON.stringify([{
                correlation_uuid: '8a897536-c4b4-4e5a-9d70-50430183ac66',
                pluginId: 'plugin_blueprint',
                pluginName: 'Plugin Blueprint',
                timestamp: '2024-08-07T12:43:08.373768',
                status: 'completed'
            }]))
        })

        cy.reload(true)

        cy.wait('@getPlugins')

        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.wait('@getPluginDetails')

        cy.wait('@getComputations')

        cy.get('.ol-layerswitcher li.baselayer label span').eq(1).click()
        cy.get('.ol-layerswitcher li.baselayer').eq(1).should('have.class', 'ol-visible')

        cy.get('.artifact-parent-computation').eq(0).click()
        cy.get('.artifact-child-computation').eq(0).click()

        cy.wait('@getGeoTIFF')

        cy.reload(true)

        cy.wait('@getComputations')

        cy.get('.ol-layerswitcher li.baselayer').eq(1).should('have.class', 'ol-visible')

        cy.get('.ol-layerswitcher li.baselayer label span').eq(1).invoke('text').then((text) => {
            cy.location('origin').then((origin) => {
                cy.getAllLocalStorage().then((result) => {
                    expect(result[origin].selected_map_layer).to.equal(text);
                });
            });
        });
    })

    it('remembers the collapsed state', () => {
        cy.visit('dashboard/plugin/plugin_blueprint')

        cy.get('.ol-layerswitcher button').click()

        cy.get('.ol-layerswitcher').should('not.have.class', 'ol-forceopen')

        cy.wait(500)

        cy.reload(true)

        cy.wait(500)

        cy.get('.ol-layerswitcher').should('not.have.class', 'ol-forceopen')

        cy.location('origin').then((origin) => {
            cy.getAllLocalStorage().then((result) => {
                expect(result[origin]).to.deep.equal({
                    layer_switcher_collapsed: 'true',
                });
            });
        });
    })
})