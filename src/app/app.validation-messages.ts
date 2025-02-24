import { FormlyFieldConfig } from '@ngx-formly/core'
import { ValidationErrors } from '@angular/forms'

export function minItemsValidationMessage(_: ValidationErrors, field: FormlyFieldConfig) {
    return `should NOT have fewer than ${field?.props?.['minItems']} items`
}

export function maxItemsValidationMessage(_: ValidationErrors, field: FormlyFieldConfig) {
    return `should NOT have more than ${field?.props?.['maxItems']} items`
}

export function minLengthValidationMessage(_: ValidationErrors, field: FormlyFieldConfig) {
    return `should NOT be shorter than ${field?.props?.['minLength']} characters`
}

export function maxLengthValidationMessage(_: ValidationErrors, field: FormlyFieldConfig) {
    return `should NOT be longer than ${field?.props?.['maxLength']} characters`
}

export function minValidationMessage(_: ValidationErrors, field: FormlyFieldConfig) {
    return `should be >= ${field?.props?.['min']}`
}

export function maxValidationMessage(_: ValidationErrors, field: FormlyFieldConfig) {
    return `should be <= ${field?.props?.['max']}`
}

export function multipleOfValidationMessage(_: ValidationErrors, field: FormlyFieldConfig) {
    return `should be multiple of ${field?.props?.['step']}`
}

export function exclusiveMinimumValidationMessage(_: ValidationErrors, field: FormlyFieldConfig) {
    return `should be > ${field?.props?.['exclusiveMinimum']}`
}

export function exclusiveMaximumValidationMessage(_: ValidationErrors, field: FormlyFieldConfig) {
    return `should be < ${field?.props?.['exclusiveMaximum']}`
}

export function constValidationMessage(_: ValidationErrors, field: FormlyFieldConfig) {
    return `should be equal to constant "${field?.props?.['const']}"`
}

export function typeValidationMessage({ schemaType }: { schemaType: string[] }) {
    return `should be "${schemaType[0]}".`
}
