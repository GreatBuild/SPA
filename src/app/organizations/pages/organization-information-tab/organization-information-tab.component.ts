import { Component } from '@angular/core';
import {
  OrganizationInformationCardComponent
} from '../../components/organization-information-card/organization-information-card.component';
import {SessionService} from '../../../iam/services/session.service';
import {OrganizationService} from '../../services/organization.service';
import {Organization} from '../../model/organization.entity';
import {UserAccountService} from '../../../iam/services/user-account.service';
import {Person} from '../../../iam/model/person.entity';
import {PhoneNumber} from '../../../iam/model/phone-number.vo';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-organization-information-tab',
  standalone: true,
  imports: [
    OrganizationInformationCardComponent,
    NgIf
  ],
  templateUrl: './organization-information-tab.component.html',
  styleUrl: './organization-information-tab.component.css'
})
export class OrganizationInformationTabComponent {
  protected organization: Organization | undefined;
  protected contractor: Person | undefined;
  constructor(
    private sessionService: SessionService,
    private organizationService: OrganizationService,
    private userAccountService: UserAccountService
  ) {
    this.getOrganization();
  }

  getOrganization(): void {
    const organizationId = this.sessionService.getOrganizationId();

    this.organizationService.getById({}, { id: organizationId }).subscribe({
      next: (organizationData: any) => {
        this.organization = new Organization(organizationData);
        this.getContractor();
      },
      error: (err: any) => {
        console.error('Error al obtener la organización', err);
      }
    });
  }


  getContractor() {
    // @ts-ignore
    const ownerId = this.organization.createdBy;

    if (!ownerId) {
      console.warn('No hay ID de owner disponible en la organización');
      this.createDefaultContractor();
      return;
    }

    this.userAccountService.getUserInternalById(ownerId).subscribe({
      next: (userData: any) => {
        this.contractor = new Person({
          id: userData.id,
          email: userData.email,
          phone: new PhoneNumber('999999999'), // El endpoint no devuelve phone, usar número por defecto
          firstName: userData.firstName,
          lastName: userData.lastName
        });
      },
      error: (err: any) => {
        console.error('Error al obtener el owner de la organización:', err);
        this.createDefaultContractor();
      }
    });
  }

  private createDefaultContractor(): void {
    try {
      this.contractor = new Person({
        id: 0,
        email: 'no.disponible@example.com',
        phone: new PhoneNumber('999999999'),
        firstName: 'Información',
        lastName: 'No disponible'
      });
    } catch (e) {
      console.error('Error al crear persona por defecto', e);
    }
  }
}
