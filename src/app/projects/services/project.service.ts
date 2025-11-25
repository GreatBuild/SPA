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

export interface UpdateProjectRequest {
  projectName?: string;
  description?: string;
  endDate?: string; // YYYY-MM-DD
  contractingEntityEmail?: string;
  status?: string;
}

export interface UpdateStatusRequest {
  status: string;
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
    createEndpointConfig({ name: 'getByClientId', method: HttpMethod.GET }, undefined, 'projects', '/as-client'),
    createEndpointConfig({ name: 'getMyProjectsByOrganization', method: HttpMethod.GET }, undefined, 'projects', '/organization/:orgId/my-projects'),
    createEndpointConfig({ name: 'getMembersByProject', method: HttpMethod.GET }, undefined, 'projects', '/:id/members'),
    createEndpointConfig({ name: 'addMember', method: HttpMethod.POST }, undefined, 'projects', '/:projectId/members'),
    createEndpointConfig({ name: 'deleteMember', method: HttpMethod.DELETE }, undefined, 'projects', '/:projectId/members/:memberId'),
    createEndpointConfig({ name: 'updatePartial', method: HttpMethod.PUT }, undefined, 'projects', '/:id'),
    createEndpointConfig({ name: 'updateStatus', method: HttpMethod.PUT }, undefined, 'projects', '/:id/status'),
    createEndpointConfig({ name: 'update', method: HttpMethod.PUT }, undefined, 'projects', '/:id'),
    createEndpointConfig({ name: 'delete', method: HttpMethod.DELETE }, undefined, 'projects', '/:id'),
  ]);

  constructor(private http: HttpClient) {}

  getAll = this.service['getAll'];
  getById = this.service['getById'];
  getByClientId = this.service['getByClientId'];
  getMyProjectsByOrganization = this.service['getMyProjectsByOrganization'];
  getMembersByProject = this.service['getMembersByProject'];
  addMember = this.service['addMember'];
  deleteMember = this.service['deleteMember'];
  updatePartial = this.service['updatePartial'];
  updateStatus = this.service['updateStatus'];
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
      `${environment.propgmsApiBaseUrl}/projects`,
      payload,
      { headers }
    );
  }

  /**
   * Actualiza parcialmente un proyecto. Envía solo los campos presentes en payload.
   */
  updateProjectPartial(id: number | string, payload: UpdateProjectRequest): Observable<Project> {
    return this.updatePartial(payload, { id });
  }

  /**
   * Actualiza un proyecto en el endpoint unificado PUT /projects/:id (envía solo campos modificados).
   */
  updateProject(id: number | string, payload: UpdateProjectRequest): Observable<Project> {
    return this.updatePartial(payload, { id });
  }

  /**
   * Actualiza el estado de un proyecto.
   */
  updateProjectStatus(id: number | string, status: string): Observable<Project> {
    const body: UpdateStatusRequest = { status };
    return this.updateStatus(body, { id });
  }

  /**
   * Elimina un miembro del proyecto.
   */
  deleteProjectMember(projectId: number | string, memberId: number | string): Observable<void> {
    return this.deleteMember({}, { projectId, memberId });
  }

  /**
   * Agrega un miembro al proyecto.
   */
  addProjectMember(projectId: number | string, payload: { userId: number; role: string; specialty: string }): Observable<Project> {
    return this.addMember(payload, { projectId });
  }
}
