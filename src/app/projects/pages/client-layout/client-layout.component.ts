import {Component, signal} from '@angular/core';
import {ToolbarClientComponent} from '../../../public/components/toolbar-client/toolbar-client.component';
import {ProjectListComponent} from '../../components/project-list/project-list.component';
import {ProjectService} from '../../services/project.service';
import {Project} from '../../model/project.entity';
import {SessionService} from '../../../iam/services/session.service';
import {UserType} from '../../../iam/model/user-type.vo';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [
    ToolbarClientComponent,
    ProjectListComponent
  ],
  templateUrl: './client-layout.component.html',
  styleUrl: './client-layout.component.css'
})

export class ClientLayoutComponent {
  projects = signal<Project[]>([]);
  userType = UserType.TYPE_CLIENT; // Utilizar el valor correcto definido en el enum

  constructor(
    private projectService: ProjectService,
    private session: SessionService
  ) {
    this.loadProjects();
  }

  loadProjects() {
    this.projectService.getByClientId().subscribe({
      next: (projects: any[]) => {
        const mapped = (projects || []).map(p => ({
          ...p,
          name: p.projectName ?? p.name ?? 'Proyecto',
          startingDate: new Date(p.startDate ?? p.startingDate ?? Date.now()),
          endingDate: new Date(p.endDate ?? p.endingDate ?? Date.now()),
          team: Array.isArray(p.team) ? p.team : new Array(p.memberCount ?? 0).fill(null)
        })) as unknown as Project[];
        this.projects.set(mapped);
      },
      error: (error: any) => {
        console.error('Error loading projects:', error);
      }
    });

  }

}
