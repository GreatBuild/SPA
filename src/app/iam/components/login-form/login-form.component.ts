// login-form.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {MatCardModule} from '@angular/material/card';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    TranslatePipe,
    MatCardModule,
    RouterLink
  ],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.css'
})
export class LoginFormComponent {
  email = '';
  password = '';

  @Output() submitted = new EventEmitter<{ email: string; password: string }>();
  @Output() googleLogin = new EventEmitter<void>();

  submitForm() {
    if (this.email && this.password) {
      this.submitted.emit({ email: this.email, password: this.password });
    }
  }

  onGoogleLogin() {
    this.googleLogin.emit();
  }
}
