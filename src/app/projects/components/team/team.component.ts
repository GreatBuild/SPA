import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, FormArray, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

import { OrganizationMemberService } from '../../../organizations/services/organization-member.service';
import { PersonService } from '../../../iam/services/person.service';
import { SessionService } from '../../../iam/services/session.service';
import { ProjectService } from '../../services/project.service';
import { ProjectTeamMemberService } from '../../services/project-team-member.service';

import { OrganizationMember } from '../../../organizations/model/organization-member.entity';
import { Person } from '../../../iam/model/person.entity';
import { ProjectRole } from '../../model/project-role.vo';
import { Specialty } from '../../model/specialty.vo';
import { Project } from '../../model/project.entity';
import { ProjectTeamMember } from '../../model/project-team-member.entity';

interface TeamMemberDisplay {
  id: string;
  name: string;
  role: ProjectRole | string;
  specialty: string;
  email: string;
  status: string;
}

interface OrganizationMemberDisplay {
  id: string;
  name: string;
  email: string;
  selected: boolean;
  role: ProjectRole | null;
  specialty: Specialty | null;
}

@Component({
  selector: 'app-team',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslateModule
  ],
  standalone: true,
  templateUrl: './team.component.html',
  styleUrl: './team.component.css'
})
export class TeamComponent implements OnInit, OnDestroy {
  @ViewChild('addMembersDialog') addMembersDialog!: TemplateRef<any>;
  @ViewChild('removeMemberDialog') removeMemberDialog!: TemplateRef<any>;

  // Propiedades para la tabla de miembros del equipo
  teamMembers: TeamMemberDisplay[] = [];
  displayedColumns: string[] = ['name', 'role', 'specialty', 'email', 'status', 'actions'];

  // Propiedades para la tabla de miembros de la organización
  orgMembers: OrganizationMemberDisplay[] = [];
  filteredOrgMembers: OrganizationMemberDisplay[] = [];
  searchQuery: string = '';

  // Propiedades para el formulario de asignación de roles
  memberForm: FormGroup;

  // Propiedad para miembro seleccionado (utilizado en eliminación)
  selectedMember: TeamMemberDisplay | null = null;

  // Valores para los selectores
  projectRoles = [ProjectRole.COORDINATOR, ProjectRole.SPECIALIST];
  specialties = Object.values(Specialty);

  // Propiedades de control
  loading = true;
  error: string | null = null;
  project: Project | null = null;
  projectId: string = '';
  orgId: string = '';

