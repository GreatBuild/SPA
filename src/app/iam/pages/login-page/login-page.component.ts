// login-page.component.ts
import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {LoginFormComponent} from '../../components/login-form/login-form.component';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {TranslateService} from '@ngx-translate/core';
import {SessionService} from '../../services/session.service';
import {UserType} from '../../model/user-type.vo';
import {AuthService} from '../../services/auth.service';
import {decodeJwtPayload, extractRoleClaim, mapRoleNameToUserType} from '../../utils/jwt.utils';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    LoginFormComponent,
    MatCardModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent implements OnInit {
  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private translate: TranslateService,
    private router: Router,
    private route: ActivatedRoute,
    private session: SessionService
  ) {}

  ngOnInit(): void {
    // Handle OAuth callback if redirected here by mistake
    this.route.queryParamMap.subscribe(params => {
      const token = params.get('token');
      const email = params.get('email');
      const needsRoleSelection = params.get('needsRoleSelection');

      if (token) {
        // Redirect to proper callback route
        this.router.navigate(['/auth/callback'], {
          queryParams: { token, email, needsRoleSelection }
        });
      }
    });
  }

  onLoginSubmitted(formData: { email: string; password: string }) {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({
      email: formData.email.toLowerCase(),
      password: formData.password
    }).subscribe({
      next: ({ accessToken }) => {
        if (!accessToken) {
          this.setError('login-page.errors.server');
          return;
        }

        this.session.setToken(accessToken);
        const primaryRole = this.populateSessionFromToken(accessToken);
        if (primaryRole === UserType.TYPE_WORKER) {
          this.router.navigate(['/organizations']);
        } else if (primaryRole === UserType.TYPE_CLIENT) {
          this.router.navigate(['/projects']);
        }
      },
      error: () => {
        this.setError('login-page.errors.invalid-credentials');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  onGoogleLogin() {
    window.location.href = this.authService.getGoogleLoginUrl();
  }

  private populateSessionFromToken(token: string): UserType | undefined {
    const payload = decodeJwtPayload(token);
    if (!payload) return undefined;

    if (payload.sub) {
      const maybeId = Number(payload.sub);
      if (!isNaN(maybeId)) {
        this.session.setPersonId(maybeId);
      }
    }

    const userType = mapRoleNameToUserType(extractRoleClaim(payload));
    if (userType) {
      this.session.setUserType(userType);
    }
    return userType;
  }
  private setError(translationKey: string) {
    this.errorMessage = this.translate.instant(translationKey);
    this.isLoading = false;
  }
}
