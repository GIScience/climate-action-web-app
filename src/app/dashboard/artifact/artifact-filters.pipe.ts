import {Pipe, PipeTransform} from '@angular/core'

@Pipe({
    name: 'filterByCriteria',
    standalone: true
})

export class FilterByCriteriaPipe implements PipeTransform {
    // Disabling any type rule for flexibility in pipe input for filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transform(items: any[], pluginId: string): any[] {
        if (!items || !pluginId) {
            return items
        }
        
        return items.filter(item => item.pluginId === pluginId)
    }
}