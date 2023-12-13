import {ComponentFixture, TestBed} from '@angular/core/testing'

import {PluginParameterComponent} from './plugin-parameter.component'
import {HttpClientModule} from '@angular/common/http'
import {FormlyFieldConfig, FormlyModule} from '@ngx-formly/core'
import {ReactiveFormsModule} from '@angular/forms'
import {NullTypeComponent} from '../../types/null.type'
import {ArrayTypeComponent} from '../../types/array.type'
import {ObjectTypeComponent} from '../../types/object.type'
import {MultiSchemaTypeComponent} from '../../types/multischema.type'
import {FormlyMatDatepickerModule} from '@ngx-formly/material/datepicker'
import {FormlyMaterialModule} from '@ngx-formly/material'
import {MatDatepickerModule} from '@angular/material/datepicker'
import {MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateModule} from '@angular/material-moment-adapter'
import {MAT_DATE_FORMATS} from '@angular/material/core'
import {BrowserAnimationsModule} from '@angular/platform-browser/animations'
import {JSONSchema7} from 'json-schema'
import {dateTypeValidator, intTypeValidator, numericTypeValidator} from '../../app.validators'

describe('PluginParameterComponent', () => {
    let component: PluginParameterComponent
    let fixture: ComponentFixture<PluginParameterComponent>

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                FormlyModule.forRoot({
                    validators: [
                        {name: 'intType', validation: intTypeValidator},
                        {name: 'numType', validation: numericTypeValidator},
                        {name: 'dateType', validation: dateTypeValidator}
                    ],
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
                    provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS,
                    useValue: {
                        useUtc: true,
                        strict: true
                    }
                },
                {
                    provide: MAT_DATE_FORMATS,
                    useValue: {
                        parse: {
                            dateInput: 'YYYY-MM-DD'
                        },
                        display: {
                            dateInput: 'YYYY-MM-DD',
                            monthYearLabel: 'MMM YYYY',
                            dateA11yLabel: 'LL',
                            monthYearA11yLabel: 'LL'
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
            'library_version': '2.6.2',
            'attribution': 'I don"t know what this is'
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
        const expectedSchema: FormlyFieldConfig[] = [{
            key: 'blueprint_bool',
            type: 'checkbox',
            props: {
                label: 'Boolean Input',
                description: 'A required boolean parameter.',
                placeholder: 'true',
                required: true
            },
            validators: {
                validation: []
            },
            parsers: []
        },
            {
                key: 'blueprint_int',
                type: 'input',
                props: {
                    label: 'Integer Input',
                    description: 'An optional integer parameter.',
                    placeholder: '3'
                },
                validators: {
                    validation: [
                        {
                            name: 'intType',
                            options: {
                                min: 0,
                                max: 100
                            }
                        }
                    ]
                },
                parsers: []
            },
            {
                key: 'blueprint_float',
                type: 'input',
                props: {
                    label: 'Float Input',
                    description: 'An optional floating point parameter.',
                    placeholder: '2.1'
                },
                validators: {
                    validation: [
                        {
                            name: 'numType',
                            options: {
                                min: 0.5,
                                max: 4
                            }
                        }
                    ]
                },
                parsers: []
            },
            {
                key: 'blueprint_string',
                type: 'input',
                props: {
                    label: 'String Input',
                    description: 'An optional string parameter.',
                    placeholder: 'John Doe'
                },
                validators: {
                    validation: []
                },
                parsers: []
            },
            {
                key: 'blueprint_date',
                type: 'datepicker',
                props: {
                    label: 'Date Input',
                    description: 'An optional date parameter.',
                    placeholder: '2020-01-01',
                    datepickerOptions: {
                        startAt: '2020-01-01',
                        min: '1970-01-01',
                        max: new Date().toISOString().split('T')[0]
                    }
                },
                validators: {
                    validation: [{
                        name: 'dateType',
                        options: {
                            min: '1970-01-01',
                            max: new Date().toISOString().split('T')[0]
                        }
                    }]
                },
                parsers: [component.parseDate]
            },
            {
                key: 'blueprint_select',
                type: 'select',
                props: {
                    label: 'Selection Input',
                    description: 'An optional selection parameter. The user can choose one of the available options.',
                    placeholder: 'Choose',
                    options: [
                        {
                            label: 'Option 1',
                            value: 'Option 1'
                        },
                        {
                            label: 'Option 2',
                            value: 'Option 2'
                        }
                    ]
                },
                validators: {
                    validation: []
                },
                parsers: []
            },
            {
                key: 'blueprint_select_multi',
                type: 'select',
                props: {
                    label: 'Multi-Selection Input',
                    description: 'An optional selection parameter. The user can choose multiple of the available options.',
                    placeholder: 'Option 2',
                    multiple: true,
                    options: [
                        {
                            label: 'Option 1',
                            value: 'Option 1'
                        },
                        {
                            label: 'Option 2',
                            value: 'Option 2'
                        }
                    ]
                },
                validators: {
                    validation: []
                },
                parsers: []
            }]

        component.fields = component.parseFields(test_schema)
        expect(component.fields).toEqual(expectedSchema)
    })

    const test_schema: JSONSchema7 = {
        '$defs': {
            'Feature_MultiPolygon_Union_Dict__NoneType__': {'description': 'This should be ignored at all levels'},
            'MultiPolygon': {'description': 'This should be ignored at all levels'},
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
                        'maximum': 100,
                        'minimum': 0,
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
