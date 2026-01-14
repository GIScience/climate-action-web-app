import { Source } from '@app/types/sources/sources.type'

/**
 * Extracts URLs from BibTeX-style \url{} notes when no explicit URL exists.
 * Mutates the sources array in place.
 */
export function processSourceUrls(sources: Source[] | null): void {
    if (sources) {
        sources.forEach(source => {
            if (!source.url && source.note) {
                const noteUrlMatch = source.note.match('\\url{(.*)}')
                if (noteUrlMatch) {
                    source.url = noteUrlMatch[1]
                }
            }
        })
    }
}

/**
 * Sorts sources alphabetically by author name.
 * Returns a new sorted array without mutating the original.
 */
export function sortSourcesByAuthor(sources: Source[] | null): Source[] {
    if (!sources) return []
    return [...sources].sort((a, b) => a.author.localeCompare(b.author))
}

/**
 * Formats source metadata text based on BibTeX entry type.
 */
export function formatSourceText(source: Source): string {
    const commonFields = [source.author, source.title]

    switch (source.ENTRYTYPE) {
        case 'article':
            return [...commonFields, source.journal, source.volume, source.pages, source.year]
                .filter(Boolean)
                .join(', ')
        case 'inbook':
        case 'inproceedings':
            return [...commonFields, source.pages, source.year].filter(Boolean).join(', ')
        case 'misc':
            return [...commonFields, source.year].filter(Boolean).join(', ')
        default:
            return ''
    }
}
