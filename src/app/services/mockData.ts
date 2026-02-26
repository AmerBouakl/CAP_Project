// Mock data service for development and testing
// Data is persisted in localStorage so mutations survive page refreshes.
// Version 3 – Tickets, Documentation, and WRICEF moved to CAP backend.

import {
  User,
  Project,
  Task,
  Timesheet,
  Evaluation,
  Deliverable,
  Notification,
  ReferenceData,
  Allocation,
  KPI,
  LeaveRequest,
  TimeLog,
  Imputation,
  ImputationPeriod,
  Abaque,
} from '../types/entities';

// ---------------------------------------------------------------------------
// localStorage-backed store helper
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'sap_mock_';
const DATA_VERSION_KEY = `${STORAGE_PREFIX}__version`;
const CURRENT_DATA_VERSION = 6; // bump when schema changes

/**
 * Creates a mutable array that is automatically persisted to localStorage.
 * On first load it hydrates from localStorage; if nothing is stored it uses
 * the provided `defaults`. Every mutation (push, splice, index set, etc.)
 * triggers a write-back via a Proxy.
 */
function persistedArray<T>(key: string, defaults: T[]): T[] {
  const storageKey = `${STORAGE_PREFIX}${key}`;

  // Hydrate
  let data: T[];
  try {
    const raw = localStorage.getItem(storageKey);
    data = raw ? (JSON.parse(raw) as T[]) : [...defaults];
  } catch {
    data = [...defaults];
  }

  const persist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // quota exceeded - degrade gracefully
    }
  };

  // Persist initially so the defaults are stored on first visit
  if (!localStorage.getItem(storageKey)) {
    persist();
  }

  // Return proxied array that auto-persists on mutation
  return new Proxy(data, {
    set(target, prop, value, receiver) {
      const result = Reflect.set(target, prop, value, receiver);
      persist();
      return result;
    },
    deleteProperty(target, prop) {
      const result = Reflect.deleteProperty(target, prop);
      persist();
      return result;
    },
  });
}

/** Clears all persisted mock data and reloads the page. */
export function resetMockData(): void {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
  window.location.reload();
}

// ---------------------------------------------------------------------------
// Schema migration - wipe stale data when version bumps
// ---------------------------------------------------------------------------

(function migrateIfNeeded() {
  try {
    const stored = localStorage.getItem(DATA_VERSION_KEY);
    const version = stored ? Number(stored) : 0;
    if (version < CURRENT_DATA_VERSION) {
      // Wipe all mock data so defaults with new schema take effect
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
      keys.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(DATA_VERSION_KEY, String(CURRENT_DATA_VERSION));
    }
  } catch {
    // ignore
  }
})();

// ---------------------------------------------------------------------------
// Mock Users - now includes PROJECT_MANAGER and DEV_COORDINATOR
// ---------------------------------------------------------------------------

