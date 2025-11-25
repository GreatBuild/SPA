import {Component, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ChangeProcess} from '../../../changes/model/change-process.entity';
import {ChangeProcessStatus} from '../../../changes/model/change-process-status.vo';
import {ChangeProcessService} from '../../../changes/services/change-process.service';
import {SessionService} from '../../../iam/services/session.service';
import {UserType} from '../../../iam/model/user-type.vo';
import {
  MatCard,
  MatCardModule,
  MatCardTitle
} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgClass, NgForOf, NgIf} from '@angular/common';
import {MatButton} from '@angular/material/button';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {ChangeOrigin} from '../../../changes/model/change-origin.vo';
import {TranslatePipe} from '@ngx-translate/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatSelectModule} from '@angular/material/select';

type ChangeItem = ChangeProcess & { title?: string };

@Component({
  selector: 'app-change-management',
  templateUrl: './change-management.component.html',
  styleUrls: ['./change-management.component.css'],
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatCard,
    MatCardTitle,
    NgIf,
    NgForOf,
    MatButton,
    MatProgressSpinner,
    NgClass,
    TranslatePipe,
    DatePipe,
    MatCardModule,
    MatSelectModule
  ],
})
export class ChangeManagementComponent implements OnInit {
  changeProcess = signal<ChangeItem[]>([]);

  pendingRequest = signal<ChangeProcess | null>(null);
  resolvedRequests = signal<ChangeProcess[]>([]);

  changeRequest: any = { title: '', justification: '' };
  changeRequests: ChangeProcess[] = [];
  loading = false;
  error: string | null = null;
  success = false;
  showForm = false;
  responseState: Record<string | number, { response: string; status: 'APPROVED' | 'REJECTED' }> = {};

  projectId!: number;
  isClient = false;
  isContractor = false;

  constructor(
    private route: ActivatedRoute,
    private changeProcessService: ChangeProcessService,
    private sessionService: SessionService,
    private snackBar: MatSnackBar
  ) {
  }

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId'));

    this.resetForm();
    this.loadUserRole();

