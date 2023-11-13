import {Component, Input} from '@angular/core';
import {CommonModule} from "@angular/common";

@Component({
  selector: 'app-image',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image.component.html',
  styleUrls: ['./image.component.scss']
})
export class ImageComponent {
  @Input() url: string | undefined;
}
