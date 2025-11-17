import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from './session.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleName: string;
}

export interface RegisterResponse {
  email: string;
  message: string;
}

export interface SelectRoleRequest {
  roleName: 'ROLE_CLIENT' | 'ROLE_WORKER';
}

export interface SelectRoleResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  provider: string;
  roles: Array<{ id: number; name: string }>;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authBaseUrl = environment.authApiBaseUrl ?? 'http://localhost:8080/api/auth';
  private readonly googleAuthBaseUrl = environment.oauthApiBaseUrl ?? 'http://localhost:8003/api/auth';
  private readonly googleOAuthUrl = environment.oauthGatewayUrl ?? 'http://localhost:8080/oauth2/authorization/google';

  constructor(private http: HttpClient, private session: SessionService) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authBaseUrl}/login`, payload);
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.authBaseUrl}/register`, payload);
  }

  getGoogleLoginUrl(): string {
    return this.googleOAuthUrl;
  }

  selectRole(payload: SelectRoleRequest): Observable<SelectRoleResponse> {
    return this.http.post<SelectRoleResponse>(`${this.authBaseUrl}/select-role`, payload, this.authHeaders());
  }

  private authHeaders() {
    const token = this.session.getToken();
    if (!token) {
      return {};
    }

    return {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    };
  }
}
