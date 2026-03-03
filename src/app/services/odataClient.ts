// CAP OData v4 Client Layer - Strict OData v4 Compliance
// This service provides a typed interface to the CAP OData backend
// Follows SAP CAP and OData v4 conventions strictly

import {
  User,
  Project,
  Task,
  Timesheet,
  Evaluation,
  Deliverable,
  Ticket,
  WricefObject,
  WricefItem,
  Notification,
  ReferenceData,
  Allocation,
  LeaveRequest,
  TimeLog,
  Imputation,
  ImputationPeriod,
  DocumentationObject,
  Abaque,
  TicketComment,
} from '../types/entities';

import {
  mockUsers,
  mockProjects,
  mockTasks,
  mockTimesheets,
  mockEvaluations,
  mockDeliverables,
  mockNotifications,
  mockReferenceData,
  mockAllocations,
  mockLeaveRequests,
  mockTimeLogs,
  mockImputations,
  mockImputationPeriods,
  mockAbaques,
} from './mockData';

// Configuration
const USE_MOCK_DATA = true; // Set to false when backend is available
const ODATA_BASE_URL = import.meta.env.VITE_ODATA_BASE_URL || '/odata/v4/performance';

const CAP_TICKETS_BASE_URL = '/odata/v4/performance/tickets';
const CAP_WRICEF_BASE_URL = '/odata/v4/performance/wricef';

// OData v4 Query Options
export interface ODataQueryOptions {
  $filter?: string;
  $select?: string;
  $expand?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
  $search?: string;
}

// Generic OData response wrapper (OData v4 standard)
export interface ODataResponse<T> {
  '@odata.context'?: string;
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
  value: T[];
}

// OData v4 Single Entity Response
export interface ODataSingleResponse<T> {
  '@odata.context'?: string;
  '@odata.etag'?: string;
  value?: T;
}

// OData v4 Error Response (SAP standard)
export interface ODataError {
  error: {
    code: string;
    message: string;
    target?: string;
    details?: Array<{
      code: string;
      message: string;
      target?: string;
    }>;
    innererror?: {
      errordetails?: Array<{
        code: string;
        message: string;
        severity?: string;
      }>;
    };
  };
}

// Build OData query string from options
function buildQueryString(options?: ODataQueryOptions): string {
  if (!options) return '';

  const params = new URLSearchParams();

  if (options.$filter) params.append('$filter', options.$filter);
  if (options.$select) params.append('$select', options.$select);
  if (options.$expand) params.append('$expand', options.$expand);
  if (options.$orderby) params.append('$orderby', options.$orderby);
  if (options.$top !== undefined) params.append('$top', options.$top.toString());
  if (options.$skip !== undefined) params.append('$skip', options.$skip.toString());
  if (options.$count) params.append('$count', 'true');
  if (options.$search) params.append('$search', options.$search);

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

// Generic fetch wrapper with OData v4 error handling
async function odataFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${ODATA_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      // Parse OData error response
      let errorData: ODataError | null = null;
      try {
        errorData = await response.json() as ODataError;
      } catch {
        // If JSON parsing fails, throw generic error
        throw new Error(`OData request failed: ${response.statusText}`);
      }

      // Extract error message from OData error structure
      const errorMessage = errorData?.error?.message || response.statusText;
      const errorCode = errorData?.error?.code || response.status.toString();

      throw new Error(`[${errorCode}] ${errorMessage}`);
    }

    return await response.json();
  } catch (error) {
    console.error('OData fetch error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// CAP Backend fetch (always real – for Tickets, WRICEF, Docs)
// ---------------------------------------------------------------------------
async function capFetch<T>(baseUrl: string, endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorData: ODataError | null = null;
      try {
        errorData = await response.json() as ODataError;
      } catch {
        throw new Error(`CAP request failed: ${response.statusText}`);
      }
      const errorMessage = errorData?.error?.message || response.statusText;
      throw new Error(errorMessage);
    }

    // DELETE returns no content
    if (response.status === 204) return undefined as unknown as T;

    return await response.json();
  } catch (error) {
    console.error('CAP fetch error:', error);
    throw error;
  }
}

// Mock delay to simulate network
const mockDelay = (ms: number = 300) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Users API
export const UsersAPI = {
  async getAll(): Promise<User[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockUsers];
    }
    const response = await odataFetch<ODataResponse<User>>('/Users');
    return response.value;
  },

  async getById(id: string): Promise<User | null> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockUsers.find((u) => u.id === id) || null;
    }
    return await odataFetch<User>(`/Users('${id}')`);
  },

  async create(user: Omit<User, 'id'>): Promise<User> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newUser: User = { ...user, id: `u${Date.now()}` };
      mockUsers.push(newUser);
      return newUser;
    }
    return await odataFetch<User>('/Users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  async update(id: string, user: Partial<User>): Promise<User> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockUsers.findIndex((u) => u.id === id);
      if (index !== -1) {
        mockUsers[index] = { ...mockUsers[index], ...user };
        return mockUsers[index];
      }
      throw new Error('User not found');
    }
    return await odataFetch<User>(`/Users('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(user),
    });
  },

  async delete(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockUsers.findIndex((u) => u.id === id);
      if (index !== -1) {
        mockUsers.splice(index, 1);
      }
      return;
    }
    await odataFetch<void>(`/Users('${id}')`, {
      method: 'DELETE',
    });
  },
};

// Projects API
export const ProjectsAPI = {
  async getAll(): Promise<Project[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockProjects];
    }
    const response = await odataFetch<ODataResponse<Project>>('/Projects');
    return response.value;
  },

  async getById(id: string): Promise<Project | null> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockProjects.find((p) => p.id === id) || null;
    }
    return await odataFetch<Project>(`/Projects('${id}')`);
  },

  async create(project: Omit<Project, 'id'>): Promise<Project> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newProject: Project = { ...project, id: `p${Date.now()}` };
      mockProjects.push(newProject);
      return newProject;
    }
    return await odataFetch<Project>('/Projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  },

  async update(id: string, project: Partial<Project>): Promise<Project> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockProjects.findIndex((p) => p.id === id);
      if (index !== -1) {
        mockProjects[index] = { ...mockProjects[index], ...project };
        return mockProjects[index];
      }
      throw new Error('Project not found');
    }
    return await odataFetch<Project>(`/Projects('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(project),
    });
  },

  async delete(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockProjects.findIndex((p) => p.id === id);
      if (index !== -1) {
        mockProjects.splice(index, 1);
      }
      return;
    }
    await odataFetch<void>(`/Projects('${id}')`, {
      method: 'DELETE',
    });
  },
};

