import {Routes} from '@angular/router';
import {UserTypeGuard} from './iam/guards/user-type';
import {WorkerLayoutComponent} from './organizations/pages/worker-layout/worker-layout.component';
import {ClientLayoutComponent} from './projects/pages/client-layout/client-layout.component';
import {OrgRoleGuard} from './organizations/guards/org-role';
import {OrganizationMemberGuard} from './organizations/guards/organization-member-guard';
import {OrganizationLayoutComponent} from './organizations/pages/organization-layout/organization-layout.component';
import {ProjectAccessGuard} from './projects/guards/project-acces-guard';
import {ProjectLayoutComponent} from './projects/pages/project-layout/project-layout.component';
import {MilestoneAccessGuard} from './projects/guards/milestone-acces-guard';
import {MilestoneLayoutComponent} from './projects/pages/milestone-layout/milestone-layout.component';
import {UserType} from './iam/model/user-type.vo';
import {OrganizationMemberType} from './organizations/model/organization-member-type.vo';

export const routes: Routes = [
  // Public
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./iam/pages/login-page/login-page.component').then(m => m.LoginPageComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./iam/pages/register-page/register-page.component').then(m => m.RegisterPageComponent)
  },
  {
    path: 'auth/select-role',
    loadComponent: () => import('./iam/pages/select-role-page/select-role-page.component').then(m => m.SelectRolePageComponent)
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./iam/pages/oauth-callback-page/oauth-callback-page.component').then(m => m.OauthCallbackPageComponent)
  },

  // Views for Worker
  {
    path: '',
    canActivate: [UserTypeGuard],
    data: { expectedUserType: UserType.TYPE_WORKER },
    component: WorkerLayoutComponent,
    children: [
      {
        path: 'organizations',
        loadComponent: () => import('./organizations/pages/organization-tab/organization-tab.component').then(m => m.OrganizationTabComponent)
      },
      {
        path: 'invitations',
        loadComponent: () => import('./organizations/components/invitation-list/invitation-list.component').then(m => m.InvitationListComponent)
      }
    ]
  },

  // Views for Client
  {
    path: '',
    canActivate: [UserTypeGuard],
    data: { expectedUserType: UserType.TYPE_CLIENT },
    component: ClientLayoutComponent,
    children: [
      {
        path: 'projects',
        loadComponent: () => import('./projects/pages/client-layout/client-layout.component').then(m => m.ClientLayoutComponent)
      }
    ]
  },

  // Active Organization
  {
    path: 'organizations/:orgId',
    canActivate: [OrganizationMemberGuard],
    component: OrganizationLayoutComponent,
    children: [
      { path: '', redirectTo: 'info', pathMatch: 'full' },
      {
        path: 'info',
        loadComponent: () => import('./organizations/pages/organization-information-tab/organization-information-tab.component').then(m => m.OrganizationInformationTabComponent)
      },
      {
        path: 'projects',
        loadComponent: () => import('./organizations/components/projects/projects.component').then(m => m.ProjectsComponent)
      },      {
        path: 'members',
        canActivate: [OrgRoleGuard],
        data:{roles: [OrganizationMemberType.CONTRACTOR, OrganizationMemberType.WORKER] },
        loadComponent: () => import('./organizations/pages/member-tab/member-tab.component').then(m => m.MemberTabComponent)
      },
      {
        path: 'settings',
        canActivate: [OrgRoleGuard],
        data: { roles: [OrganizationMemberType.CONTRACTOR] },
        loadComponent: () => import('./organizations/pages/configuration-tab/configuration-tab.component').then(m => m.ConfigurationTabComponent)
      }
    ]
  },

  // Active Project
  {
    path: 'projects/:projectId',
    canActivate: [ProjectAccessGuard],
    component: ProjectLayoutComponent,
    children: [
      { path: '', redirectTo: 'information', pathMatch: 'full' },
      {
        path: 'information',
        loadComponent: () => import('./projects/components/project-info/project-info.component').then(m => m.ProjectInfoComponent)
      },
      {
        path: 'schedule',
        loadComponent: () => import('./projects/components/schedule/schedule.component').then(m => m.ScheduleComponent)
      },
      {
        path: 'working-team',
        loadComponent: () => import('./projects/components/team/team.component').then(m => m.TeamComponent)
      },
      {
        path: 'change-management',
        loadComponent: () => import('./projects/components/change-management/change-management.component').then(m => m.ChangeManagementComponent)
      },
      {
        path: 'configuration',
        canActivate: [OrgRoleGuard],
        data: { roles: [OrganizationMemberType.CONTRACTOR] },
        loadComponent: () => import('./projects/components/project-configuration/project-configuration.component').then(m => m.ProjectConfigurationComponent)
      }
    ]
  },

  // Milestone
  {
    path: 'projects/:projectId/milestones/:milestoneId',
    canActivate: [MilestoneAccessGuard],
    component: MilestoneLayoutComponent,
    children: [
      { path: '', redirectTo: 'tasks', pathMatch: 'full' },
      {
        path: 'tasks',
        loadComponent: () => import('./projects/components/task-list/task-list.component').then(m => m.TaskListComponent)
      },
      {
        path: 'meetings',
        loadComponent: () => import('./projects/components/meeting-list/meeting-list.component').then(m => m.MeetingListComponent)
      },
      {
        path: 'configuration',
        canActivate: [OrgRoleGuard],
        data: { roles: [OrganizationMemberType.CONTRACTOR] },
        loadComponent: () => import('./projects/components/milestone-configuration/milestone-configuration.component').then(m => m.MilestoneConfigurationComponent)
      }
    ]
  },

  // Task / Meeting
  {
    path: 'projects/:projectId/milestones/:milestoneId/tasks/:taskId',
    loadComponent: () => import('./projects/components/task-detail/task-detail.component').then(m => m.TaskDetailComponent)
  },
  {
    path: 'projects/:projectId/milestones/:milestoneId/meetings/:meetingId',
    loadComponent: () => import('./projects/components/meeting-detail/meeting-detail.component').then(m => m.MeetingDetailComponent)
  },

  // Default and unauthorized route
  {
    path: 'unauthorized',
    loadComponent: () => import('./public/pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
