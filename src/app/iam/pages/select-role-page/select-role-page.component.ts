import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService, SelectRoleRequest } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';
import { UserType } from '../../model/user-type.vo';
import { decodeJwtPayload, extractRoleClaim, mapRoleNameToUserType } from '../../utils/jwt.utils';

interface RoleOption {
  value: SelectRoleRequest['roleName'];
  labelKey: string;
}

@Component({
  selector: 'app-select-role-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatRadioModule, TranslateModule],
  templateUrl: './select-role-page.component.html',
  styleUrl: './select-role-page.component.css'
})
export class SelectRolePageComponent implements OnInit {
  readonly roles: RoleOption[] = [
    { value: 'ROLE_CLIENT', labelKey: 'auth-select-role.roles.client' },
    { value: 'ROLE_WORKER', labelKey: 'auth-select-role.roles.worker' }
  ];

  selectedRole: RoleOption['value'] | null = null;
  tokenMissing = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  infoMessage = signal('');
  email = signal<string | undefined>(undefined);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly session: SessionService,
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const paramToken = params.get('accessToken') ?? params.get('token');
      const email = params.get('email') ?? undefined;
      const message = params.get('message');
      const needsSelection = params.get('needsRoleSelection');

      this.email.set(email);
      if (message) {
        this.infoMessage.set(message);
      } else {
        this.infoMessage.set(this.translate.instant('auth-select-role.helper'));
      }

      if (!paramToken) {
        this.tokenMissing.set(true);
        this.errorMessage.set(this.translate.instant('auth-select-role.errors.missing-token'));
        return;
      }

      this.session.setToken(paramToken);
      this.populateSessionFromToken(paramToken);

      if (needsSelection === 'false') {
        this.navigateByUserType(this.session.getUserType());
        return;
      }
    });
  }

  submitSelection(): void {
    if (!this.selectedRole) {
      this.errorMessage.set(this.translate.instant('auth-select-role.errors.select-role'));
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);
    this.authService.selectRole({ roleName: this.selectedRole }).subscribe({
      next: response => {
        const resolvedRole = response.roles?.[0]?.name ?? this.selectedRole;
        const mappedRole = mapRoleNameToUserType(resolvedRole);
        if (mappedRole) {
          this.session.setUserType(mappedRole);
        }
        if (response.id) {
          this.session.setPersonId(response.id);
        }
        this.isSubmitting.set(false);
        this.navigateByUserType(mappedRole);
      },
      error: err => {
        const details = err?.error?.message ?? err?.message ?? '';
        this.errorMessage.set(
          `${this.translate.instant('auth-select-role.errors.submit')} ${details}`.trim()
        );
        this.isSubmitting.set(false);
      }
    });
  }

  private populateSessionFromToken(token: string): void {
    const payload = decodeJwtPayload(token);
    if (!payload) {
      return;
    }

    if (payload.sub) {
      const id = Number(payload.sub);
      if (!Number.isNaN(id)) {
        this.session.setPersonId(id);
      }
    }

    const mappedRole = mapRoleNameToUserType(extractRoleClaim(payload));
    if (mappedRole) {
      this.session.setUserType(mappedRole);
    }
  }

  private navigateByUserType(userType?: UserType): void {
    if (!userType) {
      return;
    }

    if (userType === UserType.TYPE_WORKER) {
      this.router.navigate(['/organizations']);
    } else if (userType === UserType.TYPE_CLIENT) {
      this.router.navigate(['/projects']);
    }
  }
}
