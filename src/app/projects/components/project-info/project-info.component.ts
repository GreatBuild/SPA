import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Project } from '../../model/project.entity';
import { ProjectService } from '../../services/project.service';
import { SessionService } from '../../../iam/services/session.service';
import { TranslateModule } from '@ngx-translate/core';
import { ProjectStatus } from '../../model/project-status.vo';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import {Person} from '../../../iam/model/person.entity';
import {PhoneNumber} from '../../../iam/model/phone-number.vo';
import {ProjectTeamMember} from '../../model/project-team-member.entity';

@Component({
  selector: 'app-project-info',
  imports: [CommonModule, MatCardModule, TranslateModule],
  standalone: true,
  templateUrl: './project-info.component.html',
  styleUrl: './project-info.component.css'
})
export class ProjectInfoComponent implements OnInit, OnDestroy {
  project: Project | null = null;
  loading = true;
  error: string | null = null;
  private routeSubscription: Subscription | null = null;

  constructor(
    private projectService: ProjectService,
    private sessionService: SessionService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Cargar el proyecto inmediatamente usando la sesión o parámetro de ruta
    this.loadProject();

    // También suscribirse a cambios en la ruta
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
    // Limpiar suscripción para prevenir memory leaks
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadProjectById(projectId: string): void {
    this.loading = true;
    this.error = null;

    this.projectService.getById(null, { id: projectId }).subscribe({
      next: (json: any) => {
        const phoneRaw = json.contractingEntity.phone || '0000000000';

        const contractingEntity = new Person({
          id: json.contractingEntity.id,
          firstName: json.contractingEntity.firstName,
          lastName: json.contractingEntity.lastName,
          email: json.contractingEntity.email,
          phone: new PhoneNumber(phoneRaw)
        });


        const project = new Project({
          id: json.projectId,
          name: json.name,
          description: json.description,
          status: json.status,
          startingDate: new Date(json.startingDate),
          endingDate: new Date(json.endingDate),
          organizationId: json.organizationId,
          contractingEntity,
          activeChangeProcessId: json.activeChangeProcessId,
          currentUserRoleOnProject: json.currentUserRoleOnProject,
          team: json.team?.map((member: any) => new ProjectTeamMember(member)) ?? []
        });

        this.project = project;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading project:', error);
        this.error = 'Error al cargar el proyecto';
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
        },
        error: (error: Error) => {
          console.error('Error loading project:', error);
        }
      });
    } else {
      console.error('No project ID found in session');
    }
  }

  getStatusTranslation(status: string): string {
    // Mapeamos los estados del proyecto a cadenas legibles
    const statusMap: Record<string, string> = {
      [ProjectStatus.BASIC_STUDIES]: 'Estudios Básicos',
      [ProjectStatus.DESIGN_IN_PROCESS]: 'Diseño en Proceso',
      [ProjectStatus.CHANGE_REQUESTED]: 'Rechazado',
      [ProjectStatus.APPROVED]: 'Aprobado'
    };

    return statusMap[status] || status;
  }
}
