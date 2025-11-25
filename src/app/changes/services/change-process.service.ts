import { Injectable } from '@angular/core';
import {createDynamicService} from '../../shared/services/create-dynamic-service';
import {ChangeProcess} from '../model/change-process.entity';
import {createEndpointConfig} from '../../shared/model/endpoint-config.vo';
import {HttpMethod} from '../../shared/model/http-method.vo';

@Injectable({
  providedIn: 'root'
})
export class ChangeProcessService {
  private readonly service = createDynamicService<ChangeProcess>([
    createEndpointConfig({ name: 'getAll', method: HttpMethod.GET }, undefined, 'change-processes'),
    createEndpointConfig({ name: 'getByProject', method: HttpMethod.GET }, undefined, 'change-processes'),
    createEndpointConfig({ name: 'getByProjectId', method: HttpMethod.GET }, undefined, 'change-process', '/by-project-id/:projectId'),
    createEndpointConfig({ name: 'create', method: HttpMethod.POST }, undefined, 'change-process'),
    createEndpointConfig({ name: 'respond', method: HttpMethod.PATCH }, undefined, 'change-process', '/:id'),
    createEndpointConfig({ name: 'update', method: HttpMethod.PUT }, undefined, 'change-processes', '/:id'),
    createEndpointConfig({ name: 'delete', method: HttpMethod.DELETE }, undefined, 'change-processes','/:id'),
  ]);
  getAll = this.service['getAll'];
  getByProject = this.service['getByProject'];
  getByProjectId = this.service['getByProjectId'];
  getChangeProcesses = this.service['getByProjectId'];
  create = this.service['create'];
  createChangeProcess = this.service['create'];
  respond = this.service['respond'];
  update = this.service['update'];
  delete = this.service['delete'];

  /**
   * Responde una solicitud de cambio (PATCH /change-process/:id).
   */
  respondChangeProcess(id: number | string, payload: { response: string; status: string }) {
    return this.respond(payload, { id });
  }
}
