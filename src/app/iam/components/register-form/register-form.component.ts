import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';

import { UserType } from '../../model/user-type.vo';
import {NgForOf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, FormsModule, NgForOf, TranslatePipe, MatCardModule],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.css'
})
export class RegisterFormComponent {
  roles = Object.values(UserType); // ['TYPE_CLIENT', 'TYPE_WORKER', ...]
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  role: UserType = UserType.TYPE_CLIENT;

  @Output() submitted = new EventEmitter<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserType;
  }>();

  submitForm() {
    this.submitted.emit({
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password,
      role: this.role
    });
  }
}
