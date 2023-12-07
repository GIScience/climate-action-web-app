import {ComponentFixture, TestBed} from '@angular/core/testing'

import {PluginParameterComponent} from './plugin-parameter.component'
import {HttpClientModule} from '@angular/common/http'
import {FormlyModule} from '@ngx-formly/core'
import {ReactiveFormsModule} from '@angular/forms'
import {NullTypeComponent} from '../../types/null.type'
import {ArrayTypeComponent} from '../../types/array.type'
import {ObjectTypeComponent} from '../../types/object.type'
import {MultiSchemaTypeComponent} from '../../types/multischema.type'
import {FormlyMatDatepickerModule} from '@ngx-formly/material/datepicker'
import {FormlyMaterialModule} from '@ngx-formly/material'
import {MatDatepickerModule} from '@angular/material/datepicker'
import {MomentDateModule} from '@angular/material-moment-adapter'
import {MAT_DATE_FORMATS} from '@angular/material/core'
import {BrowserAnimationsModule} from '@angular/platform-browser/animations'

describe('PluginParameterComponent', () => {
    let component: PluginParameterComponent
    let fixture: ComponentFixture<PluginParameterComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                FormlyModule.forRoot({
                    validationMessages: [
                        {name: 'required', message: 'This field is required'}
                    ],
                    types: [
                        {name: 'null', component: NullTypeComponent, wrappers: ['form-field']},
                        {name: 'array', component: ArrayTypeComponent},
                        {name: 'object', component: ObjectTypeComponent},
                        {name: 'multischema', component: MultiSchemaTypeComponent}
                    ]
                }),
                BrowserAnimationsModule,
                FormlyMatDatepickerModule,
                FormlyMaterialModule,
                MomentDateModule,
                MatDatepickerModule,
                PluginParameterComponent,
                ReactiveFormsModule,
                HttpClientModule
            ],
            providers: [
                {
                    provide: MAT_DATE_FORMATS, useValue: {
                        parse: {
                            dateInput: 'LL'
                        },
                        display: {
                            dateInput: 'YYYY-MM-DD',
                            monthYearLabel: 'YYYY',
                            dateA11yLabel: 'LL',
                            monthYearA11yLabel: 'YYYY'
                        }
                    }
                }
            ]
        })
        fixture = TestBed.createComponent(PluginParameterComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should create', () => {
        expect(component).toBeTruthy()
    })

    it('should interpret operator schema', () => {
        component.plugin = {
            'name': 'testplugin',
            'icon': '',
            'version': '0.0.1',
            'concerns': [],
            'purpose': '',
            'methodology': '',
            'sources': [],
            'plugin_id': 'testplugin',
            // @ts-ignore possible type mismatch
            'operator_schema': test_schema,
            'library_version': '2.6.2'
        }

        component.ngOnChanges()
        fixture.detectChanges()

        expect(component.highlightedFeatures).toEqual([])
        expect(component.aoiAttribute).toBe('blueprint_aoi')
        expect(component.fields.map((x) => x.key))
            .toEqual([
                'blueprint_bool',
                'blueprint_int',
                'blueprint_float',
                'blueprint_string',
                'blueprint_date',
                'blueprint_select',
                'blueprint_select_multi'])
        expect(component.selectOptions['Option'].map((x) => x.label))
            .toEqual([
                'Option 1',
                'Option 2'
            ])
    })

    const test_schema = {
        '$defs': {
            'Feature_MultiPolygon_Union_Dict__NoneType__': {
                'properties': {
                    'bbox': {
                        'anyOf': [
                            {
                                'maxItems': 4,
                                'minItems': 4,
                                'prefixItems': [
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    }
                                ],
                                'type': 'array'
                            },
                            {
                                'maxItems': 6,
                                'minItems': 6,
                                'prefixItems': [
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    }
                                ],
                                'type': 'array'
                            },
                            {
                                'type': 'null'
                            }
                        ],
                        'default': null,
                        'title': 'Bbox'
                    },
                    'type': {
                        'const': 'Feature',
                        'title': 'Type'
                    },
                    'geometry': {
                        'anyOf': [
                            {
                                '$ref': '#/$defs/MultiPolygon'
                            },
                            {
                                'type': 'null'
                            }
                        ]
                    },
                    'properties': {
                        'anyOf': [
                            {
                                'type': 'object'
                            },
                            {
                                'type': 'null'
                            }
                        ],
                        'title': 'Properties'
                    },
                    'id': {
                        'anyOf': [
                            {
                                'type': 'integer'
                            },
                            {
                                'type': 'string'
                            },
                            {
                                'type': 'null'
                            }
                        ],
                        'default': null,
                        'title': 'Id'
                    }
                },
                'required': [
                    'type',
                    'geometry',
                    'properties'
                ],
                'title': 'Feature[MultiPolygon, Union[Dict, NoneType]]',
                'type': 'object'
            },
            'MultiPolygon': {
                'description': 'MultiPolygon Model',
                'properties': {
                    'bbox': {
                        'anyOf': [
                            {
                                'maxItems': 4,
                                'minItems': 4,
                                'prefixItems': [
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    }
                                ],
                                'type': 'array'
                            },
                            {
                                'maxItems': 6,
                                'minItems': 6,
                                'prefixItems': [
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    },
                                    {
                                        'type': 'number'
                                    }
                                ],
                                'type': 'array'
                            },
                            {
                                'type': 'null'
                            }
                        ],
                        'default': null,
                        'title': 'Bbox'
                    },
                    'type': {
                        'const': 'MultiPolygon',
                        'title': 'Type'
                    },
                    'coordinates': {
                        'items': {
                            'items': {
                                'items': {
                                    'anyOf': [
                                        {
                                            'maxItems': 2,
                                            'minItems': 2,
                                            'prefixItems': [
                                                {
                                                    'type': 'number'
                                                },
                                                {
                                                    'type': 'number'
                                                }
                                            ],
                                            'type': 'array'
                                        },
                                        {
                                            'maxItems': 3,
                                            'minItems': 3,
                                            'prefixItems': [
                                                {
                                                    'type': 'number'
                                                },
                                                {
                                                    'type': 'number'
                                                },
                                                {
                                                    'type': 'number'
                                                }
                                            ],
                                            'type': 'array'
                                        }
                                    ]
                                },
                                'minItems': 4,
                                'type': 'array'
                            },
                            'type': 'array'
                        },
                        'title': 'Coordinates',
                        'type': 'array'
                    }
                },
                'required': [
                    'type',
                    'coordinates'
                ],
                'title': 'MultiPolygon',
                'type': 'object'
            },
            'Option': {
                'enum': [
                    'Option 1',
                    'Option 2'
                ],
                'title': 'Option',
                'type': 'string'
            }
        },
        'properties': {
            'blueprint_bool': {
                'description': 'A required boolean parameter.',
                'examples': [
                    true
                ],
                'title': 'Boolean Input',
                'type': 'boolean'
            },
            'blueprint_int': {
                'anyOf': [
                    {
                        'exclusiveMaximum': 100,
                        'exclusiveMinimum': 0,
                        'type': 'integer'
                    },
                    {
                        'type': 'null'
                    }
                ],
                'default': 3,
                'description': 'An optional integer parameter.',
                'examples': [
                    3
                ],
                'title': 'Integer Input'
            },
            'blueprint_float': {
                'anyOf': [
                    {
                        'exclusiveMaximum': 4,
                        'exclusiveMinimum': 0.5,
                        'type': 'number'
                    },
                    {
                        'type': 'null'
                    }
                ],
                'default': 2.1,
                'description': 'An optional floating point parameter.',
                'examples': [
                    2.1
                ],
                'title': 'Float Input'
            },
            'blueprint_string': {
                'anyOf': [
                    {
                        'type': 'string'
                    },
                    {
                        'type': 'null'
                    }
                ],
                'default': 'John Doe',
                'description': 'An optional string parameter.',
                'examples': [
                    'John Doe'
                ],
                'title': 'String Input'
            },
            'blueprint_date': {
                'anyOf': [
                    {
                        'format': 'date',
                        'type': 'string'
                    },
                    {
                        'type': 'null'
                    }
                ],
                'default': '2020-01-01',
                'description': 'An optional date parameter.',
                'examples': [
                    '2020-01-01'
                ],
                'title': 'Date Input'
            },
            'blueprint_select': {
                'anyOf': [
                    {
                        '$ref': '#/$defs/Option'
                    },
                    {
                        'type': 'null'
                    }
                ],
                'default': 'Option 2',
                'description': 'An optional selection parameter. The user can choose one of the available options.',
                'examples': [
                    'Option 2'
                ],
                'title': 'Selection Input'
            },
            'blueprint_select_multi': {
                'anyOf': [
                    {
                        'items': {
                            '$ref': '#/$defs/Option'
                        },
                        'type': 'array'
                    },
                    {
                        'type': 'null'
                    }
                ],
                'default': [
                    'Option 2'
                ],
                'description': 'An optional selection parameter. The user can choose multiple of the available options.',
                'examples': [
                    [
                        'Option 2'
                    ]
                ],
                'title': 'Multi-Selection Input'
            },
            'blueprint_aoi': {
                'allOf': [
                    {
                        '$ref': '#/$defs/Feature_MultiPolygon_Union_Dict__NoneType__'
                    }
                ],
                'description': 'A required area of interest parameter.',
                'examples': [
                    {
                        'geometry': {
                            'coordinates': [
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
                            'type': 'MultiPolygon'
                        },
                        'properties': {},
                        'type': 'Feature'
                    }
                ],
                'title': 'Area of Interest Input'
            }
        },
        'required': [
            'blueprint_bool',
            'blueprint_aoi'
        ],
        'title': 'BlueprintComputeInput',
        'type': 'object'
    }
})