// Tasks API
export const TasksAPI = {
  async getAll(): Promise<Task[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockTasks];
    }
    const response = await odataFetch<ODataResponse<Task>>('/Tasks');
    return response.value;
  },

  async getByProject(projectId: string): Promise<Task[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockTasks.filter((t) => t.projectId === projectId);
    }
    const response = await odataFetch<ODataResponse<Task>>(
      `/Tasks?$filter=projectId eq '${projectId}'`
    );
    return response.value;
  },

  async getByUser(userId: string): Promise<Task[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockTasks.filter((t) => t.assigneeId === userId);
    }
    const response = await odataFetch<ODataResponse<Task>>(
      `/Tasks?$filter=assigneeId eq '${userId}'`
    );
    return response.value;
  },

  async update(id: string, task: Partial<Task>): Promise<Task> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockTasks.findIndex((t) => t.id === id);
      if (index !== -1) {
        mockTasks[index] = { ...mockTasks[index], ...task };
        return mockTasks[index];
      }
      throw new Error('Task not found');
    }
    return await odataFetch<Task>(`/Tasks('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(task),
    });
  },

  async create(task: Omit<Task, 'id'>): Promise<Task> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newTask: Task = { ...task, id: `t${Date.now()}` };
      mockTasks.push(newTask);
      return newTask;
    }
    return await odataFetch<Task>('/Tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },
};

// Timesheets API
export const TimesheetsAPI = {
  async getByUser(userId: string): Promise<Timesheet[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockTimesheets.filter((t) => t.userId === userId);
    }
    const response = await odataFetch<ODataResponse<Timesheet>>(
      `/Timesheets?$filter=userId eq '${userId}'`
    );
    return response.value;
  },

  async create(timesheet: Omit<Timesheet, 'id'>): Promise<Timesheet> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newTimesheet: Timesheet = { ...timesheet, id: `ts${Date.now()}` };
      mockTimesheets.push(newTimesheet);
      return newTimesheet;
    }
    return await odataFetch<Timesheet>('/Timesheets', {
      method: 'POST',
      body: JSON.stringify(timesheet),
    });
  },

  async update(id: string, timesheet: Partial<Timesheet>): Promise<Timesheet> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockTimesheets.findIndex((t) => t.id === id);
      if (index !== -1) {
        mockTimesheets[index] = { ...mockTimesheets[index], ...timesheet };
        return mockTimesheets[index];
      }
      throw new Error('Timesheet not found');
    }
    return await odataFetch<Timesheet>(`/Timesheets('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(timesheet),
    });
  },
};

