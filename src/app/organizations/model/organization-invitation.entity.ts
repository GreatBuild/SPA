import { InvitationStatus } from './invitation-status.vo';

/**
 * Entity representing an invitation to join an organization.
 * Updated to match backend response from GET /api/invitations/my-invitations
 */
export class OrganizationInvitation {
  public readonly id: number | undefined; // Cambiado de invitationId
  public readonly invitationId: number | undefined; // Mantener compatibilidad
  public readonly organizationId: number | undefined;
  public readonly organizationName?: string; // Nuevo campo del backend
  public readonly personId: number | undefined;
  public readonly inviterId?: number; // Nuevo campo del backend
  public readonly inviterName?: string; // Nuevo campo del backend
  public readonly invitedBy: string | undefined; // Mantener compatibilidad
  public readonly inviteeUserId?: number; // Nuevo campo del backend
  public readonly inviteeEmail?: string; // Nuevo campo del backend
  public readonly invitedAt: Date;
  public readonly createdAt?: Date; // Nuevo campo del backend
  public readonly expiresAt?: Date; // Nuevo campo del backend
  public acceptedAt?: Date;
  public status: InvitationStatus;

  /**
   * Constructs a new OrganizationInvitation instance.
   */
  constructor({
                id,
                invitationId,
                organizationId,
                organizationName,
                personId,
                inviterId,
                inviterName,
                invitedBy,
                inviteeUserId,
                inviteeEmail,
                invitedAt = new Date(),
                createdAt,
                expiresAt,
                acceptedAt,
                status = InvitationStatus.PENDING
              }: {
    id?: number;
    invitationId?: number;
    organizationId?: number;
    organizationName?: string;
    personId?: number;
    inviterId?: number;
    inviterName?: string;
    invitedBy?: string;
    inviteeUserId?: number;
    inviteeEmail?: string;
    invitedAt?: Date;
    createdAt?: Date;
    expiresAt?: Date;
    acceptedAt?: Date;
    status?: InvitationStatus;
  }) {
    this.id = id || invitationId;
    this.invitationId = invitationId || id; // Compatibilidad hacia atrás
    this.organizationId = organizationId;
    this.organizationName = organizationName;
    this.personId = personId || inviteeUserId;
    this.inviterId = inviterId;
    this.inviterName = inviterName;
    this.invitedBy = invitedBy || inviterName;
    this.inviteeUserId = inviteeUserId || personId;
    this.inviteeEmail = inviteeEmail;
    this.invitedAt = invitedAt instanceof Date ? invitedAt : new Date(invitedAt);
    this.createdAt = createdAt ? (createdAt instanceof Date ? createdAt : new Date(createdAt)) : undefined;
    this.expiresAt = expiresAt ? (expiresAt instanceof Date ? expiresAt : new Date(expiresAt)) : undefined;
    this.acceptedAt = acceptedAt ? (acceptedAt instanceof Date ? acceptedAt : new Date(acceptedAt)) : undefined;
    this.status = status;
  }

  /**
   * Accepts the invitation and sets its status to ACCEPTED.
   */
  accept(): void {
    if (this.status !== InvitationStatus.PENDING) {
      throw new Error('Only pending invitations can be accepted.');
    }

    this.status = InvitationStatus.ACCEPTED;
    this.acceptedAt = new Date();
  }

  /**
   * Rejects the invitation and sets its status to REJECTED.
   */
  reject(): void {
    if (this.status !== InvitationStatus.PENDING) {
      throw new Error('Only pending invitations can be rejected.');
    }

    this.status = InvitationStatus.REJECTED;
  }

  /**
   * Checks if the invitation is still pending.
   *
   * @returns True if status is PENDING.
   */
  isPending(): boolean {
    return this.status === InvitationStatus.PENDING;
  }

  /**
   * Serializes the invitation to JSON.
   */
  toJSON() {
    return {
      invitationId: this.invitationId,
      organizationId: this.organizationId,
      personId: this.personId,
      invitedBy: this.invitedBy,
      invitedAt: this.invitedAt.toISOString(),
      acceptedAt: this.acceptedAt?.toISOString() ?? null,
      status: this.status
    };
  }
}