    if (this.isContractor) {
      this.loadChangeRequests();
    }
  }

  private loadUserRole(): void {
    const userType = this.sessionService.getUserType();
    this.isClient = userType === UserType.TYPE_CLIENT;
    this.isContractor = userType === UserType.TYPE_WORKER;
    console.log('💼 User type:', this.sessionService.getUserType());

  }

  private async loadChangeRequests(): Promise<void> {
    const projectId = this.sessionService.getProjectId();

    if (!projectId) {
      console.warn('No project ID found in session. Aborting load.');
      return;
    }

    this.loading = true;
    this.error = null;

    this.changeProcessService.getChangeProcesses({}, { projectId }).subscribe({
        next: (requests: ChangeItem[]) => {
          this.changeProcess.set(requests);
        // inicializar estado de respuesta para cada cambio pendiente
        requests.forEach(req => {
          if (!this.responseState[req.id as any]) {
            this.responseState[req.id as any] = { response: '', status: 'APPROVED' };
          }
        });
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar cambios:', err);
        if (err.status === 401) {
          this.error = 'No autenticado para ver cambios.';
        } else if (err.status === 403 || err.status === 400) {
          this.error = 'No tienes permisos o el proyecto no existe.';
        } else if (err.status === 404) {
          this.error = 'Proyecto no encontrado.';
        } else if (err.status === 503) {
          this.error = 'Servicio no disponible. Intenta más tarde.';
        } else {
          this.error = 'Error al cargar las solicitudes de cambio.';
        }
        this.loading = false;
      }
    });
  }

  startNewChangeRequest(): void {
    this.resetForm();
    this.success = false;
    this.error = null;
    this.showForm = true;
  }

  onCancel(): void {
    this.resetForm();
    this.showForm = false;
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) return;

    this.loading = true;
    this.error = null;
    this.success = false;

    try {
      const projectId = this.sessionService.getProjectId();
      if (!projectId) {
        this.error = 'No se puede enviar el cambio porque no hay proyecto activo.';
        this.loading = false;
        return;
      }

      this.changeProcessService.getChangeProcesses({}, { projectId }).subscribe({
        next: (allChanges: ChangeItem[]) => {
          const alreadyPending = allChanges.find(
            (c) => c.projectId === projectId && c.status === ChangeProcessStatus.PENDING
          );

          if (alreadyPending) {
            this.error = 'Ya existe una solicitud pendiente. Debe resolverse antes de crear una nueva.';
            this.loading = false;
            return;
          }

          const newChangeProcess = {
            projectId,
            title: this.changeRequest.title,
            justification: this.changeRequest.justification
          };

          this.changeProcessService.createChangeProcess(newChangeProcess).subscribe({
            next: () => {
              this.success = true;
              this.resetForm();
              this.showForm = false;
              this.loadChangeRequests();
            },
            error: (err: any) => {
              if (err.status === 401) {
                this.error = 'No autenticado para crear cambios.';
              } else if (err.status === 403 || err.status === 400) {
                this.error = 'No tienes permisos o el proyecto no existe.';
              } else if (err.status === 404) {
                this.error = 'Proyecto no encontrado.';
              } else if (err.status === 503) {
                this.error = 'Servicio no disponible. Intenta más tarde.';
              } else {
                this.error = 'Ocurrió un error al crear la solicitud de cambio.';
              }
            }
          });
        },
        error: (err: any) => {
          if (err.status === 401) {
            this.error = 'No autenticado.';
          } else if (err.status === 403 || err.status === 400) {
            this.error = 'No tienes permisos o el proyecto no existe.';
          } else if (err.status === 404) {
            this.error = 'Proyecto no encontrado.';
          } else if (err.status === 503) {
            this.error = 'Servicio no disponible. Intenta más tarde.';
          } else {
            this.error = 'Error al verificar si ya existe una solicitud pendiente.';
          }
          this.loading = false;
        }
      });
    } catch {
      this.error = 'Error inesperado al procesar el cambio.';
      this.loading = false;
    }
  }

 private resetForm(): void {
    this.changeRequest = { title: '', justification: '' };
    this.error = null;
    this.success = false;
  }

  isFormValid(): boolean {
    return this.changeRequest.title.trim().length >= 3 &&
      this.changeRequest.justification.trim().length >= 3;
  }

  private showSnackBar(message: string, type: 'success' | 'error' | 'info' | 'warn'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: [`snackbar-${type}`]
    });
  }

  respondChangeRequest(request: ChangeProcess, quickStatus?: 'APPROVED' | 'REJECTED'): void {
    const state = this.responseState[request.id as any] || { response: '', status: 'APPROVED' };
    const statusToSend = quickStatus ?? state.status;
    const responseText = state.response?.trim();

    if (!responseText) {
      this.showSnackBar('Debes ingresar una respuesta', 'warn');
      return;
    }

    if (!['APPROVED', 'REJECTED'].includes(statusToSend)) {
      this.showSnackBar('Estado inválido', 'error');
      return;
    }

    this.loading = true;
    this.changeProcessService.respondChangeProcess(request.id as any, {
      response: responseText,
      status: statusToSend
    }).subscribe({
      next: () => {
        this.showSnackBar('Respuesta registrada', statusToSend === 'APPROVED' ? 'success' : 'info');
        this.loadChangeRequests();
      },
      error: (err: any) => {
        console.error('Error al responder cambio:', err);
        if (err.status === 400) {
          this.error = 'No se puede responder (solo solicitudes PENDING o no eres coordinador)';
        } else if (err.status === 401) {
          this.error = 'No autenticado.';
        } else if (err.status === 403) {
          this.error = 'No autorizado para responder.';
        } else if (err.status === 503) {
          this.error = 'Servicio no disponible. Intenta más tarde.';
        } else {
          this.error = 'Error al responder la solicitud de cambio.';
        }
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  onResponseChange(id: number | undefined, value: string): void {
    const key = id ?? 0;
    if (!this.responseState[key]) {
      this.responseState[key] = { response: '', status: 'APPROVED' };
    }
    this.responseState[key].response = value;
  }

  onStatusChange(id: number | undefined, value: 'APPROVED' | 'REJECTED'): void {
    const key = id ?? 0;
    if (!this.responseState[key]) {
      this.responseState[key] = { response: '', status: 'APPROVED' };
    }
    this.responseState[key].status = value;
  }

  getStatusColor(status: ChangeProcessStatus): string {
    switch (status) {
      case ChangeProcessStatus.PENDING: return 'warn';
      case ChangeProcessStatus.APPROVED: return 'primary';
      case ChangeProcessStatus.REJECTED: return 'accent';
      default: return 'basic';
    }
  }

}