// Evaluations API
export const EvaluationsAPI = {
  async getAll(): Promise<Evaluation[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockEvaluations];
    }
    const response = await odataFetch<ODataResponse<Evaluation>>('/Evaluations');
    return response.value;
  },

  async getByUser(userId: string): Promise<Evaluation[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockEvaluations.filter((e) => e.userId === userId);
    }
    const response = await odataFetch<ODataResponse<Evaluation>>(
      `/Evaluations?$filter=userId eq '${userId}'`
    );
    return response.value;
  },

  async create(evaluation: Omit<Evaluation, 'id'>): Promise<Evaluation> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newEvaluation: Evaluation = {
        ...evaluation,
        id: `e${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      mockEvaluations.push(newEvaluation);
      return newEvaluation;
    }
    return await odataFetch<Evaluation>('/Evaluations', {
      method: 'POST',
      body: JSON.stringify(evaluation),
    });
  },
};

// Deliverables API
export const DeliverablesAPI = {
  async getAll(): Promise<Deliverable[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockDeliverables];
    }
    const response = await odataFetch<ODataResponse<Deliverable>>('/Deliverables');
    return response.value;
  },

  async create(deliverable: Omit<Deliverable, 'id' | 'createdAt'>): Promise<Deliverable> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newDeliverable: Deliverable = {
        ...deliverable,
        id: `d${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      mockDeliverables.unshift(newDeliverable);
      return newDeliverable;
    }
    return await odataFetch<Deliverable>('/Deliverables', {
      method: 'POST',
      body: JSON.stringify(deliverable),
    });
  },

  async update(id: string, deliverable: Partial<Deliverable>): Promise<Deliverable> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockDeliverables.findIndex((d) => d.id === id);
      if (index !== -1) {
        mockDeliverables[index] = { ...mockDeliverables[index], ...deliverable };
        return mockDeliverables[index];
      }
      throw new Error('Deliverable not found');
    }
    return await odataFetch<Deliverable>(`/Deliverables('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(deliverable),
    });
  },
};

// Tickets API – always calls real CAP backend
export const TicketsAPI = {
  async getAll(): Promise<Ticket[]> {
    const response = await capFetch<ODataResponse<Ticket>>(CAP_TICKETS_BASE_URL, '/Tickets?$expand=history');
    return (response.value || []).map(mapTicketFromOData);
  },

  async getByProject(projectId: string): Promise<Ticket[]> {
    const response = await capFetch<ODataResponse<Ticket>>(
      CAP_TICKETS_BASE_URL,
      `/Tickets?$filter=projectId eq '${projectId}'&$expand=history`
    );
    return (response.value || []).map(mapTicketFromOData);
  },

  async getByWricefItem(wricefItemId: string): Promise<Ticket[]> {
    const response = await capFetch<ODataResponse<Ticket>>(
      CAP_TICKETS_BASE_URL,
      `/Tickets?$filter=wricefItem_ID eq '${wricefItemId}'&$expand=history`
    );
    return (response.value || []).map(mapTicketFromOData);
  },

  async create(ticket: Omit<Ticket, 'id' | 'createdAt' | 'ticketCode'>): Promise<Ticket> {
    const payload = mapTicketToOData(ticket);
    const result = await capFetch<Record<string, unknown>>(CAP_TICKETS_BASE_URL, '/Tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapTicketFromOData(result);
  },

  async update(id: string, ticket: Partial<Ticket>): Promise<Ticket> {
    const payload = mapTicketToOData(ticket);
    const result = await capFetch<Record<string, unknown>>(CAP_TICKETS_BASE_URL, `/Tickets(${id})`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapTicketFromOData(result);
  },

  async delete(id: string): Promise<void> {
    await capFetch(CAP_TICKETS_BASE_URL, `/Tickets(${id})`, { method: 'DELETE' });
  },
};

// ---------------------------------------------------------------------------
// Ticket Comments API – chat between technique & fonctionnel
// ---------------------------------------------------------------------------
export const TicketCommentsAPI = {
  async getByTicket(ticketId: string): Promise<TicketComment[]> {
    const response = await capFetch<ODataResponse<Record<string, unknown>>>(
      CAP_TICKETS_BASE_URL,
      `/TicketComments?$filter=ticket_ID eq '${ticketId}'&$orderby=timestamp asc`
    );
    return (response.value || []).map((c) => ({
      id: String(c.ID || c.id || ''),
      ticketId: String(c.ticket_ID || ''),
      userId: String(c.userId || ''),
      userRole: c.userRole ? String(c.userRole) : undefined,
      message: String(c.message || ''),
      timestamp: String(c.timestamp || c.createdAt || ''),
    }));
  },

  async create(comment: { ticketId: string; userId: string; userRole?: string; message: string }): Promise<TicketComment> {
    const payload = {
      ticket_ID: comment.ticketId,
      userId: comment.userId,
      userRole: comment.userRole || '',
      message: comment.message,
    };
    const result = await capFetch<Record<string, unknown>>(CAP_TICKETS_BASE_URL, '/TicketComments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      id: String(result.ID || result.id || ''),
      ticketId: String(result.ticket_ID || ''),
      userId: String(result.userId || ''),
      userRole: result.userRole ? String(result.userRole) : undefined,
      message: String(result.message || ''),
      timestamp: String(result.timestamp || result.createdAt || ''),
    };
  },
};

// ---------------------------------------------------------------------------
// WRICEF Objects API – always calls real CAP backend
// ---------------------------------------------------------------------------
export const WricefObjectsAPI = {
  async getAll(): Promise<WricefObject[]> {
    const response = await capFetch<ODataResponse<WricefObject>>(CAP_WRICEF_BASE_URL, '/WricefObjects?$expand=items($expand=tickets($expand=history)),documents($expand=attachments)');
    return (response.value || []).map(mapWricefFromOData);
  },

  async getByProject(projectId: string): Promise<WricefObject[]> {
    const response = await capFetch<ODataResponse<WricefObject>>(
      CAP_WRICEF_BASE_URL,
      `/WricefObjects?$filter=projectId eq '${projectId}'&$expand=items($expand=tickets($expand=history)),documents($expand=attachments)`
    );
    return (response.value || []).map(mapWricefFromOData);
  },

  async getById(id: string): Promise<WricefObject | null> {
    try {
      const result = await capFetch<Record<string, unknown>>(
        CAP_WRICEF_BASE_URL,
        `/WricefObjects(${id})?$expand=items($expand=tickets($expand=history)),documents($expand=attachments)`
      );
      return mapWricefFromOData(result);
    } catch {
      return null;
    }
  },

  async create(obj: Omit<WricefObject, 'id' | 'createdAt' | 'updatedAt' | 'tickets' | 'documents'>): Promise<WricefObject> {
    const result = await capFetch<Record<string, unknown>>(CAP_WRICEF_BASE_URL, '/WricefObjects', {
      method: 'POST',
      body: JSON.stringify(obj),
    });
    return mapWricefFromOData(result);
  },

  async update(id: string, data: Partial<WricefObject>): Promise<WricefObject> {
    const result = await capFetch<Record<string, unknown>>(CAP_WRICEF_BASE_URL, `/WricefObjects(${id})`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return mapWricefFromOData(result);
  },

  async delete(id: string): Promise<void> {
    await capFetch(CAP_WRICEF_BASE_URL, `/WricefObjects(${id})`, { method: 'DELETE' });
  },

  /** Upload WRICEF Excel (base64 encoded) and create objects for a project */
  async uploadExcel(projectId: string, base64File: string): Promise<WricefObject[]> {
    const result = await capFetch<Record<string, unknown>>(CAP_WRICEF_BASE_URL, '/uploadWricefExcel', {
      method: 'POST',
      body: JSON.stringify({ projectId, base64File }),
    });
    //...
    // The action returns an array
    const arr = (result as unknown as { value?: WricefObject[] }).value ?? (result as unknown as WricefObject[]);
    return Array.isArray(arr) ? arr.map(mapWricefFromOData) : [];
  },
};

// ---------------------------------------------------------------------------
// WRICEF Items (Objects within a WRICEF) API – always calls real CAP backend
// ---------------------------------------------------------------------------
export const WricefItemsAPI = {
  async getByWricef(wricefId: string): Promise<WricefItem[]> {
    const response = await capFetch<ODataResponse<Record<string, unknown>>>(
      CAP_WRICEF_BASE_URL,
      `/WricefItems?$filter=wricef_ID eq '${wricefId}'&$expand=tickets($expand=history)`
    );
    return (response.value || []).map(mapWricefItemFromOData);
  },

  async create(item: { wricefId: string; objectId: string; title: string; description?: string }): Promise<WricefItem> {
    const payload = {
      wricef_ID: item.wricefId,
      objectId: item.objectId,
      title: item.title,
      description: item.description ?? '',
    };
    const result = await capFetch<Record<string, unknown>>(CAP_WRICEF_BASE_URL, '/WricefItems', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapWricefItemFromOData(result);
  },

  async update(id: string, data: Partial<WricefItem>): Promise<WricefItem> {
    const payload: Record<string, unknown> = {};
    if (data.objectId !== undefined) payload.objectId = data.objectId;
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.wricefId !== undefined) payload.wricef_ID = data.wricefId;
    const result = await capFetch<Record<string, unknown>>(CAP_WRICEF_BASE_URL, `/WricefItems(${id})`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapWricefItemFromOData(result);
  },

  async delete(id: string): Promise<void> {
    await capFetch(CAP_WRICEF_BASE_URL, `/WricefItems(${id})`, { method: 'DELETE' });
  },
};

// Abaques API
export const AbaquesAPI = {
  async getAll(): Promise<Abaque[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockAbaques];
    }
    const response = await odataFetch<ODataResponse<Abaque>>('/Abaques');
    return response.value;
  },

  async getById(id: string): Promise<Abaque | null> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockAbaques.find((abaque) => abaque.id === id) ?? null;
    }
    return await odataFetch<Abaque>(`/Abaques('${id}')`);
  },
};

// Documentation Objects API – always calls real CAP backend
export const DocumentationAPI = {
  async getAll(): Promise<DocumentationObject[]> {
    const response = await capFetch<ODataResponse<Record<string, unknown>>>(CAP_WRICEF_BASE_URL, '/DocumentationObjects?$expand=attachments');
    return (response.value || []).map(mapDocFromOData);
  },

  async getById(id: string): Promise<DocumentationObject | null> {
    try {
      const result = await capFetch<Record<string, unknown>>(CAP_WRICEF_BASE_URL, `/DocumentationObjects(${id})?$expand=attachments`);
      return mapDocFromOData(result);
    } catch {
      return null;
    }
  },

  async getByWricefObject(wricefObjectId: string): Promise<DocumentationObject[]> {
    const response = await capFetch<ODataResponse<Record<string, unknown>>>(
      CAP_WRICEF_BASE_URL,
      `/DocumentationObjects?$filter=wricefObject_ID eq '${wricefObjectId}'&$expand=attachments`
    );
    return (response.value || []).map(mapDocFromOData);
  },

  async create(
    doc: Omit<DocumentationObject, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DocumentationObject> {
    const payload: Record<string, unknown> = {
      wricefObject_ID: doc.wricefObjectId,
      projectId: doc.projectId,
      title: doc.title,
      description: doc.description,
      type: doc.type,
      content: doc.content,
      authorId: doc.authorId,
      attachments: (doc.attachments || []).map((a) => ({
        filename: a.filename,
        size: a.size,
        url: a.url,
      })),
    };
    const result = await capFetch<Record<string, unknown>>(CAP_WRICEF_BASE_URL, '/DocumentationObjects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapDocFromOData(result);
  },

  async update(id: string, data: Partial<DocumentationObject>): Promise<DocumentationObject> {
    const payload: Record<string, unknown> = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.type !== undefined) payload.type = data.type;
    if (data.content !== undefined) payload.content = data.content;
    if (data.wricefObjectId !== undefined) payload.wricefObject_ID = data.wricefObjectId;

    const result = await capFetch<Record<string, unknown>>(CAP_WRICEF_BASE_URL, `/DocumentationObjects(${id})`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapDocFromOData(result);
  },

  async delete(id: string): Promise<void> {
    await capFetch(CAP_WRICEF_BASE_URL, `/DocumentationObjects(${id})`, { method: 'DELETE' });
  },
};

// TicketGroupsAPI is replaced by WricefObjectsAPI – alias for compatibility
export const TicketGroupsAPI = WricefObjectsAPI as unknown as {
  getAll: () => Promise<WricefObject[]>;
  getByProject: (projectId: string) => Promise<WricefObject[]>;
  create: (obj: Record<string, unknown>) => Promise<WricefObject>;
  update: (id: string, data: Record<string, unknown>) => Promise<WricefObject>;
  delete: (id: string) => Promise<void>;
};

// Notifications API
export const NotificationsAPI = {
  async getByUser(userId: string): Promise<Notification[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockNotifications.filter((n) => n.userId === userId);
    }
    const response = await odataFetch<ODataResponse<Notification>>(
      `/Notifications?$filter=userId eq '${userId}'`
    );
    return response.value;
  },

  async markAsRead(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const notification = mockNotifications.find((n) => n.id === id);
      if (notification) {
        notification.read = true;
      }
      return;
    }
    await odataFetch<void>(`/Notifications('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify({ read: true }),
    });
  },

  async create(
    notification: Omit<Notification, 'id' | 'createdAt'> & { createdAt?: string }
  ): Promise<Notification> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newNotification: Notification = {
        ...notification,
        id: `n${Date.now()}`,
        createdAt: notification.createdAt ?? new Date().toISOString(),
      };
      mockNotifications.unshift(newNotification);
      return newNotification;
    }
    return await odataFetch<Notification>('/Notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
    });
  },
};

