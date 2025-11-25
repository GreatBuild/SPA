import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { ProjectService, UpdateProjectRequest } from '../../services/project.service';
import { SessionService } from '../../../iam/services/session.service';
import { TranslateModule } from '@ngx-translate/core';
import { ProjectStatus } from '../../model/project-status.vo';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrganizationService } from '../../../organizations/services/organization.service';
import { UserAccountService } from '../../../iam/services/user-account.service';
import { FormsModule } from '@angular/forms';

interface ProjectView {
  id: number;
  name: string;
  description?: string;
  status: string;
  startingDate: Date;
  endingDate: Date;
  organizationId: number;
  contractingEntityId?: number;
  createdAt?: Date;
  memberCount?: number;
  organizationName?: string;
  contractingEntityName?: string;
}

@Component({
  selector: 'app-project-info',
  imports: [CommonModule, MatCardModule, TranslateModule, FormsModule],
  standalone: true,
  templateUrl: './project-info.component.html',
  styleUrl: './project-info.component.css'
})
export class ProjectInfoComponent implements OnInit, OnDestroy {
  project: ProjectView | null = null;
  loading = true;
  error: string | null = null;
  private routeSubscription: Subscription | null = null;
  private currentProjectId: string | null = null;

  // Estados para operaciones de actualización (se mantienen por compatibilidad con template)
  updateLoading = false;
  updateError: string | null = null;
  updateSuccess: string | null = null;

  statusLoading = false;
  statusError: string | null = null;
  statusSuccess: string | null = null;

  editMode = false;
  saveLoading = false;
  saveError: string | null = null;
  formModel: {
    projectName: string;
    description: string;
    endDate: string;
    contractingEntityEmail: string;
    status: string;
  } = {
    projectName: '',
    description: '',
    endDate: '',
    contractingEntityEmail: '',
    status: ''
  };

  constructor(
    private projectService: ProjectService,
    private sessionService: SessionService,
    private route: ActivatedRoute,
    private organizationService: OrganizationService,
    private userAccountService: UserAccountService
  ) {}