const _defaultUsers: User[] = [
  {
    id: 'u1',
    name: 'Jean Dupont',
    email: 'jean.dupont@company.com',
    role: 'ADMIN',
    active: true,
    skills: ['Administration', 'Security', 'Governance'],
    certifications: [
      { id: 'c1', name: 'SAP Admin', issuingBody: 'SAP', dateObtained: '2023-03-15', expiryDate: '2027-03-15', status: 'VALID' },
      { id: 'c2', name: 'ITIL Foundation', issuingBody: 'Axelos', dateObtained: '2022-06-01', status: 'VALID' },
    ],
    availabilityPercent: 100,
    teamId: 't1',
  },
  {
    id: 'u2',
    name: 'Marie Martin',
    email: 'marie.martin@company.com',
    role: 'MANAGER',
    active: true,
    skills: ['Project Management', 'Team Leadership', 'SAP'],
    certifications: [
      { id: 'c3', name: 'PMP', issuingBody: 'PMI', dateObtained: '2021-09-10', expiryDate: '2024-09-10', status: 'EXPIRED' },
      { id: 'c4', name: 'SAP PM Consultant', issuingBody: 'SAP', dateObtained: '2023-01-20', expiryDate: '2027-01-20', status: 'VALID' },
    ],
    availabilityPercent: 90,
    teamId: 't1',
  },
  {
    id: 'u3',
    name: 'Pierre Dubois',
    email: 'pierre.dubois@company.com',
    role: 'CONSULTANT_TECHNIQUE',
    active: true,
    skills: ['ABAP', 'Fiori', 'CAP', 'Node.js'],
    certifications: [
      { id: 'c5', name: 'SAP Developer Associate', issuingBody: 'SAP', dateObtained: '2024-05-15', expiryDate: '2026-05-15', status: 'EXPIRING_SOON' },
      { id: 'c6', name: 'AWS Solutions Architect', issuingBody: 'AWS', dateObtained: '2024-01-10', expiryDate: '2027-01-10', status: 'VALID' },
    ],
    availabilityPercent: 75,
    teamId: 't1',
  },
  {
    id: 'u4',
    name: 'Sophie Bernard',
    email: 'sophie.bernard@company.com',
    role: 'CONSULTANT_FONCTIONNEL',
    active: true,
    skills: ['Business Analysis', 'SAP MM', 'Requirements'],
    certifications: [
      { id: 'c7', name: 'SAP MM Consultant', issuingBody: 'SAP', dateObtained: '2023-11-01', expiryDate: '2026-11-01', status: 'VALID' },
      { id: 'c8', name: 'CBAP', issuingBody: 'IIBA', dateObtained: '2022-08-20', expiryDate: '2025-08-20', status: 'EXPIRED' },
    ],
    availabilityPercent: 80,
    teamId: 't1',
  },
  {
    id: 'u5',
    name: 'Luc Moreau',
    email: 'luc.moreau@company.com',
    role: 'CONSULTANT_TECHNIQUE',
    active: true,
    skills: ['Java', 'Integration', 'BTP'],
    certifications: [
      { id: 'c9', name: 'SAP Integration Suite', issuingBody: 'SAP', dateObtained: '2025-02-01', expiryDate: '2028-02-01', status: 'VALID' },
      { id: 'c10', name: 'Java SE Certified', issuingBody: 'Oracle', dateObtained: '2024-06-15', status: 'VALID' },
    ],
    availabilityPercent: 60,
    teamId: 't1',
  },
  // ---- NEW ROLES ----
  {
    id: 'u6',
    name: 'Karim Benali',
    email: 'karim.benali@company.com',
    role: 'PROJECT_MANAGER',
    active: true,
    skills: ['Project Planning', 'Milestone Tracking', 'Risk Management', 'SAP PS'],
    certifications: [
      { id: 'c11', name: 'PRINCE2 Practitioner', issuingBody: 'Axelos', dateObtained: '2024-03-01', expiryDate: '2027-03-01', status: 'VALID' },
    ],
    availabilityPercent: 85,
    teamId: 't1',
  },
  {
    id: 'u7',
    name: 'Nadia Cherradi',
    email: 'nadia.cherradi@company.com',
    role: 'DEV_COORDINATOR',
    active: true,
    skills: ['ABAP', 'Fiori', 'Team Coordination', 'Workload Planning', 'CAP'],
    certifications: [
      { id: 'c12', name: 'SAP Technology Associate', issuingBody: 'SAP', dateObtained: '2024-06-01', expiryDate: '2027-06-01', status: 'VALID' },
    ],
    availabilityPercent: 90,
    teamId: 't1',
  },
];
export const mockUsers: User[] = persistedArray('users', _defaultUsers);

// ---------------------------------------------------------------------------
// Mock Projects
// ---------------------------------------------------------------------------

const _defaultProjects: Project[] = [
  {
    id: 'p1',
    name: 'SAP S/4HANA Migration',
    managerId: 'u2',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    status: 'ACTIVE',
    priority: 'CRITICAL',
    description: 'Migration from ECC to S/4HANA',
    progress: 45,
    budget: 500000,
    complexity: 'CRITICAL',
    techKeywords: ['S/4HANA', 'ABAP', 'Data Migration', 'HANA DB'],
    documentation: '## S/4HANA Migration\n\nThis project covers the full migration from SAP ECC to S/4HANA.\n\n### Scope\n- Data migration of all master data\n- Custom code remediation\n- Fiori app deployment\n\n### Key Decisions\n- Greenfield approach selected\n- Go-live target: June 2026',
    linkedAbaqueId: 'abq2',
    abaqueEstimate: {
      criteria: {
        numberOfUsers: 260,
        modulesInvolved: ['FI', 'CO', 'MM', 'SD'],
        numberOfCountries: 3,
        customizationLevel: 'HIGH_CUSTOM',
      },
      result: {
        complexity: 'HIGH',
        estimatedConsultingDays: 114,
        budgetBracket: '92k - 125k EUR',
        riskLevel: 'HIGH',
        recommendedTeamSize: 4,
      },
      estimatedAt: '2026-01-03T09:30:00Z',
      estimatedBy: 'u2',
    },
  },
  {
    id: 'p2',
    name: 'Fiori Launchpad Deployment',
    managerId: 'u2',
    startDate: '2026-02-01',
    endDate: '2026-04-30',
    status: 'ACTIVE',
    priority: 'HIGH',
    description: 'Deploy Fiori Launchpad for all users',
    progress: 65,
    budget: 150000,
    complexity: 'MEDIUM',
    techKeywords: ['SAP Fiori', 'UI5', 'Launchpad', 'OData'],
    documentation: '## Fiori Launchpad\n\nDeploy and configure the SAP Fiori Launchpad for the entire organization.\n\n### Apps\n- MM Purchase Orders\n- SD Sales Orders\n- FI Journal Entries',
    linkedAbaqueId: 'abq2',
  },
  {
    id: 'p3',
    name: 'Analytics Dashboard Development',
    managerId: 'u2',
    startDate: '2026-01-15',
    endDate: '2026-03-15',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    description: 'Create custom analytics dashboards',
    progress: 80,
    budget: 80000,
    complexity: 'LOW',
    techKeywords: ['SAP Analytics Cloud', 'CDS Views', 'BW/4HANA'],
    documentation: '## Analytics Dashboard\n\nCustom dashboards for executive reporting.\n\n### Data Sources\n- CDS views on S/4HANA\n- BW/4HANA models',
    linkedAbaqueId: 'abq1',
  },
];