// Reference Data API
export const ReferenceDataAPI = {
  async getAll(): Promise<ReferenceData[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockReferenceData];
    }
    const response = await odataFetch<ODataResponse<ReferenceData>>('/ReferenceData');
    return response.value;
  },

  async create(data: Omit<ReferenceData, 'id'>): Promise<ReferenceData> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newData: ReferenceData = { ...data, id: `r${Date.now()}` };
      mockReferenceData.push(newData);
      return newData;
    }
    return await odataFetch<ReferenceData>('/ReferenceData', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<ReferenceData>): Promise<ReferenceData> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockReferenceData.findIndex((r) => r.id === id);
      if (index !== -1) {
        mockReferenceData[index] = { ...mockReferenceData[index], ...data };
        return mockReferenceData[index];
      }
      throw new Error('Reference data not found');
    }
    return await odataFetch<ReferenceData>(`/ReferenceData('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockReferenceData.findIndex((r) => r.id === id);
      if (index !== -1) {
        mockReferenceData.splice(index, 1);
      }
      return;
    }
    await odataFetch<void>(`/ReferenceData('${id}')`, {
      method: 'DELETE',
    });
  },
};

// Allocations API
export const AllocationsAPI = {
  async getAll(): Promise<Allocation[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockAllocations];
    }
    const response = await odataFetch<ODataResponse<Allocation>>('/Allocations');
    return response.value;
  },

  async update(id: string, allocation: Partial<Allocation>): Promise<Allocation> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockAllocations.findIndex((a) => a.id === id);
      if (index !== -1) {
        mockAllocations[index] = { ...mockAllocations[index], ...allocation };
        return mockAllocations[index];
      }
      throw new Error('Allocation not found');
    }
    return await odataFetch<Allocation>(`/Allocations('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(allocation),
    });
  },

  async create(allocation: Omit<Allocation, 'id'>): Promise<Allocation> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newAllocation: Allocation = { ...allocation, id: `a${Date.now()}` };
      mockAllocations.push(newAllocation);
      return newAllocation;
    }
    return await odataFetch<Allocation>('/Allocations', {
      method: 'POST',
      body: JSON.stringify(allocation),
    });
  },

  async delete(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockAllocations.findIndex((a) => a.id === id);
      if (index !== -1) {
        mockAllocations.splice(index, 1);
      }
      return;
    }
    await odataFetch<void>(`/Allocations('${id}')`, {
      method: 'DELETE',
    });
  },
};

