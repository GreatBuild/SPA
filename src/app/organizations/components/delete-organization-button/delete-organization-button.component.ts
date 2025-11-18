import { Component, Output, EventEmitter } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-delete-organization-button',
  standalone: true,
  templateUrl: './delete-organization-button.component.html',
  imports: [
    MatButton,
    TranslatePipe
  ],
  styleUrls: ['./delete-organization-button.component.css']
})
export class DeleteOrganizationButtonComponent {
  @Output() deleteRequested = new EventEmitter<void>();

  onDelete(): void {
    this.deleteRequested.emit();
  }
}
