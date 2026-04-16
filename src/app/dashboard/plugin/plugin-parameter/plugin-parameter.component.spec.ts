import { HttpClientModule } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ReactiveFormsModule } from '@angular/forms'
import { MatExpansionModule } from '@angular/material/expansion'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { Plugin } from '@app/dashboard/plugin/plugin.interface'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { popperVariation, provideTippyConfig, provideTippyLoader, tooltipVariation } from '@ngneat/helipopper/config'
import { FormlyMaterialModule } from '@ngx-formly/material'
import { FormlyMatDatepickerModule } from '@ngx-formly/material/datepicker'
import { JSONSchema7 } from 'json-schema'
import { ToastrService } from 'ngx-toastr'
import { MockToastrService } from '../../../../../jest.mocks'
import { PluginParameterComponent } from './plugin-parameter.component'

describe('PluginParameterComponent', () => {
    let component: PluginParameterComponent
    let fixture: ComponentFixture<PluginParameterComponent>
    const test_plugin = { demo_config: { aoi: {}, params: {} } } as Plugin

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                BrowserAnimationsModule,
                FormlyMatDatepickerModule,
                FormlyMaterialModule,
                MatExpansionModule,
                PluginParameterComponent,
                ReactiveFormsModule,
                HttpClientModule,
                TranslocoTestingModule.forRoot({
                    langs: {
                        en: {
                            pluginParameter: {
                                optionalAttributes: 'Optional Attributes',
                                editAdditionalParameters: 'Edit additional parameters.'
                            }
                        },
                        de: {
                            pluginParameter: {
                                optionalAttributes: 'Optional Attributes',
                                editAdditionalParameters: 'Edit additional parameters.'
                            }
                        }
                    },
                    translocoConfig: { defaultLang: 'en', availableLangs: ['en', 'de'] }
                })
            ],
            providers: [
                { provide: ToastrService, useClass: MockToastrService },
                provideTippyLoader(() => import('tippy.js')),
                provideTippyConfig({
                    defaultVariation: 'tooltip',
                    variations: {
                        tooltip: tooltipVariation,
                        popper: popperVariation
                    }
                })
            ]
        })
        fixture = TestBed.createComponent(PluginParameterComponent)
        component = fixture.componentInstance
        component.plugin = test_plugin
        fixture.detectChanges()
    })

    it('should correctly parse required boolean field', () => {
        const schema: JSONSchema7 = {
            properties: {
                bool_showcase: {
                    description: 'A required boolean parameter.',
                    examples: [true],
                    title: 'Boolean Input',
                    type: 'boolean'
                }
            },
            required: ['bool_showcase'],
            title: 'ComputeInput',
            type: 'object'
        }

        const parsed_fields = component.parseFieldsFromSchema(schema)
        const testing_json = JSON.parse(JSON.stringify(parsed_fields))
        expect(testing_json).toEqual([
            {
                type: 'object',
                props: {
                    label: 'ComputeInput'
                },
                validators: {
                    type: {
                        schemaType: ['object']
                    }
                },
                fieldGroup: [
                    {
                        type: 'boolean',
                        props: {
                            label: 'Boolean Input',
                            description: 'A required boolean parameter.',
                            placeholder: 'true'
                        },
                        key: 'bool_showcase',
                        validators: {
                            type: {
                                schemaType: ['boolean']
                            }
                        },
                        templateOptions: {
                            label: 'Boolean Input',
                            description: 'A required boolean parameter.',
                            placeholder: 'true'
                        },
                        expressions: {}
                    }
                ],
                templateOptions: {
                    label: 'ComputeInput'
                }
            }
        ])
    })

    it('should correctly parse integer fields', () => {
        const schema: JSONSchema7 = {
            properties: {
                showcase: {
                    description: 'Test description.',
                    examples: [3],
                    exclusiveMaximum: 100,
                    exclusiveMinimum: 0,
                    title: 'Test Title',
                    type: 'integer'
                }
            },
            required: ['showcase'],
            title: 'ComputeInput',
            type: 'object'
        }

        const parsed_fields = component.parseFieldsFromSchema(schema)
        const testing_json = JSON.parse(JSON.stringify(parsed_fields))
        expect(testing_json).toEqual([
            {
                type: 'object',
                props: {
                    label: 'ComputeInput'
                },
                validators: {
                    type: {
                        schemaType: ['object']
                    }
                },
                fieldGroup: [
                    {
                        type: 'integer',
                        props: {
                            label: 'Test Title',
                            description: 'Test description.',
                            exclusiveMinimum: 0,
                            exclusiveMaximum: 100,
                            placeholder: '3'
                        },
                        key: 'showcase',
                        validators: {
                            type: {
                                schemaType: ['integer']
                            }
                        },
                        templateOptions: {
                            label: 'Test Title',
                            description: 'Test description.',
                            exclusiveMinimum: 0,
                            exclusiveMaximum: 100,
                            placeholder: '3'
                        },
                        expressions: {},
                        parsers: [null]
                    }
                ],
                templateOptions: {
                    label: 'ComputeInput'
                }
            }
        ])
    })

    it('should correctly parse float fields', () => {
        const schema: JSONSchema7 = {
            properties: {
                showcase: {
                    description: 'Test description.',
                    examples: [2.1],
                    maximum: 4.0,
                    minimum: 0.5,
                    title: 'Test Title',
                    type: 'number'
                }
            },
            required: ['showcase'],
            title: 'ComputeInput',
            type: 'object'
        }

        const parsed_fields = component.parseFieldsFromSchema(schema)
        const testing_json = JSON.parse(JSON.stringify(parsed_fields))
        expect(testing_json).toEqual([
            {
                type: 'object',
                props: {
                    label: 'ComputeInput'
                },
                validators: {
                    type: {
                        schemaType: ['object']
                    }
                },
                fieldGroup: [
                    {
                        type: 'number',
                        props: {
                            label: 'Test Title',
                            description: 'Test description.',
                            min: 0.5,
                            max: 4.0,
                            placeholder: '2.1'
                        },
                        key: 'showcase',
                        validators: {
                            type: {
                                schemaType: ['number']
                            }
                        },
                        templateOptions: {
                            label: 'Test Title',
                            description: 'Test description.',
                            min: 0.5,
                            max: 4.0,
                            placeholder: '2.1'
                        },
                        expressions: {},
                        parsers: [null]
                    }
                ],
                templateOptions: {
                    label: 'ComputeInput'
                }
            }
        ])
    })

    it('should correctly parse string fields', () => {
        const schema: JSONSchema7 = {
            properties: {
                showcase: {
                    description: 'Test description.',
                    examples: ['John Doe'],
                    title: 'Test Title',
                    type: 'string'
                }
            },
            required: ['showcase'],
            title: 'ComputeInput',
            type: 'object'
        }

        const parsed_fields = component.parseFieldsFromSchema(schema)
        const testing_json = JSON.parse(JSON.stringify(parsed_fields))
        expect(testing_json).toEqual([
            {
                type: 'object',
                props: {
                    label: 'ComputeInput'
                },
                validators: {
                    type: {
                        schemaType: ['object']
                    }
                },
                fieldGroup: [
                    {
                        type: 'string',
                        props: {
                            label: 'Test Title',
                            description: 'Test description.',
                            placeholder: 'John Doe'
                        },
                        key: 'showcase',
                        defaultValue: '',
                        validators: {
                            type: {
                                schemaType: ['string']
                            }
                        },
                        templateOptions: {
                            label: 'Test Title',
                            description: 'Test description.',
                            placeholder: 'John Doe'
                        },
                        expressions: {},
                        parsers: [null]
                    }
                ],
                templateOptions: {
                    label: 'ComputeInput'
                }
            }
        ])
    })

    it('should correctly parse date fields', () => {
        const schema: JSONSchema7 = {
            properties: {
                showcase: {
                    description: 'Test description.',
                    examples: ['2020-01-01'],
                    format: 'date',
                    title: 'Test Title',
                    type: 'string'
                }
            },
            required: ['showcase'],
            title: 'ComputeInput',
            type: 'object'
        }

        const parsed_fields = component.parseFieldsFromSchema(schema)
        const testing_json = JSON.parse(JSON.stringify(parsed_fields))
        expect(testing_json).toEqual([
            {
                type: 'object',
                props: {
                    label: 'ComputeInput'
                },
                validators: {
                    type: {
                        schemaType: ['object']
                    }
                },
                fieldGroup: [
                    {
                        type: 'datepicker',
                        props: {
                            label: 'Test Title',
                            description: 'Test description.',
                            placeholder: '2020-01-01'
                        },
                        key: 'showcase',
                        validators: {},
                        defaultValue: '',
                        expressions: {},
                        templateOptions: {
                            label: 'Test Title',
                            description: 'Test description.',
                            placeholder: '2020-01-01'
                        },
                        parsers: [null]
                    }
                ],
                templateOptions: {
                    label: 'ComputeInput'
                }
            }
        ])
    })

    it('should correctly parse select fields', () => {
        const schema: JSONSchema7 = {
            $defs: {
                Option: {
                    enum: ['Option 1', 'Option 2'],
                    title: 'Option',
                    type: 'string'
                }
            },
            properties: {
                showcase: {
                    $ref: '#/$defs/Option',
                    description: 'Test description.',
                    examples: ['Option 2'],
                    title: 'Test Title'
                }
            },
            required: ['showcase'],
            title: 'ComputeInput',
            type: 'object'
        }

        const parsed_fields = component.parseFieldsFromSchema(schema)
        const testing_json = JSON.parse(JSON.stringify(parsed_fields))
        expect(testing_json).toEqual([
            {
                type: 'object',
                props: {
                    label: 'ComputeInput'
                },
                validators: {
                    type: {
                        schemaType: ['object']
                    }
                },
                fieldGroup: [
                    {
                        type: 'enum',
                        props: {
                            label: 'Test Title',
                            description: 'Test description.',
                            multiple: false,
                            options: [
                                { value: 'Option 1', label: 'Option 1' },
                                { value: 'Option 2', label: 'Option 2' }
                            ]
                        },
                        key: 'showcase',
                        defaultValue: '',
                        validators: {
                            type: {
                                schemaType: ['string']
                            }
                        },
                        templateOptions: {
                            label: 'Test Title',
                            description: 'Test description.',
                            multiple: false,
                            options: [
                                { value: 'Option 1', label: 'Option 1' },
                                { value: 'Option 2', label: 'Option 2' }
                            ]
                        },
                        parsers: [null],
                        expressions: {}
                    }
                ],
                templateOptions: {
                    label: 'ComputeInput'
                }
            }
        ])
    })

    it('should correctly parse multi-select fields', () => {
        const schema: JSONSchema7 = {
            $defs: {
                Option: {
                    enum: ['Option 1', 'Option 2'],
                    title: 'Option',
                    type: 'string'
                }
            },
            properties: {
                showcase: {
                    description: 'Test description.',
                    examples: [['Option 2']],
                    items: {
                        $ref: '#/$defs/Option'
                    },
                    title: 'Test Title',
                    type: 'array',
                    uniqueItems: true
                }
            },
            required: ['showcase'],
            title: 'ComputeInput',
            type: 'object'
        }

        const parsed_fields = component.parseFieldsFromSchema(schema)
        const testing_json = JSON.parse(JSON.stringify(parsed_fields))
        expect(testing_json).toEqual([
            {
                type: 'object',
                props: {
                    label: 'ComputeInput'
                },
                validators: {
                    type: {
                        schemaType: ['object']
                    }
                },
                fieldGroup: [
                    {
                        type: 'enum',
                        props: {
                            label: 'Test Title',
                            description: 'Test description.',
                            multiple: true,
                            uniqueItems: true,
                            options: [
                                { value: 'Option 1', label: 'Option 1' },
                                { value: 'Option 2', label: 'Option 2' }
                            ],
                            placeholder: 'Option 2'
                        },
                        key: 'showcase',
                        defaultValue: [],
                        validators: {
                            type: {
                                schemaType: ['array']
                            }
                        },
                        templateOptions: {
                            label: 'Test Title',
                            description: 'Test description.',
                            multiple: true,
                            options: [
                                { value: 'Option 1', label: 'Option 1' },
                                { value: 'Option 2', label: 'Option 2' }
                            ],
                            placeholder: 'Option 2',
                            uniqueItems: true
                        },
                        expressions: {}
                    }
                ],
                templateOptions: {
                    label: 'ComputeInput'
                }
            }
        ])
    })

    it('should correctly parse (multi-)select fields with translations', () => {
        const schema: JSONSchema7 = {
            $defs: {
                Option: {
                    enum: ['Option 1', 'Option 2', 'NonTranslatedOption'],
                    title: 'Option',
                    type: 'string',
                    // @ts-ignore Custom tag to enable translation of select fields
                    'x-translation': { 'Option 1': 'Option Eins', 'Option 2': 'Option Zwei' }
                }
            },
            properties: {
                select: {
                    $ref: '#/$defs/Option',
                    description: 'Testbeschreibung.',
                    examples: ['Option 2'],
                    title: 'Testüberschrift'
                },
                multi_select: {
                    description: 'Testbeschreibung.',
                    examples: [['Option 2']],
                    items: {
                        $ref: '#/$defs/Option'
                    },
                    title: 'Testüberschrift',
                    type: 'array',
                    uniqueItems: true
                }
            },
            required: ['select', 'multi_select'],
            title: 'ComputeInput',
            type: 'object'
        }

        const parsed_fields = component.parseFieldsFromSchema(schema)
        const testing_json = JSON.parse(JSON.stringify(parsed_fields))
        expect(testing_json).toEqual([
            {
                type: 'object',
                props: {
                    label: 'ComputeInput'
                },
                validators: {
                    type: {
                        schemaType: ['object']
                    }
                },
                fieldGroup: [
                    {
                        type: 'enum',
                        props: {
                            label: 'Testüberschrift',
                            description: 'Testbeschreibung.',
                            multiple: false,
                            options: [
                                { value: 'Option 1', label: 'Option Eins' },
                                { value: 'Option 2', label: 'Option Zwei' },
                                { value: 'NonTranslatedOption', label: 'NonTranslatedOption' }
                            ]
                        },
                        key: 'select',
                        defaultValue: '',
                        validators: {
                            type: {
                                schemaType: ['string']
                            }
                        },
                        templateOptions: {
                            label: 'Testüberschrift',
                            description: 'Testbeschreibung.',
                            multiple: false,
                            options: [
                                { value: 'Option 1', label: 'Option Eins' },
                                { value: 'Option 2', label: 'Option Zwei' },
                                { value: 'NonTranslatedOption', label: 'NonTranslatedOption' }
                            ]
                        },
                        parsers: [null],
                        expressions: {}
                    },
                    {
                        type: 'enum',
                        props: {
                            label: 'Testüberschrift',
                            description: 'Testbeschreibung.',
                            multiple: true,
                            uniqueItems: true,
                            options: [
                                { value: 'Option 1', label: 'Option Eins' },
                                { value: 'Option 2', label: 'Option Zwei' },
                                { value: 'NonTranslatedOption', label: 'NonTranslatedOption' }
                            ],
                            placeholder: 'Option 2'
                        },
                        key: 'multi_select',
                        defaultValue: [],
                        validators: {
                            type: {
                                schemaType: ['array']
                            }
                        },
                        templateOptions: {
                            label: 'Testüberschrift',
                            description: 'Testbeschreibung.',
                            multiple: true,
                            options: [
                                { value: 'Option 1', label: 'Option Eins' },
                                { value: 'Option 2', label: 'Option Zwei' },
                                { value: 'NonTranslatedOption', label: 'NonTranslatedOption' }
                            ],
                            placeholder: 'Option 2',
                            uniqueItems: true
                        },
                        expressions: {}
                    }
                ],
                templateOptions: {
                    label: 'ComputeInput'
                }
            }
        ])
    })

    it('should correctly parse mapping fields', () => {
        const schema: JSONSchema7 = {
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
                            maximum: 4.0,
                            minimum: 0.5,
                            title: 'Mediocre Float',
                            type: 'number'
                        },
                        bad: {
                            $ref: '#/$defs/Option',
                            default: 'Option 2',
                            description: 'A bad selection.',
                            examples: ['Option 2'],
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
                showcase: {
                    $ref: '#/$defs/Mapping',
                    description: 'Test description.',
                    examples: [
                        {
                            bad: 'Option 2',
                            good: 'John Doe',
                            mediocre: 2.1
                        }
                    ],
                    title: 'Test Title'
                }
            },
            required: ['showcase'],
            title: 'ComputeInput',
            type: 'object'
        }

        const parsed_fields = component.parseFieldsFromSchema(schema)
        const testing_json = JSON.parse(JSON.stringify(parsed_fields))
        expect(testing_json).toEqual([
            {
                type: 'object',
                props: {
                    label: 'ComputeInput'
                },
                validators: {
                    type: {
                        schemaType: ['object']
                    }
                },
                fieldGroup: [
                    {
                        type: 'dialog',
                        fieldGroup: [
                            {
                                props: {
                                    label: 'Test Title',
                                    description: 'Test description.'
                                },
                                fieldGroup: [
                                    {
                                        type: 'string',
                                        props: {
                                            label: 'String for Good',
                                            description: 'A good string.',
                                            placeholder: 'John Doe'
                                        },
                                        key: 'good',
                                        defaultValue: '',
                                        validators: {
                                            type: {
                                                schemaType: ['string']
                                            }
                                        },
                                        templateOptions: {
                                            label: 'String for Good',
                                            description: 'A good string.',
                                            placeholder: 'John Doe'
                                        },
                                        parsers: [null],
                                        expressions: {}
                                    },
                                    {
                                        type: 'number',
                                        props: {
                                            label: 'Mediocre Float',
                                            description: 'A mediocre float.',
                                            min: 0.5,
                                            max: 4.0,
                                            placeholder: '2.1'
                                        },
                                        key: 'mediocre',
                                        defaultValue: 2.1,
                                        validators: {
                                            type: {
                                                schemaType: ['number']
                                            }
                                        },
                                        templateOptions: {
                                            label: 'Mediocre Float',
                                            description: 'A mediocre float.',
                                            min: 0.5,
                                            max: 4.0,
                                            placeholder: '2.1'
                                        },
                                        parsers: [null]
                                    },
                                    {
                                        type: 'enum',
                                        props: {
                                            label: 'Bad Selection',
                                            description: 'A bad selection.',
                                            multiple: false,
                                            options: [
                                                { value: 'Option 1', label: 'Option 1' },
                                                { value: 'Option 2', label: 'Option 2' }
                                            ]
                                        },
                                        key: 'bad',
                                        defaultValue: 'Option 2',
                                        validators: {
                                            type: {
                                                schemaType: ['string']
                                            }
                                        },
                                        templateOptions: {
                                            label: 'Bad Selection',
                                            description: 'A bad selection.',
                                            multiple: false,
                                            options: [
                                                { value: 'Option 1', label: 'Option 1' },
                                                { value: 'Option 2', label: 'Option 2' }
                                            ]
                                        },
                                        parsers: [null]
                                    }
                                ]
                            }
                        ],
                        key: 'showcase',
                        defaultValue: {},
                        validators: {
                            type: {
                                schemaType: ['object']
                            }
                        },
                        props: {
                            label: 'Test Title',
                            description: 'Test description.'
                        },
                        templateOptions: {
                            label: 'Test Title',
                            description: 'Test description.'
                        },
                        expressions: {}
                    }
                ],
                templateOptions: {
                    label: 'ComputeInput'
                }
            }
        ])
    })
    it('should not put less than 4 optional attributes in a dialogue', () => {
        const schema: JSONSchema7 = {
            properties: {
                optional_one: {
                    type: 'boolean',
                    default: true
                },
                optional_two: {
                    type: 'boolean',
                    default: true
                },
                optional_three: {
                    type: 'boolean',
                    default: true
                }
            },
            required: [],
            title: 'ComputeInput',
            type: 'object'
        }

        const parsed_fields = component.parseFieldsFromSchema(schema)
        const testing_json = JSON.parse(JSON.stringify(parsed_fields))
        expect(testing_json).toEqual([
            {
                type: 'object',
                props: {
                    label: 'ComputeInput'
                },
                validators: {
                    type: {
                        schemaType: ['object']
                    }
                },
                fieldGroup: [
                    {
                        type: 'boolean',
                        key: 'optional_one',
                        props: {},
                        templateOptions: {},
                        validators: {
                            type: {
                                schemaType: ['boolean']
                            }
                        },
                        defaultValue: true
                    },
                    {
                        type: 'boolean',
                        key: 'optional_two',
                        props: {},
                        templateOptions: {},
                        validators: {
                            type: {
                                schemaType: ['boolean']
                            }
                        },
                        defaultValue: true
                    },
                    {
                        type: 'boolean',
                        key: 'optional_three',
                        props: {},
                        templateOptions: {},
                        validators: {
                            type: {
                                schemaType: ['boolean']
                            }
                        },
                        defaultValue: true
                    }
                ],
                templateOptions: {
                    label: 'ComputeInput'
                }
            }
        ])
    })
    it('should put more than 3 optional attributes in a dialogue', () => {
        const schema: JSONSchema7 = {
            properties: {
                optional_one: {
                    type: 'boolean',
                    default: true
                },
                optional_two: {
                    type: 'boolean',
                    default: true
                },
                optional_three: {
                    type: 'boolean',
                    default: true
                },
                optional_four: {
                    type: 'boolean',
                    default: true
                }
            },
            required: [],
            title: 'ComputeInput',
            type: 'object'
        }

        const parsed_fields = component.parseFieldsFromSchema(schema)
        const testing_json = JSON.parse(JSON.stringify(parsed_fields))
        expect(testing_json).toEqual([
            {
                type: 'object',
                props: {
                    label: 'ComputeInput'
                },
                validators: {
                    type: {
                        schemaType: ['object']
                    }
                },
                fieldGroup: [
                    {
                        type: 'dialog',
                        fieldGroup: [
                            {
                                props: {
                                    label: 'pluginParameter.optionalAttributes',
                                    description: 'pluginParameter.editAdditionalParameters'
                                },
                                fieldGroup: [
                                    {
                                        type: 'boolean',
                                        key: 'optional_one',
                                        props: {},
                                        templateOptions: {},
                                        validators: {
                                            type: {
                                                schemaType: ['boolean']
                                            }
                                        },
                                        defaultValue: true
                                    },
                                    {
                                        type: 'boolean',
                                        key: 'optional_two',
                                        props: {},
                                        templateOptions: {},
                                        validators: {
                                            type: {
                                                schemaType: ['boolean']
                                            }
                                        },
                                        defaultValue: true
                                    },
                                    {
                                        type: 'boolean',
                                        key: 'optional_three',
                                        props: {},
                                        templateOptions: {},
                                        validators: {
                                            type: {
                                                schemaType: ['boolean']
                                            }
                                        },
                                        defaultValue: true
                                    },
                                    {
                                        type: 'boolean',
                                        key: 'optional_four',
                                        props: {},
                                        templateOptions: {},
                                        validators: {
                                            type: {
                                                schemaType: ['boolean']
                                            }
                                        },
                                        defaultValue: true
                                    }
                                ]
                            }
                        ]
                    }
                ],
                templateOptions: {
                    label: 'ComputeInput'
                }
            }
        ])
    })
    it('should not put an important parameter into a dialogue', () => {
        const schema: JSONSchema7 = {
            properties: {
                optional_one: {
                    type: 'boolean',
                    default: true,
                    // @ts-ignore custom parameter that can be provided by the plugin devs but is not part of the official schema
                    'x-mark-important': true
                },
                optional_two: {
                    type: 'boolean',
                    default: true
                },
                optional_three: {
                    type: 'boolean',
                    default: true
                },
                optional_four: {
                    type: 'boolean',
                    default: true
                }
            },
            required: [],
            title: 'ComputeInput',
            type: 'object'
        }

        const parsed_fields = component.parseFieldsFromSchema(schema)
        const testing_json = JSON.parse(JSON.stringify(parsed_fields))
        expect(testing_json).toEqual([
            {
                type: 'object',
                props: {
                    label: 'ComputeInput'
                },
                validators: {
                    type: {
                        schemaType: ['object']
                    }
                },
                fieldGroup: [
                    {
                        type: 'boolean',
                        key: 'optional_one',
                        props: {},
                        templateOptions: {},
                        validators: {
                            type: {
                                schemaType: ['boolean']
                            }
                        },
                        defaultValue: true
                    },
                    {
                        type: 'dialog',
                        fieldGroup: [
                            {
                                props: {
                                    label: 'pluginParameter.optionalAttributes',
                                    description: 'pluginParameter.editAdditionalParameters'
                                },
                                fieldGroup: [
                                    {
                                        type: 'boolean',
                                        key: 'optional_two',
                                        props: {},
                                        templateOptions: {},
                                        validators: {
                                            type: {
                                                schemaType: ['boolean']
                                            }
                                        },
                                        defaultValue: true
                                    },
                                    {
                                        type: 'boolean',
                                        key: 'optional_three',
                                        props: {},
                                        templateOptions: {},
                                        validators: {
                                            type: {
                                                schemaType: ['boolean']
                                            }
                                        },
                                        defaultValue: true
                                    },
                                    {
                                        type: 'boolean',
                                        key: 'optional_four',
                                        props: {},
                                        templateOptions: {},
                                        validators: {
                                            type: {
                                                schemaType: ['boolean']
                                            }
                                        },
                                        defaultValue: true
                                    }
                                ]
                            }
                        ]
                    }
                ],
                templateOptions: {
                    label: 'ComputeInput'
                }
            }
        ])
    })
})
