export interface BaseSource {
    ID: string
    title: string
    author: string
    year: string
    note?: string
}

export interface ArticleType extends BaseSource {
    ENTRYTYPE: 'article'
    journal: string
    volume: string
    number?: string
    pages: string
    url?: string
}

export interface IncollectionType extends BaseSource {
    ENTRYTYPE: 'inbook' | 'inproceedings'
    booktitle: string
    pages: string
    url?: string
}

export interface MiscType extends BaseSource {
    ENTRYTYPE: 'misc'
    url: string
}

export type Source = (ArticleType | IncollectionType | MiscType)