import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { createDynamicService } from '../../shared/services/create-dynamic-service';
import { createEndpointConfig } from '../../shared/model/endpoint-config.vo';
import { HttpMethod } from '../../shared/model/http-method.vo';
import { Project } from '../model/project.entity';
import { environment } from '../../../environments/environment';

/**
 * Request para crear un proyecto
 */
export interface CreateProjectRequest {
  projectName: string;
  description?: string;
  endDate: string; // Formato: YYYY-MM-DD
  organizationId: number;
  contractingEntityEmail: string; // email de la entidad contratante
}

/**
 * Response al crear un proyecto
 */
export interface CreateProjectResponse {
  id: number;
  projectName: string;
  description?: string;
  startDate: string;
  endDate: string;
  organizationId: number;
  contractingEntityId: number;
  status: string;
  createdAt: string;
  memberCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly service = createDynamicService<Project>([
    createEndpointConfig({ name: 'getAll', method: HttpMethod.GET }, undefined, 'projects'),
    createEndpointConfig({ name: 'getById', method: HttpMethod.GET }, undefined, 'projects', '/:id'),
    createEndpointConfig({ name: 'getByClientId', method: HttpMethod.GET }, undefined, 'projects', '?clientId=:clientId'),
    createEndpointConfig({ name: 'getMyProjectsByOrganization', method: HttpMethod.GET }, undefined, 'projects', '/organization/:orgId/my-projects'),
    createEndpointConfig({ name: 'update', method: HttpMethod.PUT }, undefined, 'projects', '/:id'),
    createEndpointConfig({ name: 'delete', method: HttpMethod.DELETE }, undefined, 'projects', '/:id'),
  ]);

  constructor(private http: HttpClient) {}

  getAll = this.service['getAll'];
  getById = this.service['getById'];
  getByClientId = this.service['getByClientId'];
  getMyProjectsByOrganization = this.service['getMyProjectsByOrganization'];
  update = this.service['update'];
  delete = this.service['delete'];

  /**
   * Crea un nuevo proyecto
   * Solo puede ser ejecutado por ROLE_WORKER que sea CONTRACTOR de la organización
   * @param payload Datos del proyecto a crear
   * @returns Observable con la respuesta de creación
   */
  createProject(payload: CreateProjectRequest): Observable<CreateProjectResponse> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });

    return this.http.post<CreateProjectResponse>(
      `${environment.propgmsApiBaseUrl}projects`,
      payload,
      { headers }
    );
  }
}
