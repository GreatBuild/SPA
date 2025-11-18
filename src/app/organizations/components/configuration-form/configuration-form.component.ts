import { Component, Input } from '@angular/core';
import { Organization } from '../../model/organization.entity';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {TranslatePipe} from "@ngx-translate/core";

@Component({
  selector: 'app-configuration-form',
  standalone: true,
    imports: [MatFormFieldModule, MatInputModule, FormsModule, TranslatePipe],
  templateUrl: './configuration-form.component.html',
  styleUrls: ['./configuration-form.component.css']
})
export class ConfigurationFormComponent {
  @Input() organization!: Organization;

  get rucValue(): string {
    return typeof this.organization.ruc === 'string'
      ? this.organization.ruc
      : this.organization.ruc?.value || '';
  }

  set rucValue(value: string) {
    // Actualizar el ruc como string temporal para el binding
    (this.organization as any).ruc = value;
  }

  getUpdatedOrganization(): { legalName: string; commercialName: string; ruc: string } {
    return {
      legalName: this.organization.legalName,
      commercialName: this.organization.commercialName,
      ruc: this.rucValue
    };
  }
}
