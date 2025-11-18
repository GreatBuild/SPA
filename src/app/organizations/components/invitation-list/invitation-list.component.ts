import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrganizationInvitation } from '../../model/organization-invitation.entity';
import { InvitationStatus } from '../../model/invitation-status.vo';
import { OrganizationInvitationService } from '../../services/organization-invitation.service';
import { SessionService } from '../../../iam/services/session.service';
import { OrganizationMemberService } from '../../services/organization-member.service';
import {TranslatePipe} from '@ngx-translate/core';
import {OrganizationService} from '../../services/organization.service';
import {PersonService} from '../../../iam/services/person.service';
import {Person} from '../../../iam/model/person.entity';

@Component({
  selector: 'app-invitation-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ],
  templateUrl: './invitation-list.component.html',
  styleUrls: ['./invitation-list.component.css']
})
export class InvitationListComponent implements OnInit {

  invitations = signal<OrganizationInvitation[]>([]);
  filteredInvitations = signal<OrganizationInvitation[]>([]);
  loading = signal<boolean>(false);
  processingInvitation = signal<number | null>(null);
  selectedFilter = signal<InvitationStatus | 'ALL'>('ALL');

  invitationStatus = InvitationStatus;
  displayedColumns: string[] = ['organization', 'invitedBy', 'invitedAt', 'expiresAt', 'status', 'actions'];


  constructor(
    private invitationService: OrganizationInvitationService,
    private snackBar: MatSnackBar,
    private sessionService: SessionService,
    private organizationMemberService: OrganizationMemberService
  ) {
  }

  ngOnInit(): void {
    this.loadInvitations();
  }

  loadInvitations() {
    this.loading.set(true);
    
    // Usar el nuevo endpoint my-invitations
    this.invitationService.getMyInvitations({}).subscribe({
      next: (response: any[]) => {
        console.log('[My Invitations API Response]', response);

        const mappedInvitations = response
          .map(data => new OrganizationInvitation({
            id: data.id,
            organizationId: data.organizationId,
            organizationName: data.organizationName,
            inviterId: data.inviterId,
            inviterName: data.inviterName,
            inviteeUserId: data.inviteeUserId,
            inviteeEmail: data.inviteeEmail,
            status: data.status as InvitationStatus,
            createdAt: data.createdAt,
            invitedAt: data.createdAt, // Usar createdAt como invitedAt
            expiresAt: data.expiresAt
          }))
          .sort((a, b) => {
            // Ordenar por fecha descendente (más recientes primero)
            const dateA = a.createdAt || a.invitedAt;
            const dateB = b.createdAt || b.invitedAt;
            return dateB.getTime() - dateA.getTime();
          });

        this.invitations.set(mappedInvitations);
        this.applyFilter();
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading invitations:', error);
        const errorMessage = error.status === 401 
          ? 'No autorizado. Por favor, inicia sesión nuevamente.'
          : 'Error al cargar las invitaciones';
        this.showSnackBar(errorMessage, 'error');
        this.invitations.set([]);
        this.filteredInvitations.set([]);
        this.loading.set(false);
      }
    });
  }

  applyFilter() {
    const filter = this.selectedFilter();
    if (filter === 'ALL') {
      this.filteredInvitations.set(this.invitations());
    } else {
      this.filteredInvitations.set(
        this.invitations().filter(inv => inv.status === filter)
      );
    }
  }

  setFilter(status: InvitationStatus | 'ALL') {
    this.selectedFilter.set(status);
    this.applyFilter();
  }

  async acceptInvitation(invitation: OrganizationInvitation): Promise<void> {
    const id = invitation.id?.toString() ?? '';
    this.processingInvitation.set(invitation.id ?? null);
    
    try {
      // Usar el nuevo endpoint POST /api/invitations/{id}/accept
      await this.invitationService.accept({}, { id }).toPromise();
      
      this.showSnackBar('✅ Invitación aceptada exitosamente', 'success');
      await this.loadInvitations();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      this.showSnackBar('❌ Error al aceptar la invitación', 'error');
    } finally {
      this.processingInvitation.set(null);
    }
  }

  async rejectInvitation(invitation: OrganizationInvitation): Promise<void> {
    const id = invitation.id?.toString() ?? '';
    this.processingInvitation.set(invitation.id ?? null);
    
    try {
      // Usar el nuevo endpoint POST /api/invitations/{id}/reject
      await this.invitationService.reject({}, { id }).toPromise();
      
      this.showSnackBar('📋 Invitación rechazada', 'info');
      await this.loadInvitations();
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      this.showSnackBar('❌ Error al rechazar la invitación', 'error');
    } finally {
      this.processingInvitation.set(null);
    }
  }

  private showSnackBar(message: string, type: 'success' | 'error' | 'info' | 'warn'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: [`snackbar-${type}`]
    });
  }

  getStatusBadgeClass(status: InvitationStatus): string {
    switch (status) {
      case InvitationStatus.PENDING:
        return 'chip-pending';
      case InvitationStatus.ACCEPTED:
        return 'chip-accepted';
      case InvitationStatus.REJECTED:
        return 'chip-rejected';
      case InvitationStatus.EXPIRED:
        return 'chip-expired';
      default:
        return '';
    }
  }

  get pendingInvitationsCount(): number {
    return this.invitations().filter(invitation =>
      invitation.status === InvitationStatus.PENDING
    ).length;
  }

  get acceptedInvitationsCount(): number {
    return this.invitations().filter(invitation =>
      invitation.status === InvitationStatus.ACCEPTED
    ).length;
  }

  get rejectedInvitationsCount(): number {
    return this.invitations().filter(invitation =>
      invitation.status === InvitationStatus.REJECTED
    ).length;
  }

  get expiredInvitationsCount(): number {
    return this.invitations().filter(invitation =>
      invitation.status === InvitationStatus.EXPIRED
    ).length;
  }
}
