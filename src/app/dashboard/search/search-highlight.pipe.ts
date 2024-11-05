import {Pipe, PipeTransform} from '@angular/core'

@Pipe({
    name: 'highlight',
    standalone: true
})

export class SearchTermHighlightPipe implements PipeTransform {
    transform(text: string, search: string): string {
        if (!search) {
            return text
        }
        const regex = new RegExp(`(${search})`, 'gi')
        return text.replace(regex, (match) => `<mark>${match}</mark>`)
    }
}