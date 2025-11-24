import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { createDynamicService } from '../../shared/services/create-dynamic-service';
import { createEndpointConfig } from '../../shared/model/endpoint-config.vo';
import { HttpMethod } from '../../shared/model/http-method.vo';
import { OrganizationMember } from '../model/organization-member.entity';
import { environment } from '../../../environments/environment';

const TOKEN = localStorage.getItem('token') || undefined;

export interface OrganizationMemberResponse {
  memberId: number;
  userId: number;
  role: 'CONTRACTOR' | 'MEMBER';
  email: string;
  firstName: string;
  lastName: string;
}


@Injectable({
  providedIn: 'root'
})
export class OrganizationMemberService {
  private readonly apiBaseUrl = environment.propgmsApiBaseUrl || 'http://localhost:8080/api/';

  private readonly service = createDynamicService<OrganizationMember>([
    createEndpointConfig({ name: 'getAll', method: HttpMethod.GET }, undefined, 'organizations/:id', '/members', TOKEN),
    createEndpointConfig({ name: 'getById', method: HttpMethod.GET }, undefined, 'organization-members', '/:id'),
    createEndpointConfig({ name: 'getByOrganizationId', method: HttpMethod.GET }, undefined, 'organization-members'),
    createEndpointConfig({ name: 'create', method: HttpMethod.POST }, undefined, 'organization-members'),
    createEndpointConfig({ name: 'update', method: HttpMethod.PUT }, undefined, 'organization-members', '/:id'),
    createEndpointConfig({ name: 'delete', method: HttpMethod.DELETE }, undefined, 'organizations/organization-members', '/:id')
  ]);

  constructor(private http: HttpClient) {}

  getAll = this.service['getAll'];
  getById = this.service['getById'];
  getByOrganizationId = this.service['getByOrganizationId'];
  create = this.service['create'];
  update = this.service['update'];

  /**
   * Obtiene la lista de miembros de una organización.
   * Incluye al CONTRACTOR y todos los MEMBERS.
   * El usuario solicitante debe ser CONTRACTOR o MEMBER de la organización.
   * @param organizationId ID de la organización
   * @returns Observable con array de miembros con datos completos (nombre, email, rol)
   */
  getOrganizationMembers(organizationId: number): Observable<OrganizationMemberResponse[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { 'Authorization': `Bearer ${token}` })
    });

    return this.http.get<OrganizationMemberResponse[]>(
      `${this.apiBaseUrl}/organizations/${organizationId}/members`,
      { headers }
    );
  }

  /**
   * Elimina un miembro de una organización
   * DELETE /api/organizations/{orgId}/members/{memberId}
   * @param organizationId ID de la organización
   * @param memberId ID del miembro a eliminar
   * @returns Observable<void>
   */
  deleteMember(organizationId: number, memberId: number): Observable<void> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { 'Authorization': `Bearer ${token}` })
    });

    return this.http.delete<void>(
      `${this.apiBaseUrl}/organizations/${organizationId}/members/${memberId}`,
      { headers }
    );
  }
}
