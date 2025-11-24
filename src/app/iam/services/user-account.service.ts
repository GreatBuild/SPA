import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { createDynamicService } from '../../shared/services/create-dynamic-service';
import { createEndpointConfig } from '../../shared/model/endpoint-config.vo';
import { HttpMethod } from '../../shared/model/http-method.vo';
import { UserAccount } from '../model/user-account.entity';
import { environment } from '../../../environments/environment';

const auth = `${environment.authenticationUser}:${environment.authenticationPassword}`;

@Injectable({
  providedIn: 'root'
})
export class UserAccountService {
  private readonly service = createDynamicService<UserAccount>([
    createEndpointConfig({ name: 'getAll', method: HttpMethod.GET }, undefined, 'user-accounts'),
    createEndpointConfig({ name: 'getById', method: HttpMethod.GET }, undefined, 'user-accounts', '/:id'),
    createEndpointConfig({ name: 'create', method: HttpMethod.POST }, undefined, 'user-accounts'),
    createEndpointConfig({ name: 'update', method: HttpMethod.PUT }, undefined, 'user-accounts', '/:id'),
    createEndpointConfig({ name: 'delete', method: HttpMethod.DELETE }, undefined, 'user-accounts', '/:id'),
    createEndpointConfig({ name: 'signIn', method : HttpMethod.POST }, undefined, 'auth/signin', ''),
    createEndpointConfig({ name: 'signUp', method : HttpMethod.POST }, undefined, 'auth/signup', '')
  ]);

  getAll = this.service['getAll'];
  getById = this.service['getById'];
  create = this.service['create'];
  update = this.service['update'];
  delete = this.service['delete'];
  signIn = this.service['signIn'];
  signUp = this.service['signUp'];

  private readonly apiBaseUrl = environment.propgmsApiBaseUrl || 'http://localhost:8080/api/';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene información interna de un usuario por su ID
   * @param id ID del usuario
   * @returns Observable con los datos del usuario interno
   */
  getUserInternalById(id: number): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { 'Authorization': `Bearer ${token}` })
    });

    return this.http.get(`${this.apiBaseUrl}/users/internal/${id}`, { headers });
  }

  /**
   * Obtiene información interna de un usuario por su email
   * GET /api/users/internal/email/{email}
   * @param email Email del usuario
   * @returns Observable con los datos del usuario (id, email, firstName, lastName, roles)
   */
  getUserByEmail(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      ...(token && { 'Authorization': `Bearer ${token}` })
    });

    return this.http.get(`${this.apiBaseUrl}users/internal/email/${encodeURIComponent(email)}`, { headers });
  }
}
