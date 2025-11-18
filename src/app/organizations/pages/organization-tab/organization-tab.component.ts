import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { Organization } from '../../model/organization.entity';
import { Ruc } from '../../model/ruc.vo';
import { OrganizationService } from '../../services/organization.service';
import { CreateOrganizationModalComponent } from '../../components/create-organization-modal/create-organization-modal.component';
import { OrganizationListComponent } from '../../components/organization-list/organization-list.component';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import {SessionService} from '../../../iam/services/session.service';
import {OrganizationMember} from '../../model/organization-member.entity';
import {OrganizationMemberService} from '../../services/organization-member.service';
import {PersonService} from '../../../iam/services/person.service';

@Component({
  selector: 'app-organization-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatDividerModule,
    MatButtonModule,
    OrganizationListComponent,
    TranslatePipe
  ],
  templateUrl: './organization-tab.component.html',
  styleUrl: './organization-tab.component.css'
})
export class OrganizationTabComponent {
  organizations = signal<Organization[]>([]);


  constructor(
    private organizationService: OrganizationService,
    private dialog: MatDialog,
    private session: SessionService,
    private organizationMemberService: OrganizationMemberService,
    private personService: PersonService
  ) {
    this.loadOrganizations();
  }

  loadOrganizations() {
    // El userId se extrae automáticamente del JWT token en el backend
    // No es necesario pasar personId como parámetro
    this.organizationService.getMyOrganizations().subscribe({
      next: (organizations) => {
        console.log('Organizaciones cargadas:', organizations);
        // Convertir las respuestas a entidades Organization
        const orgEntities = organizations.map(org => new Organization({
          id: org.id,
          legalName: org.legalName,
          commercialName: org.commercialName,
          ruc: new Ruc(org.ruc), // Crear instancia de Ruc con el valor del string
          createdBy: org.ownerId,
          createdAt: new Date(org.createdAt),
          userRole: org.userRole, // Preservar el rol del usuario
          members: [] // Se cargarían aparte si es necesario
        }));
        this.organizations.set(orgEntities);
      },
      error: (err: any) => {
        console.error('Error al cargar organizaciones del usuario:', err);
        const errorMessage = err?.error?.message || err?.message || 'Error desconocido';
        console.error('Detalles del error:', errorMessage);
        this.organizations.set([]);
      }
    });
  }


  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateOrganizationModalComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const ownerId = this.session.getPersonId();

        if (!ownerId) {
          console.error('No se puede crear organización: falta el ID del usuario en sesión');
          return;
        }

        const organizationPayload = {
          legalName: result.legalName,
          commercialName: result.commercialName || result.legalName,
          ruc: result.ruc,
          ownerId: ownerId
        };

        console.log('Creando organización con payload:', organizationPayload);

        this.organizationService.create(organizationPayload).subscribe({
          next: (createdOrg) => {
            console.log('Organización creada exitosamente:', createdOrg);
            console.log('ID:', createdOrg.id);
            console.log('Miembros:', createdOrg.memberCount);
            console.log('Fecha creación:', createdOrg.createdAt);
            this.loadOrganizations();
          },
          error: (err) => {
            console.error('Error al crear organización:', err);
            const errorMessage = err?.error?.message || err?.message || 'Error desconocido';
            console.error('Detalles del error:', errorMessage);
          }
        });
      }
    });
  }

}
