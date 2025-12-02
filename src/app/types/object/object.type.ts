import { Component } from '@angular/core'
import { FieldType, FormlyField, FormlyValidationMessage } from '@ngx-formly/core'

@Component({
    selector: 'app-formly-object-type',
    templateUrl: 'object.type.component.html',
    styleUrls: ['object.type.component.scss'],
    imports: [FormlyField, FormlyValidationMessage]
})
export class ObjectTypeComponent extends FieldType {}

/**  Copyright 2021 Formly. All Rights Reserved.
 Use of this source code is governed by an MIT-style license that
 can be found in the LICENSE file at https://github.com/ngx-formly/ngx-formly/blob/main/LICENSE */