export const mockProjects: Project[] = persistedArray('projects', _defaultProjects);

// ---------------------------------------------------------------------------
// Mock Abaques de Chiffrage
// ---------------------------------------------------------------------------

const _defaultAbaques: Abaque[] = [
  {
    id: 'abq1',
    name: 'Web Development Abaques',
    entries: [
      { taskNature: 'BUG', complexity: 'LOW', standardHours: 3 },
      { taskNature: 'BUG', complexity: 'MEDIUM', standardHours: 6 },
      { taskNature: 'BUG', complexity: 'HIGH', standardHours: 12 },
      { taskNature: 'FEATURE', complexity: 'LOW', standardHours: 8 },
      { taskNature: 'FEATURE', complexity: 'MEDIUM', standardHours: 16 },
      { taskNature: 'FEATURE', complexity: 'HIGH', standardHours: 32 },
      { taskNature: 'DOCUMENTATION', complexity: 'LOW', standardHours: 2 },
      { taskNature: 'DOCUMENTATION', complexity: 'MEDIUM', standardHours: 5 },
      { taskNature: 'DOCUMENTATION', complexity: 'HIGH', standardHours: 10 },
      { taskNature: 'SUPPORT', complexity: 'LOW', standardHours: 2 },
      { taskNature: 'SUPPORT', complexity: 'MEDIUM', standardHours: 4 },
      { taskNature: 'SUPPORT', complexity: 'HIGH', standardHours: 8 },
      { taskNature: 'WORKFLOW', complexity: 'LOW', standardHours: 6 },
      { taskNature: 'WORKFLOW', complexity: 'MEDIUM', standardHours: 12 },
      { taskNature: 'WORKFLOW', complexity: 'HIGH', standardHours: 24 },
      { taskNature: 'PROGRAMME', complexity: 'LOW', standardHours: 10 },
      { taskNature: 'PROGRAMME', complexity: 'MEDIUM', standardHours: 20 },
      { taskNature: 'PROGRAMME', complexity: 'HIGH', standardHours: 40 },
      { taskNature: 'REPORT', complexity: 'LOW', standardHours: 5 },
      { taskNature: 'REPORT', complexity: 'MEDIUM', standardHours: 10 },
      { taskNature: 'REPORT', complexity: 'HIGH', standardHours: 20 },
    ],
  },
  {
    id: 'abq2',
    name: 'SAP Integration Abaques',
    entries: [
      { taskNature: 'BUG', complexity: 'LOW', standardHours: 4 },
      { taskNature: 'BUG', complexity: 'MEDIUM', standardHours: 10 },
      { taskNature: 'BUG', complexity: 'HIGH', standardHours: 18 },
      { taskNature: 'FEATURE', complexity: 'LOW', standardHours: 12 },
      { taskNature: 'FEATURE', complexity: 'MEDIUM', standardHours: 24 },
      { taskNature: 'FEATURE', complexity: 'HIGH', standardHours: 48 },
      { taskNature: 'DOCUMENTATION', complexity: 'LOW', standardHours: 3 },
      { taskNature: 'DOCUMENTATION', complexity: 'MEDIUM', standardHours: 6 },
      { taskNature: 'DOCUMENTATION', complexity: 'HIGH', standardHours: 12 },
      { taskNature: 'SUPPORT', complexity: 'LOW', standardHours: 3 },
      { taskNature: 'SUPPORT', complexity: 'MEDIUM', standardHours: 6 },
      { taskNature: 'SUPPORT', complexity: 'HIGH', standardHours: 12 },
      { taskNature: 'FORMULAIRE', complexity: 'LOW', standardHours: 6 },
      { taskNature: 'FORMULAIRE', complexity: 'MEDIUM', standardHours: 14 },
      { taskNature: 'FORMULAIRE', complexity: 'HIGH', standardHours: 26 },
      { taskNature: 'PROGRAMME', complexity: 'LOW', standardHours: 14 },
      { taskNature: 'PROGRAMME', complexity: 'MEDIUM', standardHours: 30 },
      { taskNature: 'PROGRAMME', complexity: 'HIGH', standardHours: 60 },
      { taskNature: 'ENHANCEMENT', complexity: 'LOW', standardHours: 8 },
      { taskNature: 'ENHANCEMENT', complexity: 'MEDIUM', standardHours: 18 },
      { taskNature: 'ENHANCEMENT', complexity: 'HIGH', standardHours: 36 },
      { taskNature: 'MODULE', complexity: 'LOW', standardHours: 16 },
      { taskNature: 'MODULE', complexity: 'MEDIUM', standardHours: 32 },
      { taskNature: 'MODULE', complexity: 'HIGH', standardHours: 64 },
      { taskNature: 'REPORT', complexity: 'LOW', standardHours: 7 },
      { taskNature: 'REPORT', complexity: 'MEDIUM', standardHours: 15 },
      { taskNature: 'REPORT', complexity: 'HIGH', standardHours: 30 },
      { taskNature: 'WORKFLOW', complexity: 'LOW', standardHours: 9 },
      { taskNature: 'WORKFLOW', complexity: 'MEDIUM', standardHours: 20 },
      { taskNature: 'WORKFLOW', complexity: 'HIGH', standardHours: 38 },
    ],
  },
];

