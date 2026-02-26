// Repository abstraction layer
// Now backed by CAP OData v4 backend via odataClient.ts.

import { Ticket, WricefObject } from '../types/entities';
import { TicketsAPI, WricefObjectsAPI } from './odataClient';

// ---------------------------------------------------------------------------
// Ticket Repository Interface
// ---------------------------------------------------------------------------

export interface ITicketRepository {
  getAll(): Promise<Ticket[]>;
  getById(id: string): Promise<Ticket | null>;
  getByProject(projectId: string): Promise<Ticket[]>;
  getByWricefItem(wricefItemId: string): Promise<Ticket[]>;
  create(ticket: Omit<Ticket, 'id' | 'createdAt'>): Promise<Ticket>;
  update(id: string, data: Partial<Ticket>): Promise<Ticket>;
  delete(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// WricefObject Repository Interface (replaces TicketGroupRepository)
// ---------------------------------------------------------------------------

export interface IWricefObjectRepository {
  getAll(): Promise<WricefObject[]>;
  getById(id: string): Promise<WricefObject | null>;
  getByProject(projectId: string): Promise<WricefObject[]>;
  create(obj: Omit<WricefObject, 'id' | 'createdAt'>): Promise<WricefObject>;
  update(id: string, data: Partial<WricefObject>): Promise<WricefObject>;
  delete(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// CAP OData implementations
// ---------------------------------------------------------------------------

export class CAPTicketRepository implements ITicketRepository {
  async getAll(): Promise<Ticket[]> {
    return TicketsAPI.getAll();
  }

  async getById(id: string): Promise<Ticket | null> {
    const all = await TicketsAPI.getAll();
    return all.find((t) => t.id === id) ?? null;
  }

  async getByProject(projectId: string): Promise<Ticket[]> {
    return TicketsAPI.getByProject(projectId);
  }

  async getByWricefItem(wricefItemId: string): Promise<Ticket[]> {
    return TicketsAPI.getByWricefItem(wricefItemId);
  }

  async create(ticket: Omit<Ticket, 'id' | 'createdAt'>): Promise<Ticket> {
    return TicketsAPI.create(ticket as Ticket);
  }

  async update(id: string, data: Partial<Ticket>): Promise<Ticket> {
    return TicketsAPI.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return TicketsAPI.delete(id);
  }
}

export class CAPWricefObjectRepository implements IWricefObjectRepository {
  async getAll(): Promise<WricefObject[]> {
    return WricefObjectsAPI.getAll();
  }

  async getById(id: string): Promise<WricefObject | null> {
    return WricefObjectsAPI.getById(id);
  }

  async getByProject(projectId: string): Promise<WricefObject[]> {
    return WricefObjectsAPI.getByProject(projectId);
  }

  async create(obj: Omit<WricefObject, 'id' | 'createdAt'>): Promise<WricefObject> {
    return WricefObjectsAPI.create(obj as WricefObject);
  }

  async update(id: string, data: Partial<WricefObject>): Promise<WricefObject> {
    return WricefObjectsAPI.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return WricefObjectsAPI.delete(id);
  }
}

// ---------------------------------------------------------------------------
// Singleton instances – using CAP backend
// ---------------------------------------------------------------------------

export const ticketRepository: ITicketRepository = new CAPTicketRepository();
export const wricefObjectRepository: IWricefObjectRepository = new CAPWricefObjectRepository();
