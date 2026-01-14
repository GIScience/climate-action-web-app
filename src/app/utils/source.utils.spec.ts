import { Source } from '@app/types/sources/sources.type'
import { formatSourceText, processSourceUrls, sortSourcesByAuthor } from './source.utils'

describe('processSourceUrls', () => {
    it('should handle null input', () => {
        expect(() => processSourceUrls(null)).not.toThrow()
    })

    it('should extract URL from note when url is missing', () => {
        const sources: Source[] = [
            {
                ID: '1',
                ENTRYTYPE: 'misc',
                title: 'Test',
                author: 'Author',
                year: '2024',
                url: '',
                note: '\\url{https://example.com}'
            } as Source
        ]

        processSourceUrls(sources)

        expect(sources[0].url).toBe('https://example.com')
    })

    it('should not overwrite existing url', () => {
        const sources: Source[] = [
            {
                ID: '1',
                ENTRYTYPE: 'misc',
                title: 'Test',
                author: 'Author',
                year: '2024',
                url: 'https://existing.com',
                note: '\\url{https://example.com}'
            }
        ]

        processSourceUrls(sources)

        expect(sources[0].url).toBe('https://existing.com')
    })

    it('should handle note without url pattern', () => {
        const sources: Source[] = [
            {
                ID: '1',
                ENTRYTYPE: 'misc',
                title: 'Test',
                author: 'Author',
                year: '2024',
                url: '',
                note: 'Some other note'
            } as Source
        ]

        processSourceUrls(sources)

        expect(sources[0].url).toBe('')
    })
})

describe('formatSourceText', () => {
    it('should format article source', () => {
        const source: Source = {
            ID: '1',
            ENTRYTYPE: 'article',
            title: 'Test Article',
            author: 'John Doe',
            year: '2024',
            journal: 'Nature',
            volume: '10',
            pages: '1-10'
        }

        expect(formatSourceText(source)).toBe('John Doe, Test Article, Nature, 10, 1-10, 2024')
    })

    it('should format inbook source', () => {
        const source: Source = {
            ID: '1',
            ENTRYTYPE: 'inbook',
            title: 'Test Chapter',
            author: 'Jane Doe',
            year: '2023',
            booktitle: 'Book Title',
            pages: '50-75'
        }

        expect(formatSourceText(source)).toBe('Jane Doe, Test Chapter, 50-75, 2023')
    })

    it('should format misc source', () => {
        const source: Source = {
            ID: '1',
            ENTRYTYPE: 'misc',
            title: 'Test Misc',
            author: 'Someone',
            year: '2022',
            url: 'https://example.com'
        }

        expect(formatSourceText(source)).toBe('Someone, Test Misc, 2022')
    })

    it('should filter out missing fields', () => {
        const source: Source = {
            ID: '1',
            ENTRYTYPE: 'article',
            title: 'Test',
            author: 'Author',
            year: '',
            journal: 'Journal',
            volume: '',
            pages: ''
        }

        expect(formatSourceText(source)).toBe('Author, Test, Journal')
    })

    it('should return empty string for unknown entry type', () => {
        const source = {
            ID: '1',
            ENTRYTYPE: 'unknown',
            title: 'Test',
            author: 'Author',
            year: '2024'
        } as unknown as Source

        expect(formatSourceText(source)).toBe('')
    })
})

describe('sortSourcesByAuthor', () => {
    it('should return empty array for null input', () => {
        expect(sortSourcesByAuthor(null)).toEqual([])
    })

    it('should sort sources alphabetically by author', () => {
        const sources: Source[] = [
            { ID: '1', ENTRYTYPE: 'misc', title: 'C', author: 'Zebra', year: '2024', url: '' },
            { ID: '2', ENTRYTYPE: 'misc', title: 'A', author: 'Alpha', year: '2024', url: '' },
            { ID: '3', ENTRYTYPE: 'misc', title: 'B', author: 'Beta', year: '2024', url: '' }
        ]

        const sorted = sortSourcesByAuthor(sources)

        expect(sorted[0].author).toBe('Alpha')
        expect(sorted[1].author).toBe('Beta')
        expect(sorted[2].author).toBe('Zebra')
    })

    it('should not mutate the original array', () => {
        const sources: Source[] = [
            { ID: '1', ENTRYTYPE: 'misc', title: 'B', author: 'Beta', year: '2024', url: '' },
            { ID: '2', ENTRYTYPE: 'misc', title: 'A', author: 'Alpha', year: '2024', url: '' }
        ]

        sortSourcesByAuthor(sources)

        expect(sources[0].author).toBe('Beta')
    })
})