// Leave Requests API
export const LeaveRequestsAPI = {
  async getAll(): Promise<LeaveRequest[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockLeaveRequests];
    }
    const response = await odataFetch<ODataResponse<LeaveRequest>>('/LeaveRequests');
    return response.value;
  },

  async getByConsultant(consultantId: string): Promise<LeaveRequest[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockLeaveRequests.filter((lr) => lr.consultantId === consultantId);
    }
    const response = await odataFetch<ODataResponse<LeaveRequest>>(
      `/LeaveRequests?$filter=consultantId eq '${consultantId}'`
    );
    return response.value;
  },

  async create(leaveRequest: Omit<LeaveRequest, 'id' | 'createdAt'>): Promise<LeaveRequest> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newLeaveRequest: LeaveRequest = {
        ...leaveRequest,
        id: `lr${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      mockLeaveRequests.push(newLeaveRequest);
      return newLeaveRequest;
    }
    return await odataFetch<LeaveRequest>('/LeaveRequests', {
      method: 'POST',
      body: JSON.stringify(leaveRequest),
    });
  },

  async update(id: string, data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockLeaveRequests.findIndex((lr) => lr.id === id);
      if (index !== -1) {
        mockLeaveRequests[index] = { ...mockLeaveRequests[index], ...data };
        return mockLeaveRequests[index];
      }
      throw new Error('Leave request not found');
    }
    return await odataFetch<LeaveRequest>(`/LeaveRequests('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ---------------------------------------------------------------------------
// Time Logs API (StraTIME)
// ---------------------------------------------------------------------------

export const TimeLogsAPI = {
  async getAll(): Promise<TimeLog[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockTimeLogs];
    }
    const response = await odataFetch<ODataResponse<TimeLog>>('/TimeLogs');
    return response.value;
  },

  async getByConsultant(consultantId: string): Promise<TimeLog[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockTimeLogs.filter((tl) => tl.consultantId === consultantId);
    }
    const response = await odataFetch<ODataResponse<TimeLog>>(
      `/TimeLogs?$filter=consultantId eq '${consultantId}'`
    );
    return response.value;
  },

  async getByTicket(ticketId: string): Promise<TimeLog[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockTimeLogs.filter((tl) => tl.ticketId === ticketId);
    }
    const response = await odataFetch<ODataResponse<TimeLog>>(
      `/TimeLogs?$filter=ticketId eq '${ticketId}'`
    );
    return response.value;
  },

  async create(timeLog: Omit<TimeLog, 'id'>): Promise<TimeLog> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newTimeLog: TimeLog = {
        ...timeLog,
        id: `tl${Date.now()}`,
      };
      mockTimeLogs.push(newTimeLog);
      return newTimeLog;
    }
    return await odataFetch<TimeLog>('/TimeLogs', {
      method: 'POST',
      body: JSON.stringify(timeLog),
    });
  },

  async update(id: string, data: Partial<TimeLog>): Promise<TimeLog> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockTimeLogs.findIndex((tl) => tl.id === id);
      if (index !== -1) {
        mockTimeLogs[index] = { ...mockTimeLogs[index], ...data };
        return mockTimeLogs[index];
      }
      throw new Error('Time log not found');
    }
    return await odataFetch<TimeLog>(`/TimeLogs('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async sendToStraTIME(id: string): Promise<TimeLog> {
    if (USE_MOCK_DATA) {
      await mockDelay(1500);
      const index = mockTimeLogs.findIndex((tl) => tl.id === id);
      if (index !== -1) {
        mockTimeLogs[index] = {
          ...mockTimeLogs[index],
          sentToStraTIME: true,
          sentAt: new Date().toISOString(),
        };
        return mockTimeLogs[index];
      }
      throw new Error('Time log not found');
    }
    return await odataFetch<TimeLog>(`/TimeLogs('${id}')/sendToStraTIME`, {
      method: 'POST',
    });
  },
};

// ---------------------------------------------------------------------------
// Imputations API (bi-weekly time entries)
// ---------------------------------------------------------------------------

export const ImputationsAPI = {
  async getAll(): Promise<Imputation[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockImputations];
    }
    const response = await odataFetch<ODataResponse<Imputation>>('/Imputations');
    return response.value;
  },

  async getByConsultant(consultantId: string): Promise<Imputation[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockImputations.filter((i) => i.consultantId === consultantId);
    }
    const response = await odataFetch<ODataResponse<Imputation>>(
      `/Imputations?$filter=consultantId eq '${consultantId}'`
    );
    return response.value;
  },

  async getByPeriod(periodKey: string): Promise<Imputation[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockImputations.filter((i) => i.periodKey === periodKey);
    }
    const response = await odataFetch<ODataResponse<Imputation>>(
      `/Imputations?$filter=periodKey eq '${periodKey}'`
    );
    return response.value;
  },

  async create(imputation: Omit<Imputation, 'id' | 'createdAt'>): Promise<Imputation> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newImputation: Imputation = {
        ...imputation,
        id: `imp${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      mockImputations.push(newImputation);
      return newImputation;
    }
    return await odataFetch<Imputation>('/Imputations', {
      method: 'POST',
      body: JSON.stringify(imputation),
    });
  },

  async update(id: string, data: Partial<Imputation>): Promise<Imputation> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockImputations.findIndex((i) => i.id === id);
      if (index !== -1) {
        mockImputations[index] = { ...mockImputations[index], ...data };
        return mockImputations[index];
      }
      throw new Error('Imputation not found');
    }
    return await odataFetch<Imputation>(`/Imputations('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockImputations.findIndex((i) => i.id === id);
      if (index !== -1) mockImputations.splice(index, 1);
      return;
    }
    await odataFetch(`/Imputations('${id}')`, { method: 'DELETE' });
  },

  async validate(id: string, validatedBy: string): Promise<Imputation> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockImputations.findIndex((i) => i.id === id);
      if (index !== -1) {
        mockImputations[index] = {
          ...mockImputations[index],
          validationStatus: 'VALIDATED',
          validatedBy,
          validatedAt: new Date().toISOString(),
        };
        return mockImputations[index];
      }
      throw new Error('Imputation not found');
    }
    return await odataFetch<Imputation>(`/Imputations('${id}')/validate`, { method: 'POST' });
  },

  async reject(id: string, validatedBy: string): Promise<Imputation> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockImputations.findIndex((i) => i.id === id);
      if (index !== -1) {
        mockImputations[index] = {
          ...mockImputations[index],
          validationStatus: 'REJECTED',
          validatedBy,
          validatedAt: new Date().toISOString(),
        };
        return mockImputations[index];
      }
      throw new Error('Imputation not found');
    }
    return await odataFetch<Imputation>(`/Imputations('${id}')/reject`, { method: 'POST' });
  },
};

// ---------------------------------------------------------------------------
// Imputation Periods API
// ---------------------------------------------------------------------------

export const ImputationPeriodsAPI = {
  async getAll(): Promise<ImputationPeriod[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockImputationPeriods];
    }
    const response = await odataFetch<ODataResponse<ImputationPeriod>>('/ImputationPeriods');
    return response.value;
  },

  async getByConsultant(consultantId: string): Promise<ImputationPeriod[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockImputationPeriods.filter((p) => p.consultantId === consultantId);
    }
    const response = await odataFetch<ODataResponse<ImputationPeriod>>(
      `/ImputationPeriods?$filter=consultantId eq '${consultantId}'`
    );
    return response.value;
  },

  async create(period: Omit<ImputationPeriod, 'id'>): Promise<ImputationPeriod> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newPeriod: ImputationPeriod = {
        ...period,
        id: `ip${Date.now()}`,
      };
      mockImputationPeriods.push(newPeriod);
      return newPeriod;
    }
    return await odataFetch<ImputationPeriod>('/ImputationPeriods', {
      method: 'POST',
      body: JSON.stringify(period),
    });
  },

  async update(id: string, data: Partial<ImputationPeriod>): Promise<ImputationPeriod> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockImputationPeriods.findIndex((p) => p.id === id);
      if (index !== -1) {
        mockImputationPeriods[index] = { ...mockImputationPeriods[index], ...data };
        return mockImputationPeriods[index];
      }
      throw new Error('Imputation period not found');
    }
    return await odataFetch<ImputationPeriod>(`/ImputationPeriods('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async submit(id: string): Promise<ImputationPeriod> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockImputationPeriods.findIndex((p) => p.id === id);
      if (index !== -1) {
        mockImputationPeriods[index] = {
          ...mockImputationPeriods[index],
          status: 'SUBMITTED',
          submittedAt: new Date().toISOString(),
        };
        // Also mark all imputations in this period as submitted
        const period = mockImputationPeriods[index];
        mockImputations.forEach((imp, idx) => {
          if (imp.consultantId === period.consultantId && imp.periodKey === period.periodKey && imp.validationStatus === 'DRAFT') {
            mockImputations[idx] = { ...imp, validationStatus: 'SUBMITTED' };
          }
        });
        return mockImputationPeriods[index];
      }
      throw new Error('Period not found');
    }
    return await odataFetch<ImputationPeriod>(`/ImputationPeriods('${id}')/submit`, { method: 'POST' });
  },

  async validate(id: string, validatedBy: string): Promise<ImputationPeriod> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockImputationPeriods.findIndex((p) => p.id === id);
      if (index !== -1) {
        mockImputationPeriods[index] = {
          ...mockImputationPeriods[index],
          status: 'VALIDATED',
          validatedBy,
          validatedAt: new Date().toISOString(),
        };
        // Also validate all imputations in this period
        const period = mockImputationPeriods[index];
        mockImputations.forEach((imp, idx) => {
          if (imp.consultantId === period.consultantId && imp.periodKey === period.periodKey) {
            mockImputations[idx] = { ...imp, validationStatus: 'VALIDATED', validatedBy, validatedAt: new Date().toISOString() };
          }
        });
        return mockImputationPeriods[index];
      }
      throw new Error('Period not found');
    }
    return await odataFetch<ImputationPeriod>(`/ImputationPeriods('${id}')/validate`, { method: 'POST' });
  },

  async sendToStraTIME(id: string, sentBy: string): Promise<ImputationPeriod> {
    if (USE_MOCK_DATA) {
      await mockDelay(1200);
      const index = mockImputationPeriods.findIndex((p) => p.id === id);
      if (index !== -1) {
        if (mockImputationPeriods[index].status !== 'VALIDATED') {
          throw new Error('Only validated periods can be sent to StraTIME');
        }
        mockImputationPeriods[index] = {
          ...mockImputationPeriods[index],
          sentToStraTIME: true,
          sentBy,
          sentAt: new Date().toISOString(),
        };
        return mockImputationPeriods[index];
      }
      throw new Error('Period not found');
    }
    return await odataFetch<ImputationPeriod>(`/ImputationPeriods('${id}')/sendToStraTIME`, {
      method: 'POST',
      body: JSON.stringify({ sentBy }),
    });
  },

  async reject(id: string, validatedBy: string): Promise<ImputationPeriod> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockImputationPeriods.findIndex((p) => p.id === id);
      if (index !== -1) {
        mockImputationPeriods[index] = {
          ...mockImputationPeriods[index],
          status: 'REJECTED',
          validatedBy,
          validatedAt: new Date().toISOString(),
        };
        return mockImputationPeriods[index];
      }
      throw new Error('Period not found');
    }
    return await odataFetch<ImputationPeriod>(`/ImputationPeriods('${id}')/reject`, { method: 'POST' });
  },
};

