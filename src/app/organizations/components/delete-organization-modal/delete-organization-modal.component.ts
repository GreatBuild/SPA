import { Component, Inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

export interface DeleteOrganizationDialogData {
  organizationName: string;
}

@Component({
  selector: 'app-delete-organization-modal',
  standalone: true,
  templateUrl: './delete-organization-modal.component.html',
  imports: [
    MatButton,
    MatDialogModule,
    TranslatePipe
  ],
  styleUrls: ['./delete-organization-modal.component.css']
})
export class DeleteOrganizationModalComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteOrganizationModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteOrganizationDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
