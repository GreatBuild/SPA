import { Component, ViewChild } from '@angular/core';
import { ConfigurationFormComponent } from '../../components/configuration-form/configuration-form.component';
import { OrganizationService } from '../../services/organization.service';
import { SessionService } from '../../../iam/services/session.service';
import { Organization } from '../../model/organization.entity';
import { NgClass, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';
import {
  DeleteOrganizationButtonComponent
} from '../../components/delete-organization-button/delete-organization-button.component';
import {
  DeleteOrganizationModalComponent
} from '../../components/delete-organization-modal/delete-organization-modal.component';

@Component({
  selector: 'app-configuration-tab',
  standalone: true,
  imports: [ConfigurationFormComponent, NgIf, MatButtonModule, TranslatePipe, NgClass, DeleteOrganizationButtonComponent],
  templateUrl: './configuration-tab.component.html',
  styleUrls: ['./configuration-tab.component.css']
})
export class ConfigurationTabComponent {
  org: Organization | null = null;
  originalOrg: Organization | null = null;


  @ViewChild(ConfigurationFormComponent)
  private formComponent!: ConfigurationFormComponent;
  message: string = '';
  messageType: 'success' | 'error' | '' = '';

  constructor(
    private organizationService: OrganizationService,
    private session: SessionService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.loadOrganization();
  }

  loadOrganization() {
    const id = this.session.getOrganizationId();
    if (!id) {
      console.warn('No organization ID found in session.');
      return;
    }

    this.organizationService.getById({}, { id }).subscribe({
      next: (org:Organization) => {
        this.org = JSON.parse(JSON.stringify(org));
        this.originalOrg = JSON.parse(JSON.stringify(org));
      }
    });
  }

  onSubmitChanges() {
    if (!this.org?.id) return;

    const updated = this.formComponent.getUpdatedOrganization();

    // Validación 1: legalName vacío
    if (!updated.legalName || updated.legalName.trim() === '') {
      this.message = 'organization-configuration.errors.empty-legal-name';
      this.messageType = 'error';
      return;
    }

    // Validación 2: RUC debe tener 11 dígitos si se proporciona
    if (updated.ruc && !/^[1|2]\d{10}$/.test(updated.ruc)) {
      this.message = 'organization-configuration.errors.invalid-ruc';
      this.messageType = 'error';
      return;
    }

    // Obtener RUC original como string
    const originalRuc = typeof this.originalOrg?.ruc === 'string'
      ? this.originalOrg.ruc
      : this.originalOrg?.ruc?.value || '';

    // Validación 3: sin cambios
    const noChanges =
      updated.legalName === this.originalOrg?.legalName &&
      updated.commercialName === this.originalOrg?.commercialName &&
      updated.ruc === originalRuc;

    if (noChanges) {
      this.message = 'organization-configuration.errors.no-changes';
      this.messageType = 'error';
      return;
    }

    // Construir payload con solo los campos modificados
    const payload: { legalName?: string; commercialName?: string; ruc?: string } = {};

    if (updated.legalName !== this.originalOrg?.legalName) {
      payload.legalName = updated.legalName;
    }
    if (updated.commercialName !== this.originalOrg?.commercialName) {
      payload.commercialName = updated.commercialName;
    }
    if (updated.ruc !== originalRuc) {
      payload.ruc = updated.ruc;
    }

    // PUT
    this.organizationService.updateOrganization(this.org.id, payload).subscribe({
      next: (response) => {
        this.message = 'organization-configuration.success.updated';
        this.messageType = 'success';
        // Actualizar organización original con la respuesta del backend
        this.org = new Organization(response);
        this.originalOrg = JSON.parse(JSON.stringify(this.org));
      },
      error: (err: any) => {
        console.error('Error al actualizar organización:', err);
        const errorMessage = err?.error?.message || err?.message || 'Error desconocido';
        console.error('Detalles del error:', errorMessage);
        this.message = 'organization-configuration.errors.api-failed';
        this.messageType = 'error';
      }
    });
  }

  onDeleteOrganization(): void {
    if (!this.org?.id) {
      console.error('No se puede eliminar: falta el ID de la organización');
      return;
    }

    const dialogRef = this.dialog.open(DeleteOrganizationModalComponent, {
      width: '500px',
      data: { organizationName: this.org.legalName }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && this.org?.id) {
        this.organizationService.deleteOrganization(this.org.id).subscribe({
          next: () => {
            this.snackBar.open('Organización eliminada exitosamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-success']
            });
            this.router.navigate(['/organizations']);
          },
          error: (err: any) => {
            console.error('Error al eliminar organización:', err);
            const errorMessage = err?.error?.message || err?.message || 'Error desconocido';
            console.error('Detalles del error:', errorMessage);
            this.snackBar.open('Error al eliminar organización', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-error']
            });
          }
        });
      }
    });
  }
}