  // Estados para agregar miembro por email
  searchEmail: string = '';
  foundUser: { id: number; fullName?: string; email?: string } | null = null;
  searchLoading = false;
  searchError: string | null = null;
  addRole: ProjectRole | null = null;
  addSpecialty: Specialty | null = null;
  addLoading = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private orgMemberService: OrganizationMemberService,
    private personService: PersonService,
    private sessionService: SessionService,
    private projectService: ProjectService,
    private teamMemberService: ProjectTeamMemberService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private http: HttpClient
  ) {
    this.memberForm = this.fb.group({
      members: this.fb.array([])
    });
  }

  ngOnInit(): void {
    const projectIdVal = this.sessionService.getProjectId();
    this.projectId = projectIdVal !== undefined ? String(projectIdVal) : '';

    const orgIdVal = this.sessionService.getOrganizationId();
    this.orgId = orgIdVal !== undefined ? String(orgIdVal) : '';

    if (!this.projectId) {
      this.error = this.translate.instant('team.errors.no-project-id');
      this.loading = false;
      return;
    }

    this.loadProjectData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadProjectData(): void {
    const projectSub = this.projectService.getById(null, { id: this.projectId })
      .subscribe({
        next: (project: any) => {
          this.project = project;
          this.loadTeamMembers();
        },
        error: (error: any) => {
          console.error('Error loading project:', error);
          this.error = this.translate.instant('team.errors.load-project');
          this.loading = false;
        }
      });

    this.subscriptions.push(projectSub);
  }

  loadTeamMembers(): void {
    this.loading = true;

    const teamSub = this.projectService.getMembersByProject({}, { id: this.projectId }).subscribe({
      next: (members: any[]) => {
        const displayMembers: TeamMemberDisplay[] = (members || []).map((m: any) => {
          const nameFromParts = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim();
          const fullName = (m.fullName ?? nameFromParts) || 'Sin nombre';
          return {
            id: (m.memberId ?? m.id ?? '').toString(),
            name: fullName,
            role: m.role ?? 'N/A',
            specialty: m.specialty ?? 'N/A',
            email: m.email ?? 'Sin email',
            status: 'ACTIVE'
          };
        });
        this.teamMembers = displayMembers;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading team members:', error);
        if (error.status === 401 || error.status === 403) {
          this.error = 'No autorizado para ver los miembros del proyecto';
        } else if (error.status === 400) {
          this.error = 'Proyecto inválido o inexistente';
        } else {
          this.error = this.translate.instant('team.errors.load-members');
        }
        this.loading = false;
      }
    });

    this.subscriptions.push(teamSub);
  }

  openAddMembersDialog(): void {
    this.resetAddMemberState();
    this.dialog.open(this.addMembersDialog, {
      width: '500px',
      maxHeight: '90vh'
    });
  }

  private resetAddMemberState(): void {
    this.searchEmail = '';
    this.foundUser = null;
    this.searchLoading = false;
    this.searchError = null;
    this.addRole = null;
    this.addSpecialty = null;
    this.addLoading = false;
  }

  searchUserByEmail(): void {
    const email = this.searchEmail.trim();
    if (!email) {
      this.searchError = 'Ingrese un correo';
      return;
    }
    this.searchLoading = true;
    this.searchError = null;
    this.foundUser = null;

    const base = environment.propgmsApiBaseUrl.replace(/\/$/, '');
    const url = `${base}/users/internal/email/${encodeURIComponent(email)}`;

    this.http.get(url).subscribe({
      next: (user: any) => {
        this.foundUser = {
          id: user.id,
          fullName: user.fullName ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
          email: user.email
        };
        this.searchLoading = false;
      },
      error: (error: any) => {
        if (error.status === 404) {
          this.searchError = 'No existe un usuario con ese email';
        } else {
          this.searchError = 'No se pudo buscar el usuario';
        }
        this.searchLoading = false;
      }
    });
  }

  submitAddMember(): void {
    if (!this.foundUser) {
      this.searchError = 'Debes buscar y seleccionar un usuario';
      return;
    }
    if (!this.addRole) {
      this.searchError = 'Selecciona un rol';
      return;
    }

    // Evitar duplicados
    const alreadyInTeam = this.teamMembers.some(m => m.id === this.foundUser!.id.toString() || m.email === this.foundUser!.email);
    if (alreadyInTeam) {
      this.searchError = 'Este usuario ya es miembro del proyecto';
      return;
    }

    // Validar specialty según rol
    let specialtyToSend: Specialty = Specialty.NON_APPLICABLE;
    if (this.addRole === ProjectRole.SPECIALIST) {
      if (!this.addSpecialty || this.addSpecialty === Specialty.NON_APPLICABLE) {
        this.searchError = 'Selecciona una especialidad para el especialista';
        return;
      }
      specialtyToSend = this.addSpecialty;
    }

    this.addLoading = true;
    this.searchError = null;

    this.projectService.addProjectMember(this.projectId, {
      userId: this.foundUser.id,
      role: this.addRole,
      specialty: specialtyToSend
    }).subscribe({
      next: () => {
        this.addLoading = false;
        this.snackBar.open(
          this.translate.instant('team.success.members-added'),
          this.translate.instant('team.actions.close'),
          { duration: 3000 }
        );
        this.dialog.closeAll();
        this.loadTeamMembers();
      },
      error: (error: any) => {
        console.error('Error agregando miembro al proyecto:', error);
        if (error.status === 400) {
          this.searchError = error.error?.message || 'Solicitud inválida (verifica rol/especialidad o pertenencia a la organización)';
        } else if (error.status === 401 || error.status === 403) {
          this.searchError = 'No autorizado para agregar miembros';
        } else {
          this.searchError = 'No se pudo agregar el miembro';
        }
        this.addLoading = false;
      }
    });
  }

  async loadOrganizationMembers(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Obtener los miembros actuales del equipo para excluirlos
      const currentTeamMemberIds = this.teamMembers.map(m => m.id);

      const orgSub = this.orgMemberService.getByOrganizationId({ organizationId: this.orgId })
        .pipe(
          switchMap((members: any) => {
            if (members && members.length === 0) {
              this.orgMembers = [];
              return [];
            }

            // Instead of making individual requests, get all persons at once
            return this.personService.getAll().pipe(
              map((allPersons: Person[]) => {
                // Create a map for quick person lookup by ID
                const personMap = new Map<number, Person>();
                allPersons.forEach(person => {
                  if (person && person.id !== undefined) {
                    personMap.set(person.id, person);
                  }
                });

                const displayMembers: OrganizationMemberDisplay[] = [];

                for (const member of members) {
                  if (!member || !member.personId) {
                    continue;
                  }

                  // Convert personId to number safely
                  const personIdRaw = member.personId;
                  const personIdNum = typeof personIdRaw === 'object'
                    ? parseInt(personIdRaw.toString(), 10)
                    : typeof personIdRaw === 'string'
                      ? parseInt(personIdRaw, 10)
                      : personIdRaw;

                  if (isNaN(personIdNum)) {
                    console.warn('Invalid person ID:', personIdRaw);
                    continue;
                  }

                  // Get person from our map
                  const person = personMap.get(personIdNum);

                  if (!person) {
                    console.warn(`Person with ID ${personIdNum} not found in database`);
                    continue;
                  }

                  // Safe email handling
                  let email = 'no-email@example.com';
                  if (person.email) {
                    email = typeof person.email === 'string' ? person.email : String(person.email);
                  }

                  // Check if already a team member
                  const isTeamMember = this.teamMembers.some(tm => tm.email === email);
                  if (isTeamMember) {
                    continue; // Skip if already a team member
                  }

                  // Add to display members
                  displayMembers.push({
                    id: member.id ? member.id.toString() : '',
                    name: `${person.firstName || ''} ${person.lastName || ''}`,
                    email: email,
                    selected: false,
                    role: null,
                    specialty: null
                  });
                }

                return displayMembers;
              })
            );
          })
        )
        .subscribe({
          next: (displayMembers: OrganizationMemberDisplay[]) => {
            this.orgMembers = displayMembers || [];
            this.filteredOrgMembers = [...this.orgMembers];
            resolve();
          },
          error: (error: any) => {
            console.error('Error loading organization members:', error);
            reject(error);
          }
        });

      this.subscriptions.push(orgSub);
    });
  }

  // Método para buscar miembros
  searchMembers(): void {
    if (!this.searchQuery.trim()) {
      this.filteredOrgMembers = [...this.orgMembers];
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredOrgMembers = this.orgMembers.filter((member: OrganizationMemberDisplay) =>
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  }

  // Métodos para el formulario dinámico
  toggleMemberSelection(member: OrganizationMemberDisplay): void {
    member.selected = !member.selected;

    const membersArray = this.memberForm.get('members') as FormArray;

    if (member.selected) {
      // Añadir al formulario
      membersArray.push(
        this.fb.group({
          id: [member.id],
          role: [null, Validators.required],
          specialty: [null]
        })
      );
    } else {
      // Eliminar del formulario
      const index = this.getFormArrayIndex(membersArray, member.id);
      if (index !== -1) {
        membersArray.removeAt(index);
      }

      // Resetear valores
      member.role = null;
      member.specialty = null;
    }
  }

  getFormArrayIndex(formArray: FormArray, memberId: string): number {
    return formArray.controls.findIndex(control =>
      control.get('id')?.value === memberId
    );
  }

  submitAddMembers(): void {
    if (this.memberForm.invalid) {
      this.snackBar.open(
        this.translate.instant('team.errors.invalid-form'),
        this.translate.instant('team.actions.close'),
        { duration: 5000 }
      );
      return;
    }

    const membersArray = this.memberForm.get('members') as FormArray;

    if (membersArray.length === 0) {
      this.snackBar.open(
        this.translate.instant('team.errors.no-members-selected'),
        this.translate.instant('team.actions.close'),
        { duration: 5000 }
      );
      return;
    }

    // Validar que los especialistas tengan especialidad asignada
    const invalidMembers = membersArray.controls.filter(control => {
      const roleValue = control.get('role')?.value;
      const specialtyValue = control.get('specialty')?.value;
      return roleValue === ProjectRole.SPECIALIST && !specialtyValue;
    });

    if (invalidMembers.length > 0) {
      this.snackBar.open(
        this.translate.instant('team.errors.specialists-need-specialty'),
        this.translate.instant('team.actions.close'),
        { duration: 5000 }
      );
      return;
    }

    this.loading = true;

    // Crear array de observables para cada nuevo miembro
    const addMemberRequests = membersArray.controls.map(control => {
      const memberId = control.get('id')?.value;
      const role = control.get('role')?.value;
      const specialty = control.get('specialty')?.value; // Valor por defecto si no es especialista

      // Encontrar el miembro de la organización correspondiente
      const orgMember = this.orgMembers.find(m => m.id === memberId);

      if (!orgMember) {
        throw new Error(`Organization member with ID ${memberId} not found`);
      }

      // Obtener el personId usando el método existente
      const personId = this.getPersonIdFromOrgMember(orgMember);

      // Crear el nuevo miembro del equipo
      const newTeamMember = new ProjectTeamMember({
        id: 0, // Valor temporal
        firstName: '',
        lastName: '',
        role: role,
        specialty: specialty,
        projectId: Number(this.projectId ? this.projectId.toString() : 0),
        personId: Number(personId)
      });

      return this.teamMemberService.create(newTeamMember);
    });

    // Procesar todas las solicitudes
    if (addMemberRequests.length > 0) {
      forkJoin(addMemberRequests)
        .subscribe({
          next: () => {
            this.dialog.closeAll();
            this.loading = false;

            this.snackBar.open(
              this.translate.instant('team.success.members-added'),
              this.translate.instant('team.actions.close'),
              { duration: 3000 }
            );

            // Recargar los miembros del equipo
            this.loadTeamMembers();
          },
          error: (error) => {
            console.error('Error adding team members:', error);
            this.loading = false;

            this.snackBar.open(
              this.translate.instant('team.errors.add-members'),
              this.translate.instant('team.actions.close'),
              { duration: 5000 }
            );
          }
        });
    } else {
      this.loading = false;
      this.dialog.closeAll();
    }
  }

  // Método para extraer el personId de un miembro de la organización
  // Esto podría necesitar ajustes según cómo esté estructurada tu aplicación
  private getPersonIdFromOrgMember(orgMember: OrganizationMemberDisplay): string {
    // Asumimos que tenemos el email y podemos encontrar a la persona por él
    return orgMember.id;
  }

  // Traducciones para roles y especialidades
  getProjectRoleTranslation(role: ProjectRole): string {
    return this.translate.instant(`team.roles.${role}`);
  }

  getSpecialtyTranslation(specialty: string): string {
    return this.translate.instant(`team.specialties.${specialty}`);
  }

  // Métodos para actualizar roles y especialidades durante la adición de miembros
  updateMemberRole(member: OrganizationMemberDisplay, role: ProjectRole): void {
    member.role = role;

    const membersArray = this.memberForm.get('members') as FormArray;
    const index = this.getFormArrayIndex(membersArray, member.id);

    if (index !== -1) {
      const memberGroup = membersArray.at(index) as FormGroup;
      memberGroup.patchValue({ role });

      // Si el rol no es especialista, eliminamos la especialidad
      if (role !== ProjectRole.SPECIALIST) {
        memberGroup.patchValue({ specialty: null });
        member.specialty = null;
      } else if (!member.specialty) {
        // Si es especialista pero no tiene especialidad, marcamos el campo como requerido
        memberGroup.get('specialty')?.setValidators(Validators.required);
        memberGroup.get('specialty')?.updateValueAndValidity();
      }
    }
  }

  updateMemberSpecialty(member: OrganizationMemberDisplay, specialty: Specialty): void {
    member.specialty = specialty;

    const membersArray = this.memberForm.get('members') as FormArray;
    const index = this.getFormArrayIndex(membersArray, member.id);

    if (index !== -1) {
      const memberGroup = membersArray.at(index) as FormGroup;
      memberGroup.patchValue({ specialty });
    }
  }

  // Métodos para eliminar miembros
  openRemoveMemberDialog(member: TeamMemberDisplay): void {
    this.selectedMember = member;
    this.dialog.open(this.removeMemberDialog, {
      width: '500px'
    });
  }

  submitRemoveMember(): void {
    if (!this.selectedMember || !this.projectId) {
      return;
    }

    this.loading = true;
    const memberId = this.selectedMember.id;

    this.projectService.deleteProjectMember(this.projectId, memberId).subscribe({
      next: () => {
        this.dialog.closeAll();
        this.loading = false;

        this.snackBar.open(
          this.translate.instant('team.success.member-removed'),
          this.translate.instant('team.actions.close'),
          { duration: 3000 }
        );

        // Recargar los miembros del equipo
        this.loadTeamMembers();
      },
      error: (error: any) => {
        console.error('Error detallado al eliminar miembro del equipo:', error);
        this.loading = false;

        if (error.status === 400) {
          this.error = 'Proyecto o miembro inválido';
        } else if (error.status === 401 || error.status === 403) {
          this.error = 'No autorizado para eliminar miembros';
        } else {
          this.error = this.translate.instant('team.errors.remove-member');
        }

        const msg = this.error ?? this.translate.instant('team.errors.remove-member');
        this.snackBar.open(
          msg,
          this.translate.instant('team.actions.close'),
          { duration: 5000 }
        );
      }
    });
  }
}
