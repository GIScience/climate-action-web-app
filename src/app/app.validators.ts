import {AbstractControl, ValidationErrors} from '@angular/forms'
import {FormlyFieldConfig} from '@ngx-formly/core'
import {ValidatorOptions} from './plugin/plugin-parameter/plugin-parameter.interface'
import moment from 'moment'

export function intTypeValidator(control: AbstractControl,
                                 _: FormlyFieldConfig,
                                 options: ValidatorOptions = {}): ValidationErrors {
    if (!control.value) {
        return {}
    } else if (!/^-?[0-9]*$/.test(control.value) || isNaN(parseInt(control.value))) {
        return {intType: {message: 'Not an integer!'}}
    } else if (options.min != undefined && parseInt(control.value) < options.min) {
        return {intType: {message: `Value must be bigger than ${options.min}`}}
    } else if (options.max != undefined && parseInt(control.value) > options.max) {
        return {intType: {message: `Value must be smaller than ${options.max}`}}
    }
    return {}
}

export function numericTypeValidator(control: AbstractControl,
                                     _: FormlyFieldConfig,
                                     options: ValidatorOptions = {}): ValidationErrors {
    if (!control.value) {
        return {}
    } else if (!/^-?[0-9]*(\.[0-9]*)?$/.test(control.value) || isNaN(parseFloat(control.value))) {
        return {numType: {message: 'Not a number!'}}
    } else if (options.min != undefined && parseFloat(control.value) < options.min) {
        return {numType: {message: `Value must be bigger than ${options.min}`}}
    } else if (options.max != undefined && parseFloat(control.value) > options.max) {
        return {numType: {message: `Value must be smaller than ${options.max}`}}
    }
    return {}
}

export function dateTypeValidator(control: AbstractControl,
                                  _: FormlyFieldConfig,
                                  options: ValidatorOptions = {}): ValidationErrors {
    if (!control.value) {
        return {}
    } else if (!moment(control.value, moment.ISO_8601, true).isValid()) {
        return {numType: {message: 'Not a date!'}}
    } else if (moment(control.value) < moment(options.min)) {
        return {numType: {message: `Value must be bigger than ${options.min}`}}
    } else if (moment(control.value) > moment(options.max)) {
        return {numType: {message: `Value must be smaller than ${options.max}`}}
    }
    return {}
}