import { HttpClient } from '@angular/common/http'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { jest } from '@jest/globals'
import { of } from 'rxjs'
import { MarkdownComponent } from './markdown.component'

describe('MarkdownComponent', () => {
    let component: MarkdownComponent
    let fixture: ComponentFixture<MarkdownComponent>
    let httpClientSpy: jest.Mocked<HttpClient>

    beforeEach(() => {
        httpClientSpy = {
            post: jest.fn(),
            get: jest.fn()
        } as unknown as jest.Mocked<HttpClient>

        TestBed.configureTestingModule({
            imports: [MarkdownComponent],
            providers: [
                {
                    provide: HttpClient,
                    useValue: httpClientSpy
                }
            ]
        })
        fixture = TestBed.createComponent(MarkdownComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it('should render markdown', () => {
        const testBaseUrl = location.href.split('#')[0]

        const markdown =
            '## Test Title\nThis is a test paragraph\n## Test Table\n| Table Title 1| Table Title 2 |\n|:-----|-----:|\n| Table Cell 1|Table Cell 2 |\n\n## Test Unordered List\n- List item 1\n- List item 2\n\n## Test Ordered List\n1. List Item 1\n2. List Item 2\n\n## Test Code Block\n```json\n{\n    "attribute 1": true,\n    "array 1": [\n        "Option 1"\n    ]\n}\n```\n\n## Test Footnote\nFootnote reference [^1]\n[^1]: Footnote item'

        const html =
            '<h2>Test Title</h2>\n<p>This is a test paragraph</p>\n<h2>Test Table</h2>\n<table>\n<thead>\n<tr><th style="text-align:left">Table Title 1</th><th style="text-align:right">Table Title 2</th></tr>\n</thead>\n<tbody>\n<tr><td style="text-align:left">Table Cell 1</td><td style="text-align:right">Table Cell 2</td></tr>\n</tbody>\n</table>\n<h2>Test Unordered List</h2>\n<ul>\n<li>List item 1</li>\n<li>List item 2</li>\n</ul>\n<h2>Test Ordered List</h2>\n<ol>\n<li>List Item 1</li>\n<li>List Item 2</li>\n</ol>\n<h2>Test Code Block</h2>\n<pre><code class="language-json">{\n    "attribute 1": true,\n    "array 1": [\n        "Option 1"\n    ]\n}\n</code></pre>\n<h2>Test Footnote</h2>\n<p>Footnote reference <sup class="footnote-ref"><a href="' +
            testBaseUrl +
            '#fn1" id="fnref1">[1]</a></sup></p>\n<hr class="footnotes-sep">\n<section class="footnotes">\n<ol class="footnotes-list">\n<li id="fn1" class="footnote-item"><p>Footnote item <a href="' +
            testBaseUrl +
            '#fnref1" class="footnote-backref">↩</a></p>\n</li>\n</ol>\n</section>'

        httpClientSpy.get.mockReturnValue(of(markdown))

        component.url = 'http://localhost/test.md'
        component.ngOnInit()

        fixture.detectChanges()

        const compiled = fixture.debugElement.nativeElement
        expect(compiled.querySelector('div').innerHTML).toContain(html)
    })
})
