import {AbstractControl, ValidationErrors} from '@angular/forms'
import {FormlyFieldConfig} from '@ngx-formly/core'
import {ValidatorOptions} from './dashboard/plugin/plugin-parameter/plugin-parameter.interface'
import moment from 'moment'

export function intTypeValidator(control: AbstractControl,
                                 _: FormlyFieldConfig,
                                 options: ValidatorOptions = {}): ValidationErrors {
    const min = options.min !== undefined ? parseInt(options.min as string) : undefined
    const max = options.max !== undefined ? parseInt(options.max as string) : undefined
    if (!control.value) {
        return {}
    } else if (!/^-?[0-9]*$/.test(control.value) || isNaN(parseInt(control.value))) {
        return {intType: {message: 'Not an integer!'}}
    } else if (min !== undefined && parseInt(control.value) < min) {
        return {intType: {message: `Value must be bigger than ${min}`}}
    } else if (max !== undefined && parseInt(control.value) > max) {
        return {intType: {message: `Value must be smaller than ${max}`}}
    }
    return {}
}

export function numericTypeValidator(control: AbstractControl,
                                     _: FormlyFieldConfig,
                                     options: ValidatorOptions = {}): ValidationErrors {
    const min = options.min !== undefined ? parseFloat(options.min as string) : undefined
    const max = options.max !== undefined ? parseFloat(options.max as string) : undefined
    if (!control.value) {
        return {}
    } else if (!/^-?[0-9]*(\.[0-9]*)?$/.test(control.value) || isNaN(parseFloat(control.value))) {
        return {numType: {message: 'Not a number!'} }
    } else if (min !== undefined && parseFloat(control.value) < min) {
        return {numType: {message: `Value must be bigger than ${min}`}}
    } else if (max !== undefined && parseFloat(control.value) > max) {
        return {numType: {message: `Value must be smaller than ${max}`}}
    }
    return {}
}

export function dateTypeValidator(control: AbstractControl,
                                  _: FormlyFieldConfig,
                                  options: ValidatorOptions = {}): ValidationErrors {
    const min = options.min !== undefined ? moment(options.min as string) : undefined
    const max = options.max !== undefined ? moment(options.max as string) : undefined
    if (!control.value) {
        return {}
    } else if (!moment(control.value, moment.ISO_8601, true).isValid()) {
        return {numType: {message: 'Not a date!' } }
    } else if (min !== undefined && moment(control.value) < min) {
        return {numType: {message: `Value must be bigger than ${min}`}}
    } else if (max !== undefined && moment(control.value) > max) {
        return {numType: {message: `Value must be smaller than ${max}`}}
    }
    return {}
}