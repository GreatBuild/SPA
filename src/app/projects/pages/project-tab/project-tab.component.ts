import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import { MatDividerModule } from "@angular/material/divider";
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe } from "@ngx-translate/core";
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { ProjectListComponent } from '../../components/project-list/project-list.component';
import { Project } from '../../model/project.entity';
import { MatDialog } from '@angular/material/dialog';
import { SessionService } from '../../../iam/services/session.service';
import { ProjectService, CreateProjectRequest } from '../../services/project.service';
import { CreateProjectModalComponent } from '../../components/create-project-modal/create-project-modal.component';
import { OrganizationService } from '../../../organizations/services/organization.service';

@Component({
  selector: 'app-project-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatDividerModule,
    MatButtonModule,
    ProjectListComponent,
    TranslatePipe
  ],
  templateUrl: './project-tab.component.html',
  styleUrl: './project-tab.component.css'
})
export class ProjectTabComponent implements OnInit {
  projects = signal<Project[]>([]);
  loading = signal<boolean>(true);
  organizationId: number | null = null;

  constructor(
    private projectService: ProjectService,
    private dialog: MatDialog,
    private session: SessionService,
    private organizationService: OrganizationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const orgId = this.session.getOrganizationId() ?? null;

    console.log('[DEBUG] ORG ID:', orgId);

    if (!orgId) {
      this.loading.set(false);
      return;
    }

    this.organizationService.getById({}, { id: orgId }).subscribe({
      error: (err: Error) => {
        console.error(`Failed to load organization with ID ${orgId}:`, err);
        this.loading.set(false);
      }
    });

    this.organizationId = orgId;
    this.loadProjectsForOrganization(orgId);
  }

  loadProjectsForOrganization(organizationId: number): void {
    this.loading.set(true);

    this.projectService.getMyProjectsByOrganization({}, { orgId: organizationId }).subscribe({
      next: (projects: Project[]) => {
        console.log('[DEBUG] Proyectos recibidos del gateway:', projects);

        // Adaptar campos del gateway (startDate/endDate/projectName/memberCount) a la vista
        const mapped = (projects || []).map(p => ({
          ...p,
          name: (p as any).projectName ?? (p as any).name ?? 'Proyecto',
          startingDate: new Date((p as any).startDate ?? (p as any).startingDate),
          endingDate: new Date((p as any).endDate ?? (p as any).endingDate),
          // Si solo llega memberCount, crear arreglo “virtual” para que el badge use la longitud
          team: Array.isArray((p as any).team) ? (p as any).team : new Array((p as any).memberCount ?? 0).fill(null),
          currentUserRoleOnProject: (p as any).currentUserRoleOnProject // puede venir undefined, la card lo maneja
        }));

        this.projects.set(mapped as Project[]);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('[ERROR] Cargando proyectos por organización:', err);
        let errorMessage = 'No se pudieron cargar los proyectos';

        if (err.status === 401) {
          errorMessage = 'No hay sesión válida. Inicia sesión nuevamente.';
        } else if (err.status === 403) {
          errorMessage = 'No tienes permisos para ver los proyectos de esta organización';
        }

        this.snackBar.open(`❌ ${errorMessage}`, 'Cerrar', {
          duration: 4000,
          panelClass: ['snackbar-error']
        });
        this.loading.set(false);
      }
    });
  }

  openCreateDialog(): void {
    if (!this.organizationId) {
      console.error("Cannot create a project without an organization");
      this.snackBar.open('❌ No se pudo identificar la organización', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      return;
    }

    const dialogRef = this.dialog.open(CreateProjectModalComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: any | undefined) => {
      if (result) {
        console.log('[DEBUG] Modal result:', result);
        console.log('[DEBUG] Current user type:', this.session.getUserType());
        console.log('[DEBUG] Current org role:', this.session.getOrganizationRole());
        console.log('[DEBUG] Current org ID:', this.session.getOrganizationId());
        console.log('[DEBUG] Token exists:', !!this.session.getToken());

        // Crear el payload con el email del contratante (el backend espera email, no ID)
        const createRequest: CreateProjectRequest = {
          projectName: result.projectName,
          description: result.description,
          endDate: result.endDate,
          organizationId: result.organizationId,
          contractingEntityEmail: result.contractingEntityEmail
        };

        console.log('[DEBUG] Sending createProject request:', createRequest);

        // Ahora crear el proyecto directamente con el email
        this.projectService.createProject(createRequest).subscribe({
          next: (response) => {
            console.log('✅ Project created successfully:', response);
            this.snackBar.open(`✅ Proyecto "${response.projectName}" creado exitosamente`, 'Cerrar', {
              duration: 4000,
              panelClass: ['snackbar-success']
            });
            // Recargar la lista de proyectos
            this.loadProjectsForOrganization(this.organizationId!);
          },
          error: (err: any) => {
            console.error('❌ Failed to create project:', err);
            console.error('[DEBUG] Error details:', {
              status: err.status,
              statusText: err.statusText,
              error: err.error,
              message: err.message
            });
            let errorMessage = 'Error al crear el proyecto';

            if (err.status === 400) {
              if (err.error?.message) {
                errorMessage = err.error.message;
              } else if (err.error?.errors) {
                errorMessage = Object.values(err.error.errors).join(', ');
              }
            } else if (err.status === 403) {
              errorMessage = 'No tienes permisos para crear proyectos en esta organización';
              console.error('[DEBUG] 403 Forbidden - Posibles causas:');
              console.error('  1. El usuario no es ROLE_WORKER');
              console.error('  2. El usuario no es CONTRACTOR de la organización');
              console.error('  3. El token JWT no es válido o expiró');
              console.error('  4. El usuario no pertenece a la organización');
            } else if (err.status === 503) {
              errorMessage = 'Error de comunicación con el servidor. Intenta nuevamente.';
            }

            this.snackBar.open(`❌ ${errorMessage}`, 'Cerrar', {
              duration: 5000,
              panelClass: ['snackbar-error']
            });
          }
        });
      }
    });
  }

}