// ---------------------------------------------------------------------------
// OData ↔ Frontend mappers (CAP uses ID, cuid, managed fields)
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapTicketFromOData(raw: any): Ticket {
  return {
    id: raw.ID ?? raw.id,
    ticketCode: raw.ticketCode ?? '',
    projectId: raw.projectId,
    wricefItemId: raw.wricefItem_ID ?? raw.wricefItemId ?? '',
    createdBy: raw.createdBy,
    assignedTo: (raw.techConsultant_ID ?? raw.assignedTo) || undefined,
    assignedToRole: raw.assignedToRole || undefined,
    // New: explicit consultant FK fields
    techConsultantId: (raw.techConsultant_ID as string) || undefined,
    functionalConsultantId: (raw.functionalConsultant_ID as string) || undefined,
    status: raw.status ?? 'NEW',
    priority: raw.priority ?? 'MEDIUM',
    nature: raw.nature,
    title: raw.title,
    description: raw.description ?? '',
    dueDate: raw.dueDate || undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.modifiedAt || raw.updatedAt || undefined,
    history: Array.isArray(raw.history) ? raw.history.map((e: any) => ({
      id: e.ID ?? e.id,
      timestamp: e.timestamp,
      userId: e.userId,
      action: e.action,
      fromValue: e.fromValue || undefined,
      toValue: e.toValue || undefined,
      comment: e.comment || undefined,
    })) : [],
    effortHours: Number(raw.effortHours) || 0,
    effortComment: raw.effortComment || undefined,
    functionalTesterId: raw.functionalTesterId || undefined,
    tags: raw.tags ? (typeof raw.tags === 'string' ? raw.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : raw.tags) : undefined,
    module: raw.module ?? 'OTHER',
    estimationHours: Number(raw.estimationHours) || 0,
    complexity: raw.complexity ?? 'MOYEN',
    estimatedViaAbaque: raw.estimatedViaAbaque || false,
    techFeedback: raw.techFeedback || '',
    functionalFeedback: raw.functionalFeedback || '',
  };
}

