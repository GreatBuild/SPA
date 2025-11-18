import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Organization } from '../../model/organization.entity';
import { TranslatePipe } from '@ngx-translate/core';
import { Router } from '@angular/router';
import {SessionService} from '../../../iam/services/session.service';
import {OrganizationMemberType} from '../../model/organization-member-type.vo';

@Component({
  selector: 'app-organization-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, TranslatePipe],
  templateUrl: './organization-card.component.html',
  styleUrl: './organization-card.component.css'
})
export class OrganizationCardComponent {
  @Input() organization!: Organization;

  constructor(private router: Router,
              private sessionService: SessionService) {
  }

  onCardClick(){
    // Usar userRole del backend en lugar de comparar con createdBy
    const role = this.organization.userRole === 'CONTRACTOR'
      ? OrganizationMemberType.CONTRACTOR
      : OrganizationMemberType.WORKER;
    const orgId = this.organization.id
    this.sessionService.setOrganization(orgId, role)
    this.router.navigate([`/organizations/${orgId}`]);
  }

  isContractorOn() {
    // Usar userRole del backend
    return this.organization.userRole === 'CONTRACTOR';
  }
}