export const mockAbaques: Abaque[] = persistedArray('abaques', _defaultAbaques);

(function ensureProjectAbaqueDefaults() {
  const byProjectId: Record<string, string> = {
    p1: 'abq2',
    p2: 'abq2',
    p3: 'abq1',
  };
  mockProjects.forEach((project, index) => {
    if (project.linkedAbaqueId) return;
    const linkedAbaqueId = byProjectId[project.id];
    if (!linkedAbaqueId) return;
    mockProjects[index] = { ...project, linkedAbaqueId };
  });
})();

// ---------------------------------------------------------------------------
// Mock Tasks - added effortHours
// ---------------------------------------------------------------------------

const _defaultTasks: Task[] = [
  { id: 't1', projectId: 'p1', title: 'System Architecture Design', description: 'Design new S/4HANA architecture', status: 'DONE', priority: 'CRITICAL', assigneeId: 'u3', plannedStart: '2026-01-01', plannedEnd: '2026-01-15', realStart: '2026-01-01', realEnd: '2026-01-14', progressPercent: 100, estimatedHours: 80, actualHours: 75, effortHours: 75, isCritical: true, riskLevel: 'NONE' },
  { id: 't2', projectId: 'p1', title: 'Data Migration Scripts', description: 'Develop data migration scripts', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: 'u3', plannedStart: '2026-01-15', plannedEnd: '2026-02-28', realStart: '2026-01-16', progressPercent: 60, estimatedHours: 120, actualHours: 80, effortHours: 80, isCritical: true, riskLevel: 'MEDIUM' },
  { id: 't3', projectId: 'p1', title: 'Testing & Validation', description: 'Complete UAT testing', status: 'BLOCKED', priority: 'CRITICAL', assigneeId: 'u5', plannedStart: '2026-02-01', plannedEnd: '2026-02-20', realStart: '2026-02-05', progressPercent: 30, estimatedHours: 100, actualHours: 50, effortHours: 50, isCritical: true, riskLevel: 'HIGH', comments: 'Waiting for test environment access' },
  { id: 't4', projectId: 'p2', title: 'Fiori App Configuration', description: 'Configure Fiori apps for launchpad', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: 'u3', plannedStart: '2026-02-01', plannedEnd: '2026-02-28', realStart: '2026-02-01', progressPercent: 70, estimatedHours: 60, actualHours: 45, effortHours: 45, isCritical: false, riskLevel: 'LOW' },
  { id: 't5', projectId: 'p2', title: 'User Training Material', description: 'Create training documentation', status: 'TO_DO', priority: 'MEDIUM', assigneeId: 'u4', plannedStart: '2026-03-01', plannedEnd: '2026-03-15', progressPercent: 0, estimatedHours: 40, actualHours: 0, effortHours: 0, isCritical: false, riskLevel: 'NONE' },
  { id: 't6', projectId: 'p3', title: 'Dashboard UI Design', description: 'Design analytics dashboard UI', status: 'DONE', priority: 'HIGH', assigneeId: 'u3', plannedStart: '2026-01-15', plannedEnd: '2026-02-01', realStart: '2026-01-15', realEnd: '2026-01-30', progressPercent: 100, estimatedHours: 50, actualHours: 48, effortHours: 48, isCritical: false, riskLevel: 'NONE' },
];

export const mockTasks: Task[] = persistedArray('tasks', _defaultTasks);

// ---------------------------------------------------------------------------
// Mock Timesheets
// ---------------------------------------------------------------------------

const _defaultTimesheets: Timesheet[] = [
  { id: 'ts1', userId: 'u3', date: '2026-02-17', hours: 8, projectId: 'p1', taskId: 't2', comment: 'Working on migration scripts' },
  { id: 'ts2', userId: 'u3', date: '2026-02-16', hours: 7, projectId: 'p2', taskId: 't4', comment: 'Fiori configuration' },
];

export const mockTimesheets: Timesheet[] = persistedArray('timesheets', _defaultTimesheets);

// ---------------------------------------------------------------------------
// Mock Evaluations
// ---------------------------------------------------------------------------

const _defaultEvaluations: Evaluation[] = [
  {
    id: 'e1', userId: 'u3', evaluatorId: 'u2', projectId: 'p1', period: '2026-Q1', score: 4.2,
    qualitativeGrid: { productivity: 4, quality: 5, autonomy: 4, collaboration: 4, innovation: 4 },
    feedback: 'Excellent technical work on the migration project. Strong problem-solving skills.',
    createdAt: '2026-01-31T10:00:00Z',
  },
];

export const mockEvaluations: Evaluation[] = persistedArray('evaluations', _defaultEvaluations);

// ---------------------------------------------------------------------------
// Mock Deliverables
// ---------------------------------------------------------------------------