function mapTicketToOData(ticket: Partial<Ticket>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (ticket.projectId !== undefined) payload.projectId = ticket.projectId;
  if (ticket.wricefItemId !== undefined && ticket.wricefItemId) payload.wricefItem_ID = ticket.wricefItemId;
  if (ticket.createdBy !== undefined) payload.createdBy = ticket.createdBy;
  // New: explicit consultant FK fields (CAP uses _ID suffix for associations)
  if ((ticket as any).techConsultantId !== undefined) payload.techConsultant_ID = (ticket as any).techConsultantId || null;
  if ((ticket as any).functionalConsultantId !== undefined) payload.functionalConsultant_ID = (ticket as any).functionalConsultantId || null;
  // Legacy assignedTo (keep in sync for backward compat)
  if (ticket.assignedTo !== undefined) payload.assignedTo = ticket.assignedTo;
  if (ticket.assignedToRole !== undefined) payload.assignedToRole = ticket.assignedToRole;
  if (ticket.status !== undefined) payload.status = ticket.status;
  if (ticket.priority !== undefined) payload.priority = ticket.priority;
  if (ticket.nature !== undefined) payload.nature = ticket.nature;
  if (ticket.title !== undefined) payload.title = ticket.title;
  if (ticket.description !== undefined) payload.description = ticket.description;
  if (ticket.dueDate !== undefined) payload.dueDate = ticket.dueDate;
  if (ticket.effortHours !== undefined) payload.effortHours = ticket.effortHours;
  if (ticket.effortComment !== undefined) payload.effortComment = ticket.effortComment;
  if (ticket.functionalTesterId !== undefined) payload.functionalTesterId = ticket.functionalTesterId;
  if (ticket.tags !== undefined) payload.tags = Array.isArray(ticket.tags) ? ticket.tags.join(', ') : ticket.tags;
  if (ticket.module !== undefined) payload.module = ticket.module;
  if (ticket.estimationHours !== undefined) payload.estimationHours = ticket.estimationHours;
  if (ticket.complexity !== undefined) payload.complexity = ticket.complexity;
  if (ticket.estimatedViaAbaque !== undefined) payload.estimatedViaAbaque = ticket.estimatedViaAbaque;
  if (ticket.techFeedback !== undefined) payload.techFeedback = ticket.techFeedback;
  if (ticket.functionalFeedback !== undefined) payload.functionalFeedback = ticket.functionalFeedback;
  return payload;
}