  ngOnInit(): void {
    const fromRoute = this.route.snapshot.paramMap.get('projectId') ?? this.route.parent?.snapshot.paramMap.get('projectId');
    const fromSession = this.sessionService.getProjectId();
    const projectId = fromRoute ?? (fromSession ? fromSession.toString() : null);

    if (projectId) {
      this.loadProjectById(projectId);
    } else {
      this.error = 'No se encontró el ID del proyecto';
      this.loading = false;
    }

    this.routeSubscription = this.route.parent?.paramMap.subscribe(params => {
      const pid = params.get('projectId');
      if (pid) {
        this.loadProjectById(pid);
      }
    }) ?? null;
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
      next: (json: any) => {
        const mapped: ProjectView = {
          id: json.id ?? json.projectId,
          name: json.projectName ?? json.name,
          description: json.description,
          status: json.status,
          startingDate: new Date(json.startDate ?? json.startingDate ?? Date.now()),
          endingDate: new Date(json.endDate ?? json.endingDate ?? Date.now()),
          organizationId: json.organizationId,
          contractingEntityId: json.contractingEntityId ?? json.contractingEntity?.id,
          createdAt: json.createdAt ? new Date(json.createdAt) : undefined,
          memberCount: json.memberCount ?? (Array.isArray(json.team) ? json.team.length : undefined)
        };

        this.project = mapped;
        this.currentProjectId = mapped.id?.toString() ?? null;
        this.loading = false;

        if (mapped.organizationId) {
          this.fetchOrganizationName(mapped.organizationId);
        }

        if (mapped.contractingEntityId) {
          this.fetchContractingEntityName(mapped.contractingEntityId);
        }

        this.setFormModel(mapped);
      },
      error: (error: any) => {
        console.error('Error loading project:', error);
        if (error.status === 404) {
          this.error = 'Proyecto no encontrado';
        } else if (error.status === 401 || error.status === 403) {
          this.error = 'No autorizado para ver este proyecto';
        } else {
          this.error = 'Error al cargar el proyecto';
        }
        this.loading = false;
      }
    });
  }

  getStatusTranslation(status: string): string {
    const statusMap: Record<string, string> = {
      [ProjectStatus.BASIC_STUDIES]: 'Estudios Básicos',
      [ProjectStatus.DESIGN_IN_PROCESS]: 'Diseño en Proceso',
      [ProjectStatus.UNDER_REVIEW]: 'En revisión',
      [ProjectStatus.CHANGE_REQUESTED]: 'Cambio solicitado',
      [ProjectStatus.CHANGE_PENDING]: 'Cambio pendiente',
      [ProjectStatus.APPROVED]: 'Aprobado'
    };

    return statusMap[status] || status;
  }

  private fetchOrganizationName(id: number): void {
    this.organizationService.getById({}, { id }).subscribe({
      next: (org: any) => {
        if (this.project && this.project.organizationId === id) {
          this.project = {
            ...this.project,
            organizationName: org.commercialName ?? org.legalName ?? `Org ${id}`
          };
        }
      },
      error: () => {
        // Silencioso; dejamos ID si falla
      }
    });
  }

  private fetchContractingEntityName(userId: number): void {
    this.userAccountService.getUserInternalById(userId).subscribe({
      next: (user: any) => {
        if (this.project && this.project.contractingEntityId === userId) {
          const nameFromParts = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
          this.project = {
            ...this.project,
            contractingEntityName: (user.fullName ?? nameFromParts) || `Usuario ${userId}`
          };
        }
      },
      error: () => {
        // Silencioso; dejamos ID si falla
      }
    });
  }

  startEdit(): void {
    if (this.project) {
      this.setFormModel(this.project);
      this.editMode = true;
      this.saveError = null;
    }
  }

  cancelEdit(): void {
    this.editMode = false;
    this.saveError = null;
  }

  saveChanges(): void {
    if (!this.project || !this.currentProjectId) return;
    const payload: UpdateProjectRequest = {};

    if (this.formModel.projectName && this.formModel.projectName !== this.project.name) {
      payload.projectName = this.formModel.projectName;
    }
    if (this.formModel.description !== this.project.description) {
      payload.description = this.formModel.description || '';
    }
    if (this.formModel.status && this.formModel.status !== this.project.status) {
      payload.status = this.formModel.status as ProjectStatus;
    }
    if (this.formModel.endDate) {
      const newEnd = new Date(this.formModel.endDate);
      const currEnd = new Date(this.project.endingDate);
      if (newEnd.getTime() !== currEnd.getTime()) {
        payload.endDate = this.formModel.endDate;
      }
    }
    if (this.formModel.contractingEntityEmail && this.formModel.contractingEntityEmail !== (this.project as any).contractingEntityEmail) {
      payload.contractingEntityEmail = this.formModel.contractingEntityEmail;
    }

    if (Object.keys(payload).length === 0) {
      this.editMode = false;
      return;
    }

    this.saveLoading = true;
    this.saveError = null;

    this.projectService.updateProject(this.currentProjectId, payload).subscribe({
      next: (updated: any) => {
        // refrescar proyecto local
        this.project = {
          ...this.project!,
          name: updated.projectName ?? updated.name ?? this.project!.name,
          description: updated.description ?? this.project!.description,
          status: updated.status ?? this.project!.status,
          endingDate: updated.endDate ? new Date(updated.endDate) : this.project!.endingDate
        };
        this.editMode = false;
        this.saveLoading = false;
      },
      error: (err: any) => {
        if (err.status === 400) {
          this.saveError = 'Solicitud inválida o campos faltantes';
        } else if (err.status === 401 || err.status === 403) {
          this.saveError = 'No tienes permisos para actualizar este proyecto';
        } else {
          this.saveError = 'Error al actualizar el proyecto';
        }
        this.saveLoading = false;
      }
    });
  }

  private setFormModel(project: ProjectView): void {
    this.formModel = {
      projectName: project.name || '',
      description: project.description || '',
      endDate: project.endingDate ? project.endingDate.toISOString().slice(0, 10) : '',
      contractingEntityEmail: (project as any).contractingEntityEmail || '',
      status: project.status || ''
    };
  }
}
