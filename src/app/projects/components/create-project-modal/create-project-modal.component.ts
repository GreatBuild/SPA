import { Component } from '@angular/core';
import {FormsModule} from "@angular/forms";
import {MatButton} from "@angular/material/button";
import {MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatInput, MatLabel} from "@angular/material/input";
import {TranslatePipe} from "@ngx-translate/core";
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {CommonModule} from '@angular/common';
import { SessionService } from '../../../iam/services/session.service';
import { Organization } from '../../../organizations/model/organization.entity';

@Component({
  selector: 'app-create-project-modal',
    imports: [
        FormsModule,
        MatButton,
        MatDialogActions,
        MatDialogContent,
        MatDialogTitle,
        MatFormFieldModule,
        MatInput,
        MatLabel,
        TranslatePipe,
        MatSelectModule,
        CommonModule
    ],
  templateUrl: './create-project-modal.component.html',
  styleUrl: './create-project-modal.component.css'
})
export class CreateProjectModalComponent {
  projectName = '';
  description = '';
  endDate = '';
  contractingEntityEmail = ''; // Cambiado de contractingEntityId a contractingEntityEmail
  
  // Validaciones
  nameError = '';
  endDateError = '';
  contractingEntityError = '';

  constructor(
    private dialogRef: MatDialogRef<CreateProjectModalComponent>,
    private session: SessionService
  ) {
    // Establecer fecha mínima como hoy
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.endDate = `${yyyy}-${mm}-${dd}`;
  }

  close(): void {
    this.dialogRef.close();
  }

  validateForm(): boolean {
    let isValid = true;

    // Validar nombre del proyecto
    if (!this.projectName || this.projectName.trim() === '') {
      this.nameError = 'El nombre del proyecto es obligatorio';
      isValid = false;
    } else {
      this.nameError = '';
    }

    // Validar fecha de fin
    if (!this.endDate) {
      this.endDateError = 'La fecha de fin es obligatoria';
      isValid = false;
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(this.endDate);
      
      if (selectedDate < today) {
        this.endDateError = 'La fecha de fin debe ser hoy o posterior';
        isValid = false;
      } else {
        this.endDateError = '';
      }
    }

    // Validar entidad contratante (email)
    if (!this.contractingEntityEmail || this.contractingEntityEmail.trim() === '') {
      this.contractingEntityError = 'El email de la entidad contratante es obligatorio';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contractingEntityEmail)) {
      this.contractingEntityError = 'Debe ingresar un email válido';
      isValid = false;
    } else {
      this.contractingEntityError = '';
    }

    return isValid;
  }

  submit(): void {
    if (!this.validateForm()) {
      return;
    }

    const orgId = this.session.getOrganizationId();

    if (!orgId) {
      console.error('No organization ID found in session');
      return;
    }

    const data = {
      projectName: this.projectName.trim(),
      description: this.description?.trim() || undefined,
      endDate: this.endDate,
      organizationId: orgId,
      contractingEntityEmail: this.contractingEntityEmail.trim() // Devolver email en lugar de ID
    };

    this.dialogRef.close(data);
  }
}