// ---------------------------------------------------------------------------
// Backend Users API – always calls real CAP backend (Users entity)
// ---------------------------------------------------------------------------
export const BackendUsersAPI = {
  async getAll(): Promise<User[]> {
    const response = await capFetch<ODataResponse<Record<string, unknown>>>(CAP_TICKETS_BASE_URL, '/Users');
    return (response.value || []).map((u) => ({
      id: String(u.ID ?? u.id ?? ''),
      name: String(u.name ?? ''),
      email: String(u.email ?? ''),
      role: (u.role as User['role']) ?? 'CONSULTANT_TECHNIQUE',
      active: Boolean(u.active ?? true),
      skills: u.skills ? String(u.skills).split(',').map((s) => s.trim()).filter(Boolean) : [],
      certifications: [],
      availabilityPercent: Number(u.availabilityPercent ?? 100),
      teamId: u.teamId ? String(u.teamId) : undefined,
      avatarUrl: u.avatarUrl ? String(u.avatarUrl) : undefined,
    }));
  },

  async getByRole(role: User['role']): Promise<User[]> {
    const response = await capFetch<ODataResponse<Record<string, unknown>>>(
      CAP_TICKETS_BASE_URL,
      `/Users?$filter=role eq '${role}' and active eq true&$orderby=name`
    );
    return (response.value || []).map((u) => ({
      id: String(u.ID ?? u.id ?? ''),
      name: String(u.name ?? ''),
      email: String(u.email ?? ''),
      role: (u.role as User['role']) ?? 'CONSULTANT_TECHNIQUE',
      active: Boolean(u.active ?? true),
      skills: u.skills ? String(u.skills).split(',').map((s) => s.trim()).filter(Boolean) : [],
      certifications: [],
      availabilityPercent: Number(u.availabilityPercent ?? 100),
      teamId: u.teamId ? String(u.teamId) : undefined,
      avatarUrl: u.avatarUrl ? String(u.avatarUrl) : undefined,
    }));
  },

  async getTechConsultants(): Promise<User[]> {
    return BackendUsersAPI.getByRole('CONSULTANT_TECHNIQUE');
  },

  async getFunctionalConsultants(): Promise<User[]> {
    return BackendUsersAPI.getByRole('CONSULTANT_FONCTIONNEL');
  },
};

function mapWricefItemFromOData(raw: any): WricefItem {
  return {
    id: raw.ID ?? raw.id,
    wricefId: raw.wricef_ID ?? raw.wricefId ?? '',
    objectId: raw.objectId ?? '',
    title: raw.title ?? '',
    description: raw.description ?? '',
    createdAt: raw.createdAt,
    updatedAt: raw.modifiedAt || raw.updatedAt || undefined,
    tickets: Array.isArray(raw.tickets) ? raw.tickets.map(mapTicketFromOData) : undefined,
  };
}

function mapWricefFromOData(raw: any): WricefObject {
  return {
    id: raw.ID ?? raw.id,
    projectId: raw.projectId,
    wricefId: raw.wricefId ?? '',
    type: raw.type || undefined,
    title: raw.title ?? '',
    description: raw.description ?? '',
    complexity: raw.complexity ?? 'MOYEN',
    module: raw.module || undefined,
    approvalStatus: raw.approvalStatus || 'PENDING',
    createdAt: raw.createdAt,
    updatedAt: raw.modifiedAt || raw.updatedAt || undefined,
    items: Array.isArray(raw.items) ? raw.items.map(mapWricefItemFromOData) : undefined,
    documents: Array.isArray(raw.documents) ? raw.documents.map(mapDocFromOData) : undefined,
  };
}

function mapDocFromOData(raw: any): DocumentationObject {
  return {
    id: raw.ID ?? raw.id,
    wricefObjectId: raw.wricefObject_ID ?? raw.wricefObjectId ?? '',
    projectId: raw.projectId ?? '',
    title: raw.title ?? '',
    description: raw.description ?? '',
    type: raw.type ?? 'GENERAL',
    content: raw.content ?? '',
    attachments: Array.isArray(raw.attachments) ? raw.attachments.map((a: any) => ({
      id: a.ID ?? a.id,
      filename: a.filename,
      size: a.size ?? 0,
      url: a.url ?? '',
    })) : [],
    createdAt: raw.createdAt,
    updatedAt: raw.modifiedAt || raw.updatedAt || undefined,
    authorId: raw.authorId ?? '',
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */
