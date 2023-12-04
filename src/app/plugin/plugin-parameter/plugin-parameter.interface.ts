import {JSONSchema7Type} from 'json-schema';

export interface FormlyModel {
    [key: string]: string
}

export interface SelectOptions {
    [key: string]: SelectOption[]
}

export interface SelectOption {
    label: string,
    value: JSONSchema7Type
}
