import { CommonModule } from '@angular/common'
import { HttpClient } from '@angular/common/http'
import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { Remarkable } from 'remarkable'

@Component({
    selector: 'app-markdown',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './markdown.component.html',
    styleUrls: ['./markdown.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class MarkdownComponent implements OnInit {
    @Input() url: string | undefined
    @Input() rawMarkdown: string | undefined
    markdownContent: SafeHtml | '' = ''

    private mdParser: Remarkable

    constructor(
        private http: HttpClient,
        private sanitizer: DomSanitizer
    ) {
        this.mdParser = new Remarkable('full', {
            html: false,
            breaks: false,
            typographer: true,
            quotes: '“”‘’'
        })
    }

    ngOnInit(): void {
        if (this.url) {
            this.loadMarkdownFromUrl()
        } else if (this.rawMarkdown) {
            this.parseMarkdown(this.rawMarkdown)
        }
    }

    private loadMarkdownFromUrl(): void {
        if (this.url) {
            this.http.get(this.url, { responseType: 'text' }).subscribe({
                next: data => {
                    this.parseMarkdown(data)
                },
                error: error => console.error('Error fetching markdown content:', error)
            })
        } else {
            console.error('URL is undefined')
        }
    }

    private parseMarkdown(markdown: string): void {
        let html = this.mdParser.render(markdown)
        html = this.rewriteFootnoteLinks(html)
        this.markdownContent = this.sanitizer.bypassSecurityTrustHtml(html)
    }

    private rewriteFootnoteLinks(html: string) {
        const baseUrl = location.href.split('#')[0]
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')

        const links = doc.querySelectorAll('a[href^="#fn"], a[href^="#fnref"]')
        links.forEach(link => {
            const originalHref = link.getAttribute('href')
            if (originalHref) {
                link.setAttribute('href', `${baseUrl}${originalHref}`)
            }
        })

        return doc.body.innerHTML
    }
}
