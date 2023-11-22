import {ComponentFixture, TestBed} from '@angular/core/testing';

import {MarkdownComponent} from './markdown.component';
import {MarkdownModule} from "ngx-markdown";

describe('MarkdownComponent', () => {
    let component: MarkdownComponent;
    let fixture: ComponentFixture<MarkdownComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MarkdownComponent, MarkdownModule.forRoot()]
        });
        fixture = TestBed.createComponent(MarkdownComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
