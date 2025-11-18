import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { createDynamicService } from '../../shared/services/create-dynamic-service';
import { createEndpointConfig } from '../../shared/model/endpoint-config.vo';
import { HttpMethod } from '../../shared/model/http-method.vo';
import { Organization } from '../model/organization.entity';
import { environment } from '../../../environments/environment';

export interface CreateOrganizationRequest {
  legalName: string;
  commercialName: string;
  ruc: string;
  ownerId: number;
}

export interface CreateOrganizationResponse {
  id: number;
  legalName: string;
  commercialName: string;
  ruc: string;
  ownerId: number;
  createdAt: string;
  memberCount: number;
}

export interface MyOrganizationResponse {
  id: number;
  legalName: string;
  commercialName: string;
  ruc: string;
  ownerId: number;
  createdAt: string;
  membersCount: number;
  userRole: 'CONTRACTOR' | 'MEMBER';
}

export interface UpdateOrganizationRequest {
  legalName?: string;
  commercialName?: string;
  ruc?: string;
}

export interface UpdateOrganizationResponse {
  id: number;
  legalName: string;
  commercialName: string;
  ruc: string;
  ownerId: number;
  createdAt: string;
  memberCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private readonly apiBaseUrl = environment.propgmsApiBaseUrl || 'http://localhost:8080/api/';

  private readonly service = createDynamicService<Organization>([
    createEndpointConfig({ name: 'getAll', method: HttpMethod.GET }, undefined, 'organizations'),
    createEndpointConfig({ name: 'getById', method: HttpMethod.GET }, undefined, 'organizations', '/:id'),
    createEndpointConfig({ name: 'getByContractorId', method: HttpMethod.GET }, undefined, 'organizations'),
    createEndpointConfig({ name: 'getByPersonId', method: HttpMethod.GET }, undefined, 'organizations/by-person-id', '/:id'),
    createEndpointConfig({ name: 'update', method: HttpMethod.PATCH }, undefined, 'organizations', '/:id'),
    createEndpointConfig({ name: 'delete', method: HttpMethod.DELETE }, undefined, 'organizations', '/:ruc'),
    createEndpointConfig({ name: 'deactivate', method: HttpMethod.PATCH }, undefined, 'organizations', '/:id/deactivate'),
  ]);

  constructor(private http: HttpClient) {}

  getAll = this.service['getAll'];
  getById = this.service['getById'];
  getByContractorId = this.service['getByContractorId'];
  update = this.service['update'];
  delete = this.service['delete'];
  deactivate = this.service['deactivate'];
  getByPersonId = this.service['getByPersonId'];

  /**
   * Crea una nueva organización
   * @param payload Datos de la organización a crear
   * @returns Observable con la respuesta de creación
   */
  create(payload: CreateOrganizationRequest): Observable<CreateOrganizationResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });

    return this.http.post<CreateOrganizationResponse>(
      `${this.apiBaseUrl}organizations`,
      payload,
      { headers }
    );
  }

  /**
   * Obtiene las organizaciones del usuario autenticado.
   * El userId se extrae automáticamente del JWT token en el backend.
   * @returns Observable con array de organizaciones que incluyen el rol del usuario (CONTRACTOR o MEMBER)
   */
  getMyOrganizations(): Observable<MyOrganizationResponse[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { 'Authorization': `Bearer ${token}` })
    });

    return this.http.get<MyOrganizationResponse[]>(
      `${this.apiBaseUrl}organizations/my-organizations`,
      { headers }
    );
  }

  /**
   * Actualiza una organización (actualización parcial).
   * Solo el CONTRACTOR (owner) puede actualizar su organización.
   * @param id ID de la organización a actualizar
   * @param payload Campos a actualizar (legalName, commercialName, ruc)
   * @returns Observable con la organización actualizada
   */
  updateOrganization(id: number, payload: UpdateOrganizationRequest): Observable<UpdateOrganizationResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });

    return this.http.put<UpdateOrganizationResponse>(
      `${this.apiBaseUrl}organizations/${id}`,
      payload,
      { headers }
    );
  }

  /**
   * Elimina una organización por su ID.
   * Solo el CONTRACTOR (owner) puede eliminar su organización.
   * @param id ID de la organización a eliminar
   * @returns Observable void
   */
  deleteOrganization(id: number): Observable<void> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { 'Authorization': `Bearer ${token}` })
    });

    return this.http.delete<void>(
      `${this.apiBaseUrl}organizations/${id}`,
      { headers }
    );
  }
  /**
   * Verifica si un usuario es el creador de una organización
   * @param organizationId ID de la organización
   * @param personId ID de la persona a verificar
   * @returns Observable<boolean> true si la persona es creadora
   */
  isOrganizationCreator(organizationId: number, personId: number): Observable<boolean> {
    return this.getById({}, { id: organizationId.toString() }).pipe(
      map((organization: any) => {
        return organization && organization.createdBy === personId;
      })
    );
  }
}
