import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Project } from '../../model/project.entity';
import { ProjectService, UpdateProjectRequest } from '../../services/project.service';
import { SessionService } from '../../../iam/services/session.service';
import { ProjectStatus } from '../../model/project-status.vo';
import { UserAccountService } from '../../../iam/services/user-account.service';

@Component({
  selector: 'app-project-configuration',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule,
    MatDialogModule,
    TranslateModule
  ],
  standalone: true,
  templateUrl: './project-configuration.component.html',
  styleUrl: './project-configuration.component.css'
})
export class ProjectConfigurationComponent implements OnInit, OnDestroy {
  @ViewChild('deleteConfirmDialog') deleteConfirmDialog!: TemplateRef<any>;
  projectForm: FormGroup;
  project: Project | null = null;
  projectStatuses = Object.values(ProjectStatus);
  loading = true;
  error: string | null = null;
  contractingEntityEmail = '';
  private routeSubscription: Subscription | null = null;

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private sessionService: SessionService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private translate: TranslateService,
    private userAccountService: UserAccountService
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: ['', Validators.required],
      endingDate: [new Date(), Validators.required],
      contractingEntityEmail: ['', Validators.email]
    });
  }

  ngOnInit(): void {
    this.loadProject();

    const routeSub = this.route.parent?.paramMap.subscribe(params => {
      const projectId = params.get('projectId');
      if (projectId) {
        this.loadProjectById(projectId);
      }
    });

    if (routeSub) {
      this.routeSubscription = routeSub;
    }
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadProjectById(projectId: string): void {
    this.loading = true;
    this.error = null;

    this.projectService.getById(null, { id: projectId }).subscribe({
      next: (project: Project) => {
        this.project = project;
        this.contractingEntityEmail = (project as any).contractingEntityEmail ?? (project as any)?.contractingEntity?.email ?? '';
        const contractorId = (project as any).contractingEntityId ?? (project as any)?.contractingEntity?.id;
        if (!this.contractingEntityEmail && contractorId) {
          this.fetchContractingEntityEmailFromUserId(contractorId);
        }
        this.updateForm(project);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading project:', error);
        this.error = this.translate.instant('project-configuration.messages.load-error');
        this.loading = false;
      }
    });
  }

  loadProject(): void {
    const projectId = this.sessionService.getProjectId();

    if (projectId) {
      this.projectService.getById(null, { id: projectId }).subscribe({
      next: (project: Project) => {
        this.project = project;
        // Si el modelo trae email del contratante, guardarlo para mostrarlo/editarlo
        this.contractingEntityEmail = (project as any).contractingEntityEmail ?? (project as any)?.contractingEntity?.email ?? '';
        const contractorId = (project as any).contractingEntityId ?? (project as any)?.contractingEntity?.id;
        if (!this.contractingEntityEmail && contractorId) {
          this.fetchContractingEntityEmailFromUserId(contractorId);
        }
        this.updateForm(project);
        this.loading = false;
      },
        error: (error: Error) => {
          console.error('Error loading project:', error);
          this.loading = false;
          this.error = 'Error al cargar el proyecto';
        }
      });
    } else {
      console.error('No project ID found in session');
      this.loading = false;
      this.error = 'No se encontró ID del proyecto en la sesión';
    }
  }

  updateForm(project: Project): void {
    const name = (project as any).name ?? (project as any).projectName ?? '';
    const description = (project as any).description ?? '';
    const status = (project as any).status ?? '';
    const endDateRaw = (project as any).endingDate ?? (project as any).endDate;
    const endDate = endDateRaw ? new Date(endDateRaw) : new Date();

    this.projectForm.patchValue({
      name,
      description,
      status,
      endingDate: endDate,
      contractingEntityEmail: this.contractingEntityEmail
    });
  }

  private fetchContractingEntityEmailFromUserId(userId: number): void {
    this.userAccountService.getUserInternalById(userId).subscribe({
      next: (user: any) => {
        if (!this.contractingEntityEmail && user?.email) {
          this.contractingEntityEmail = user.email;
          if (this.project) {
            this.updateForm(this.project);
          }
        }
      },
      error: () => {
        // Silencioso: si falla dejamos el campo sin modificar
      }
    });
  }

  getStatusTranslation(status: string): string {
    return this.translate.instant(`project-configuration.statuses.${status}`);
  }

  onSubmit(): void {
    if (this.projectForm.invalid || !this.project) {
      return;
    }
    const currentProject = this.project;
    if (!currentProject) return;

    const formValues = this.projectForm.value;

    // Usamos el ID directamente como número
    const projectId = Number(currentProject.id);

    const payload: UpdateProjectRequest = {};
    if (formValues.name !== currentProject.name) {
      payload.projectName = formValues.name;
    }
    if (formValues.description !== currentProject.description) {
      payload.description = formValues.description || '';
    }
    if (formValues.status && formValues.status !== currentProject.status) {
      payload.status = formValues.status;
    }
    if (formValues.endingDate) {
      const newEnd = new Date(formValues.endingDate);
      const currEnd = new Date(currentProject.endingDate);
      if (newEnd.getTime() !== currEnd.getTime()) {
        payload.endDate = newEnd.toISOString().slice(0, 10);
      }
    }
    if (formValues.contractingEntityEmail && formValues.contractingEntityEmail !== this.contractingEntityEmail) {
      payload.contractingEntityEmail = formValues.contractingEntityEmail;
    }

    if (Object.keys(payload).length === 0) {
      this.snackBar.open('No hay cambios para guardar', 'Cerrar', { duration: 3000 });
      return;
    }

    // Usar el servicio de proyectos para actualizar
    this.loading = true;

    this.projectService.updateProject(projectId, payload).subscribe({
      next: (updatedProject: any) => {
        this.loading = false;

        this.snackBar.open('Proyecto actualizado correctamente', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });

        // Actualizar el objeto local con los datos actualizados
        if (updatedProject && this.project) {
          const baseProject = this.project as Project;
          this.project = {
            ...baseProject,
            name: updatedProject.projectName ?? updatedProject.name ?? baseProject.name,
            description: updatedProject.description ?? baseProject.description,
            status: updatedProject.status ?? baseProject.status,
            endingDate: updatedProject.endDate ? new Date(updatedProject.endDate) : baseProject.endingDate
          } as Project;
          if (updatedProject.contractingEntityEmail) {
            this.contractingEntityEmail = updatedProject.contractingEntityEmail;
          }
        }
        if (this.project) {
          this.updateForm(this.project);
        }
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Error updating project:', err);
        this.snackBar.open(`Error al actualizar el proyecto: ${err.message || 'Error desconocido'}`, 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  /**
   * Abre el diálogo de confirmación para eliminar el proyecto
   */
  deleteProject(): void {
    if (!this.project) {
      return;
    }

    const dialogRef = this.dialog.open(this.deleteConfirmDialog);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.confirmDeleteProject();
      }
    });
  }

  /**
   * Realiza la eliminación del proyecto después de la confirmación
   */
  confirmDeleteProject(): void {
    if (!this.project) {
      return;
    }

    // Usamos el ID directamente como número
    const projectId = Number(this.project.id);
    this.loading = true;

    // Pasamos el ID como un simple string en el objeto params
    this.projectService.delete(null, { id: projectId }).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Proyecto eliminado correctamente', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });

        // Limpiar sesión y navegar de regreso
        this.sessionService.clearProject();

        // Si el usuario es de una organización, volvemos a la lista de proyectos de la organización
        const orgId = this.sessionService.getOrganizationId();
        if (orgId) {
          this.router.navigate([`/organizations/${orgId}/projects`]);
        } else {
          // Si es un cliente, vamos a su lista de proyectos
          this.router.navigate(['/projects']);
        }
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Error deleting project:', err);
        this.snackBar.open(`Error al eliminar el proyecto: ${err.message || 'Error desconocido'}`, 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }
}
