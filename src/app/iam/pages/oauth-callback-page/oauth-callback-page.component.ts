import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SessionService } from '../../services/session.service';
import { decodeJwtPayload, extractRoleClaim, mapRoleNameToUserType } from '../../utils/jwt.utils';
import { UserType } from '../../model/user-type.vo';

@Component({
  selector: 'app-oauth-callback-page',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatButtonModule, RouterLink, TranslateModule],
  templateUrl: './oauth-callback-page.component.html',
  styleUrl: './oauth-callback-page.component.css'
})
export class OauthCallbackPageComponent implements OnInit {
  message = '';
  hasError = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly session: SessionService,
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const token = params.get('token');
      const email = params.get('email');
      const needsRoleSelection = params.get('needsRoleSelection');

      if (!token) {
        this.hasError = true;
        this.message = this.translate.instant('oauth-callback.errors.no-token');
        return;
      }

      // Guardar el token en sesión
      this.session.setToken(token);

      // Si necesita seleccionar rol, redirigir a la página de selección
      if (needsRoleSelection === 'true') {
        this.router.navigate(['/auth/select-role'], {
          queryParams: {
            accessToken: token,
            email: email,
            needsRoleSelection: true
          }
        });
        return;
      }

      // Si no necesita selección de rol, poblar la sesión y redirigir
      this.populateSessionFromToken(token);
      const userType = this.session.getUserType();

      if (userType === UserType.TYPE_WORKER) {
        this.router.navigate(['/organizations']);
      } else if (userType === UserType.TYPE_CLIENT) {
        this.router.navigate(['/projects']);
      } else {
        this.hasError = true;
        this.message = this.translate.instant('oauth-callback.errors.invalid-role');
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
}