const _defaultDeliverables: Deliverable[] = [
  { id: 'd1', projectId: 'p1', taskId: 't1', type: 'Technical Specification', name: 'S/4HANA Architecture Document', url: '/deliverables/arch-doc.pdf', validationStatus: 'APPROVED', createdAt: '2026-01-14T15:30:00Z' },
  { id: 'd2', projectId: 'p2', taskId: 't5', type: 'Training Material', name: 'Fiori User Guide', validationStatus: 'PENDING', functionalComment: 'Please add more screenshots', createdAt: '2026-02-10T09:00:00Z' },
];

export const mockDeliverables: Deliverable[] = persistedArray('deliverables', _defaultDeliverables);

// ---------------------------------------------------------------------------
// Mock Notifications
// ---------------------------------------------------------------------------

const _defaultNotifications: Notification[] = [
  { id: 'n1', userId: 'u3', type: 'TASK_ASSIGNED', title: 'New Task Assigned', message: 'You have been assigned to "Data Migration Scripts"', read: false, createdAt: '2026-02-17T09:00:00Z' },
  { id: 'n2', userId: 'u3', type: 'DEADLINE_APPROACHING', title: 'Deadline Approaching', message: 'Task "Fiori App Configuration" is due in 3 days', read: false, createdAt: '2026-02-17T08:00:00Z' },
  { id: 'n3', userId: 'u2', type: 'RISK_ALERT', title: 'High Risk Task', message: 'Task "Testing & Validation" is blocked', read: true, createdAt: '2026-02-16T15:00:00Z' },
  { id: 'n4', userId: 'u6', type: 'TICKET_STATUS', title: 'Ticket In Test', message: 'Ticket "Purchase order approval form validation" moved to In Test', read: false, createdAt: '2026-02-22T09:00:00Z' },
  { id: 'n5', userId: 'u7', type: 'TICKET_ASSIGNED', title: 'Ticket Assigned', message: 'You assigned ticket "Configure SD pricing module" to Luc Moreau', read: true, createdAt: '2026-02-21T11:05:00Z' },
];

export const mockNotifications: Notification[] = persistedArray('notifications', _defaultNotifications);

// ---------------------------------------------------------------------------
// Mock Reference Data
// ---------------------------------------------------------------------------

const _defaultReferenceData: ReferenceData[] = [
  { id: 'r1', type: 'SKILL', code: 'SAP_ABAP', label: 'SAP ABAP Development', active: true, order: 1 },
  { id: 'r2', type: 'SKILL', code: 'SAP_FIORI', label: 'SAP Fiori/UI5', active: true, order: 2 },
  { id: 'r3', type: 'PROJECT_TYPE', code: 'MIGRATION', label: 'System Migration', active: true, order: 1 },
];

export const mockReferenceData: ReferenceData[] = persistedArray('referenceData', _defaultReferenceData);

// ---------------------------------------------------------------------------
// Mock Allocations
// ---------------------------------------------------------------------------

const _defaultAllocations: Allocation[] = [
  { id: 'a1', userId: 'u3', projectId: 'p1', allocationPercent: 50, startDate: '2026-01-01', endDate: '2026-06-30' },
  { id: 'a2', userId: 'u3', projectId: 'p2', allocationPercent: 25, startDate: '2026-02-01', endDate: '2026-04-30' },
  { id: 'a3', userId: 'u5', projectId: 'p1', allocationPercent: 60, startDate: '2026-01-01', endDate: '2026-06-30' },
];

export const mockAllocations: Allocation[] = persistedArray('allocations', _defaultAllocations);

// ---------------------------------------------------------------------------
// Mock Leave Requests
// ---------------------------------------------------------------------------

const _defaultLeaveRequests: LeaveRequest[] = [
  { id: 'lr1', consultantId: 'u3', startDate: '2026-03-10', endDate: '2026-03-14', reason: 'Family vacation', status: 'APPROVED', managerId: 'u2', createdAt: '2026-02-10T09:00:00Z', reviewedAt: '2026-02-11T14:00:00Z' },
  { id: 'lr2', consultantId: 'u5', startDate: '2026-03-03', endDate: '2026-03-05', reason: 'Personal leave', status: 'PENDING', managerId: 'u2', createdAt: '2026-02-18T10:00:00Z' },
  { id: 'lr3', consultantId: 'u3', startDate: '2026-04-20', endDate: '2026-04-24', reason: 'Training conference', status: 'PENDING', managerId: 'u2', createdAt: '2026-02-19T08:30:00Z' },
  { id: 'lr4', consultantId: 'u5', startDate: '2026-01-20', endDate: '2026-01-22', status: 'REJECTED', managerId: 'u2', createdAt: '2026-01-10T09:00:00Z', reviewedAt: '2026-01-12T11:00:00Z' },
];

export const mockLeaveRequests: LeaveRequest[] = persistedArray('leaveRequests', _defaultLeaveRequests);

// ---------------------------------------------------------------------------
// Mock Time Logs (StraTIME integration)
// ---------------------------------------------------------------------------

const _defaultTimeLogs: TimeLog[] = [
  { id: 'tl1', consultantId: 'u3', ticketId: 'tk3', projectId: 'p1', date: '2026-02-10', durationMinutes: 120, description: 'Initial analysis and logging framework setup', sentToStraTIME: true, sentAt: '2026-02-10T18:00:00Z' },
  { id: 'tl2', consultantId: 'u3', ticketId: 'tk3', projectId: 'p1', date: '2026-02-14', durationMinutes: 90, description: 'Implementation of detailed audit trail logging', sentToStraTIME: true, sentAt: '2026-02-14T17:30:00Z' },
  { id: 'tl3', consultantId: 'u3', ticketId: 'tk3', projectId: 'p1', date: '2026-02-18', durationMinutes: 30, description: 'Final testing and validation', sentToStraTIME: false },
  { id: 'tl4', consultantId: 'u5', ticketId: 'tk2', projectId: 'p2', date: '2026-02-12', durationMinutes: 180, description: 'Backend connection investigation & debugging', sentToStraTIME: true, sentAt: '2026-02-12T19:00:00Z' },
  { id: 'tl5', consultantId: 'u5', ticketId: 'tk2', projectId: 'p2', date: '2026-02-15', durationMinutes: 60, description: 'OData endpoint testing', sentToStraTIME: false },
  { id: 'tl6', consultantId: 'u3', ticketId: 'tk1', projectId: 'p1', date: '2026-02-16', durationMinutes: 45, description: 'Data mapping analysis for customer master', sentToStraTIME: false },
];

export const mockTimeLogs: TimeLog[] = persistedArray('timeLogs', _defaultTimeLogs);

// ---------------------------------------------------------------------------
// Mock KPIs (static, not persisted)
// ---------------------------------------------------------------------------

export const mockKPI: KPI = {
  projectProgress: 63,
  tasksOnTrack: 3,
  tasksLate: 1,
  criticalTasks: 2,
  averageProductivity: 4.1,
  allocationRate: 72,
  activeRisks: 2,
};

// ---------------------------------------------------------------------------
// Chart data generators (static, not persisted)
// ---------------------------------------------------------------------------

export const getProjectProgressTrend = () => [
  { date: '2026-01', progress: 15 },
  { date: '2026-02', progress: 35 },
  { date: '2026-03', progress: 52 },
  { date: '2026-04', progress: 63 },
  { date: '2026-05', progress: 70 },
  { date: '2026-06', progress: 85 },
];

export const getTasksByStatus = () => [
  { status: 'To Do', count: 8 },
  { status: 'In Progress', count: 12 },
  { status: 'Blocked', count: 2 },
  { status: 'Done', count: 18 },
];

export const getConsultantWorkload = () => [
  { name: 'Pierre D.', planned: 120, actual: 105 },
  { name: 'Luc M.', planned: 100, actual: 95 },
  { name: 'Sophie B.', planned: 80, actual: 82 },
  { name: 'Marc L.', planned: 90, actual: 88 },
];

export const getAllocationByProject = () => [
  { project: 'S/4HANA Migration', allocation: 45 },
  { project: 'Fiori Launchpad', allocation: 25 },
  { project: 'Analytics Dashboard', allocation: 15 },
  { project: 'Other', allocation: 15 },
];

// ---------------------------------------------------------------------------
// Mock Imputations (bi-weekly time entries)
// ---------------------------------------------------------------------------

const _defaultImputations: Imputation[] = [
  { id: 'imp1', consultantId: 'u3', ticketId: 'tk3', projectId: 'p1', module: 'ABAP', date: '2026-02-03', hours: 4, description: 'Logging framework setup', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-03T18:00:00Z' },
  { id: 'imp2', consultantId: 'u3', ticketId: 'tk3', projectId: 'p1', module: 'ABAP', date: '2026-02-04', hours: 6, description: 'Audit trail implementation', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-04T18:00:00Z' },
  { id: 'imp3', consultantId: 'u3', ticketId: 'tk1', projectId: 'p1', module: 'FI', date: '2026-02-05', hours: 3, description: 'Data mapping analysis', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-05T18:00:00Z' },
  { id: 'imp4', consultantId: 'u3', ticketId: 'tk7', projectId: 'p1', module: 'ABAP', date: '2026-02-10', hours: 8, description: 'Memory profiling session', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-10T18:00:00Z' },
  { id: 'imp5', consultantId: 'u3', ticketId: 'tk7', projectId: 'p1', module: 'ABAP', date: '2026-02-11', hours: 7, description: 'Fix streaming export for large datasets', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-11T18:00:00Z' },
  { id: 'imp6', consultantId: 'u5', ticketId: 'tk2', projectId: 'p2', module: 'FIORI', date: '2026-02-12', hours: 6, description: 'Backend connection debugging', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-12T18:00:00Z' },
  { id: 'imp7', consultantId: 'u5', ticketId: 'tk2', projectId: 'p2', module: 'FIORI', date: '2026-02-13', hours: 5, description: 'OData endpoint testing', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-13T18:00:00Z' },
  // Second half of February - some SUBMITTED, some DRAFT
  { id: 'imp8', consultantId: 'u3', ticketId: 'tk5', projectId: 'p1', module: 'ABAP', date: '2026-02-17', hours: 8, description: 'Batch job retry logic design', validationStatus: 'SUBMITTED', periodKey: '2026-02-H2', createdAt: '2026-02-17T18:00:00Z' },
  { id: 'imp9', consultantId: 'u3', ticketId: 'tk5', projectId: 'p1', module: 'ABAP', date: '2026-02-18', hours: 7, description: 'Error handling implementation', validationStatus: 'SUBMITTED', periodKey: '2026-02-H2', createdAt: '2026-02-18T18:00:00Z' },
  { id: 'imp10', consultantId: 'u3', ticketId: 'tk6', projectId: 'p2', module: 'FIORI', date: '2026-02-19', hours: 4, description: 'Notification service configuration', validationStatus: 'SUBMITTED', periodKey: '2026-02-H2', createdAt: '2026-02-19T18:00:00Z' },
  { id: 'imp11', consultantId: 'u3', ticketId: 'tk1', projectId: 'p1', module: 'FI', date: '2026-02-20', hours: 5, description: 'Customer master mapping rules documentation', validationStatus: 'DRAFT', periodKey: '2026-02-H2', createdAt: '2026-02-20T18:00:00Z' },
  { id: 'imp12', consultantId: 'u5', ticketId: 'tk9', projectId: 'p1', module: 'SD', date: '2026-02-17', hours: 6, description: 'Condition table setup for SD pricing', validationStatus: 'SUBMITTED', periodKey: '2026-02-H2', createdAt: '2026-02-17T18:00:00Z' },
  { id: 'imp13', consultantId: 'u5', ticketId: 'tk9', projectId: 'p1', module: 'SD', date: '2026-02-18', hours: 7, description: 'Pricing procedure configuration', validationStatus: 'SUBMITTED', periodKey: '2026-02-H2', createdAt: '2026-02-18T18:00:00Z' },
  { id: 'imp14', consultantId: 'u5', ticketId: 'tk2', projectId: 'p2', module: 'FIORI', date: '2026-02-19', hours: 4, description: 'Final integration testing', validationStatus: 'DRAFT', periodKey: '2026-02-H2', createdAt: '2026-02-19T18:00:00Z' },
  { id: 'imp15', consultantId: 'u4', ticketId: 'tk8', projectId: 'p2', module: 'MM', date: '2026-02-20', hours: 6, description: 'PO approval form testing', validationStatus: 'SUBMITTED', periodKey: '2026-02-H2', createdAt: '2026-02-20T18:00:00Z' },
  { id: 'imp16', consultantId: 'u4', ticketId: 'tk8', projectId: 'p2', module: 'MM', date: '2026-02-21', hours: 5, description: 'Workflow routing validation', validationStatus: 'DRAFT', periodKey: '2026-02-H2', createdAt: '2026-02-21T18:00:00Z' },
  // Manager imputation (u2 can impute)
  { id: 'imp17', consultantId: 'u2', ticketId: 'tk3', projectId: 'p1', module: 'ABAP', date: '2026-02-02', hours: 3, description: 'Code review of logging implementation', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-02T18:00:00Z' },
  { id: 'imp18', consultantId: 'u2', ticketId: 'tk1', projectId: 'p1', module: 'FI', date: '2026-02-03', hours: 5, description: 'Review data mapping specifications', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-03T18:00:00Z' },
  { id: 'imp19', consultantId: 'u2', ticketId: 'tk1', projectId: 'p1', module: 'FI', date: '2026-02-04', hours: 6, description: 'Stakeholder alignment on migration plan', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-04T18:00:00Z' },
  { id: 'imp20', consultantId: 'u2', ticketId: 'tk5', projectId: 'p1', module: 'ABAP', date: '2026-02-05', hours: 4, description: 'Batch job architecture review', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-05T18:00:00Z' },
  { id: 'imp21', consultantId: 'u2', ticketId: 'tk3', projectId: 'p1', module: 'ABAP', date: '2026-02-06', hours: 2, description: 'Review of logging implementation', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-06T18:00:00Z' },
  { id: 'imp22', consultantId: 'u2', ticketId: 'tk7', projectId: 'p1', module: 'ABAP', date: '2026-02-09', hours: 7, description: 'Performance profiling oversight', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-09T18:00:00Z' },
  { id: 'imp23', consultantId: 'u2', ticketId: 'tk2', projectId: 'p2', module: 'FIORI', date: '2026-02-10', hours: 4, description: 'Integration issue escalation meeting', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-10T18:00:00Z' },
  { id: 'imp24', consultantId: 'u2', ticketId: 'tk7', projectId: 'p1', module: 'ABAP', date: '2026-02-11', hours: 6, description: 'Export fix validation & sign-off', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-11T18:00:00Z' },
  { id: 'imp25', consultantId: 'u2', ticketId: 'tk8', projectId: 'p2', module: 'MM', date: '2026-02-12', hours: 3, description: 'PO approval workflow design review', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-12T18:00:00Z' },
  { id: 'imp26', consultantId: 'u2', ticketId: 'tk9', projectId: 'p1', module: 'SD', date: '2026-02-13', hours: 5, description: 'Pricing strategy alignment session', validationStatus: 'VALIDATED', periodKey: '2026-02-H1', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', createdAt: '2026-02-13T18:00:00Z' },
  // Manager H2 entries
  { id: 'imp27', consultantId: 'u2', ticketId: 'tk5', projectId: 'p1', module: 'ABAP', date: '2026-02-16', hours: 6, description: 'Batch job retry testing coordination', validationStatus: 'SUBMITTED', periodKey: '2026-02-H2', createdAt: '2026-02-16T18:00:00Z' },
  { id: 'imp28', consultantId: 'u2', ticketId: 'tk6', projectId: 'p2', module: 'FIORI', date: '2026-02-17', hours: 4, description: 'Notification service UAT planning', validationStatus: 'SUBMITTED', periodKey: '2026-02-H2', createdAt: '2026-02-17T18:00:00Z' },
  { id: 'imp29', consultantId: 'u2', ticketId: 'tk1', projectId: 'p1', module: 'FI', date: '2026-02-18', hours: 7, description: 'Migration cutover planning', validationStatus: 'SUBMITTED', periodKey: '2026-02-H2', createdAt: '2026-02-18T18:00:00Z' },
  { id: 'imp30', consultantId: 'u2', ticketId: 'tk9', projectId: 'p1', module: 'SD', date: '2026-02-19', hours: 5, description: 'Pricing procedure final review', validationStatus: 'SUBMITTED', periodKey: '2026-02-H2', createdAt: '2026-02-19T18:00:00Z' },
  { id: 'imp31', consultantId: 'u2', ticketId: 'tk3', projectId: 'p1', module: 'ABAP', date: '2026-02-20', hours: 3, description: 'Sprint retrospective & planning', validationStatus: 'DRAFT', periodKey: '2026-02-H2', createdAt: '2026-02-20T18:00:00Z' },
  { id: 'imp32', consultantId: 'u2', ticketId: 'tk8', projectId: 'p2', module: 'MM', date: '2026-02-23', hours: 8, description: 'PO approval go-live preparation', validationStatus: 'DRAFT', periodKey: '2026-02-H2', createdAt: '2026-02-23T18:00:00Z' },
  { id: 'imp33', consultantId: 'u2', ticketId: 'tk2', projectId: 'p2', module: 'FIORI', date: '2026-02-24', hours: 6, description: 'Fiori app deployment review', validationStatus: 'DRAFT', periodKey: '2026-02-H2', createdAt: '2026-02-24T18:00:00Z' },
  { id: 'imp34', consultantId: 'u2', ticketId: 'tk5', projectId: 'p1', module: 'ABAP', date: '2026-02-25', hours: 5, description: 'Batch processing performance tuning', validationStatus: 'DRAFT', periodKey: '2026-02-H2', createdAt: '2026-02-25T18:00:00Z' },
];

export const mockImputations: Imputation[] = persistedArray('imputations', _defaultImputations);

// ---------------------------------------------------------------------------
// Mock Imputation Periods
// ---------------------------------------------------------------------------

const _defaultImputationPeriods: ImputationPeriod[] = [
  { id: 'ip1', periodKey: '2026-02-H1', consultantId: 'u3', startDate: '2026-02-01', endDate: '2026-02-15', status: 'VALIDATED', totalHours: 28, submittedAt: '2026-02-16T08:00:00Z', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', sentToStraTIME: true, sentBy: 'u6', sentAt: '2026-02-17T09:30:00Z' },
  { id: 'ip2', periodKey: '2026-02-H1', consultantId: 'u5', startDate: '2026-02-01', endDate: '2026-02-15', status: 'VALIDATED', totalHours: 11, submittedAt: '2026-02-16T08:00:00Z', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', sentToStraTIME: true, sentBy: 'u6', sentAt: '2026-02-17T09:32:00Z' },
  { id: 'ip3', periodKey: '2026-02-H2', consultantId: 'u3', startDate: '2026-02-16', endDate: '2026-02-28', status: 'SUBMITTED', totalHours: 24, submittedAt: '2026-02-22T08:00:00Z' },
  { id: 'ip4', periodKey: '2026-02-H2', consultantId: 'u5', startDate: '2026-02-16', endDate: '2026-02-28', status: 'SUBMITTED', totalHours: 17, submittedAt: '2026-02-22T08:00:00Z' },
  { id: 'ip5', periodKey: '2026-02-H2', consultantId: 'u4', startDate: '2026-02-16', endDate: '2026-02-28', status: 'DRAFT', totalHours: 11 },
  { id: 'ip6', periodKey: '2026-02-H1', consultantId: 'u2', startDate: '2026-02-01', endDate: '2026-02-15', status: 'VALIDATED', totalHours: 45, submittedAt: '2026-02-16T08:00:00Z', validatedBy: 'u6', validatedAt: '2026-02-17T09:00:00Z', sentToStraTIME: true, sentBy: 'u6', sentAt: '2026-02-17T09:35:00Z' },
  { id: 'ip7', periodKey: '2026-02-H2', consultantId: 'u2', startDate: '2026-02-16', endDate: '2026-02-28', status: 'DRAFT', totalHours: 44 },
];

export const mockImputationPeriods: ImputationPeriod[] = persistedArray('imputationPeriods', _defaultImputationPeriods);


