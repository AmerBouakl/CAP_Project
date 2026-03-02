// Entity types for SAP CAP Performance Management Platform

export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'CONSULTANT_TECHNIQUE'
  | 'CONSULTANT_FONCTIONNEL'
  | 'PROJECT_MANAGER'
  | 'DEV_COORDINATOR';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  CONSULTANT_TECHNIQUE: 'Technical Consultant',
  CONSULTANT_FONCTIONNEL: 'Functional Consultant',
  PROJECT_MANAGER: 'Project Manager',
  DEV_COORDINATOR: 'Dev Coordinator',
};

export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type RiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ValidationStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';
export type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'IN_TEST' | 'BLOCKED' | 'DONE' | 'REJECTED';
export type Complexity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CertificationStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ---------------------------------------------------------------------------
// SAP Module – assigned per ticket
// ---------------------------------------------------------------------------
export type SAPModule =
  | 'FI'
  | 'CO'
  | 'MM'
  | 'SD'
  | 'PP'
  | 'PM'
  | 'QM'
  | 'HR'
  | 'PS'
  | 'WM'
  | 'BASIS'
  | 'ABAP'
  | 'FIORI'
  | 'BW'
  | 'OTHER';

export const SAP_MODULE_LABELS: Record<SAPModule, string> = {
  FI: 'FI – Finance',
  CO: 'CO – Controlling',
  MM: 'MM – Materials Mgmt',
  SD: 'SD – Sales & Dist.',
  PP: 'PP – Production',
  PM: 'PM – Plant Maint.',
  QM: 'QM – Quality Mgmt',
  HR: 'HR – Human Resources',
  PS: 'PS – Project System',
  WM: 'WM – Warehouse Mgmt',
  BASIS: 'BASIS – Admin',
  ABAP: 'ABAP – Development',
  FIORI: 'Fiori / UI5',
  BW: 'BW – Business Warehouse',
  OTHER: 'Other',
};

// ---------------------------------------------------------------------------
// WRICEF Type – W/R/I/C/E/F
// ---------------------------------------------------------------------------
export type WricefType = 'W' | 'R' | 'I' | 'C' | 'E' | 'F';

export const WRICEF_TYPE_LABELS: Record<WricefType, string> = {
  W: 'Workflow',
  R: 'Report',
  I: 'Interface',
  C: 'Conversion',
  E: 'Enhancement',
  F: 'Form',
};

export const WRICEF_TYPE_COLORS: Record<WricefType, string> = {
  W: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  R: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  I: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  C: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  E: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  F: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
};

// ---------------------------------------------------------------------------
// Ticket Complexity – business labels
// ---------------------------------------------------------------------------
export type TicketComplexity = 'SIMPLE' | 'MOYEN' | 'COMPLEXE' | 'TRES_COMPLEXE';

export const TICKET_COMPLEXITY_LABELS: Record<TicketComplexity, string> = {
  SIMPLE: 'Simple',
  MOYEN: 'Medium',
  COMPLEXE: 'Complex',
  TRES_COMPLEXE: 'Very Complex',
};

// ---------------------------------------------------------------------------
// Imputation Validation Status
// ---------------------------------------------------------------------------
export type ImputationValidationStatus = 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED';

export const IMPUTATION_VALIDATION_LABELS: Record<ImputationValidationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  VALIDATED: 'Validated',
  REJECTED: 'Rejected',
};

// ---------------------------------------------------------------------------
// Ticket Nature enum – required on every ticket
// ---------------------------------------------------------------------------
export type TicketNature =
  | 'WORKFLOW'
  | 'FORMULAIRE'
  | 'PROGRAMME'
  | 'ENHANCEMENT'
  | 'MODULE'
  | 'REPORT';

export const TICKET_NATURE_LABELS: Record<TicketNature, string> = {
  WORKFLOW: 'Workflow',
  FORMULAIRE: 'Formulaire',
  PROGRAMME: 'Programme',
  ENHANCEMENT: 'Enhancement',
  MODULE: 'Module',
  REPORT: 'Report',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  IN_TEST: 'In Test',
  BLOCKED: 'Blocked',
  DONE: 'Done',
  REJECTED: 'Rejected',
};

// ---------------------------------------------------------------------------
// Abaques de Chiffrage
// ---------------------------------------------------------------------------

export type AbaqueTaskNature =
  | TicketNature
  | 'BUG'
  | 'FEATURE'
  | 'DOCUMENTATION'
  | 'SUPPORT';

export const ABAQUE_TASK_NATURE_LABELS: Record<AbaqueTaskNature, string> = {
  WORKFLOW: 'Workflow',
  FORMULAIRE: 'Formulaire',
  PROGRAMME: 'Programme',
  ENHANCEMENT: 'Enhancement',
  MODULE: 'Module',
  REPORT: 'Report',
  BUG: 'Bug',
  FEATURE: 'Feature',
  DOCUMENTATION: 'Documentation',
  SUPPORT: 'Support',
};

export type AbaqueComplexity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AbaqueEntry {
  taskNature: AbaqueTaskNature;
  complexity: AbaqueComplexity;
  standardHours: number;
}

export interface Abaque {
  id: string;
  name: string;
  entries: AbaqueEntry[];
}

export type ProjectAbaqueUsersRange = '1-50' | '51-200' | '200+';
export type ProjectCustomizationLevel = 'STANDARD' | 'MEDIUM' | 'HIGH_CUSTOM';
export type ProjectAbaqueRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ProjectAbaqueCriteria {
  numberOfUsers: number | ProjectAbaqueUsersRange;
  modulesInvolved: string[];
  numberOfCountries: number;
  customizationLevel: ProjectCustomizationLevel;
}

export interface AbaqueEstimateResult {
  complexity: AbaqueComplexity;
  estimatedConsultingDays: number;
  budgetBracket: string;
  riskLevel: ProjectAbaqueRiskLevel;
  recommendedTeamSize: number;
}

export interface ProjectAbaqueEstimate {
  criteria: ProjectAbaqueCriteria;
  result: AbaqueEstimateResult;
  estimatedAt: string;
  estimatedBy?: string;
}

// ---------------------------------------------------------------------------
// Documentation Object / Knowledge Base
// ---------------------------------------------------------------------------

export type DocumentationObjectType = 'SFD' | 'GUIDE' | 'ARCHITECTURE_DOC' | 'GENERAL';

export const DOCUMENTATION_OBJECT_TYPE_LABELS: Record<DocumentationObjectType, string> = {
  SFD: 'SFD',
  GUIDE: 'Guide',
  ARCHITECTURE_DOC: 'Architecture Doc',
  GENERAL: 'General',
};

export interface DocumentationAttachment {
  id?: string;
  filename: string;
  size: number;
  url: string;
}

export interface DocumentationObject {
  id: string;
  /** ID of the parent WRICEF object */
  wricefObjectId: string;
  projectId: string;
  title: string;
  description: string;
  type: DocumentationObjectType;
  content: string;
  attachments: DocumentationAttachment[];
  createdAt: string;
  updatedAt?: string;
  authorId: string;
}

// ---------------------------------------------------------------------------
// WRICEF Object – from the project WRICEF spreadsheet
// ---------------------------------------------------------------------------

export interface WricefObject {
  id: string;
  projectId: string;
  /** WRICEF reference ID (e.g. W-001, R-003) */
  wricefId: string;
  /** WRICEF type: W, R, I, C, E, F */
  type?: WricefType;
  title: string;
  description: string;
  complexity: TicketComplexity;
  /** SAP module (e.g. MM, FI, SD) */
  module?: SAPModule;
  createdAt: string;
  updatedAt?: string;
  /** Objects (items) within this WRICEF (populated via expand) */
  items?: WricefItem[];
  /** Documentation objects belonging to this WRICEF */
  documents?: DocumentationObject[];
}

// ---------------------------------------------------------------------------
// WRICEF Item (Object) – an individual object within a WRICEF
// ---------------------------------------------------------------------------

export interface WricefItem {
  id: string;
  /** ID of the parent WRICEF */
  wricefId: string;
  /** Object reference ID (e.g. OBJ-001) */
  objectId: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  /** Tickets belonging to this object (populated via expand) */
  tickets?: Ticket[];
}

// ---------------------------------------------------------------------------
// Time-log types (replaces stopwatch / timer)
// ---------------------------------------------------------------------------

export interface TimeLog {
  id: string;
  consultantId: string;
  ticketId: string;
  projectId: string;
  date: string;
  durationMinutes: number;
  description?: string;
  sentToStraTIME: boolean;
  sentAt?: string;
}

// ---------------------------------------------------------------------------
// Certification (structured, replaces string[] on User)
// ---------------------------------------------------------------------------
export interface Certification {
  id: string;
  name: string;
  issuingBody: string;
  dateObtained: string;
  expiryDate?: string;
  status: CertificationStatus;
}

// ---------------------------------------------------------------------------
// Ticket history event
// ---------------------------------------------------------------------------
export interface TicketEvent {
  id: string;
  timestamp: string;
  userId: string;
  action: 'CREATED' | 'STATUS_CHANGE' | 'ASSIGNED' | 'COMMENT' | 'PRIORITY_CHANGE' | 'EFFORT_CHANGE' | 'SENT_TO_TEST';
  fromValue?: string;
  toValue?: string;
  comment?: string;
}

// ---------------------------------------------------------------------------
// Ticket Comment (Chat between technique & fonctionnel)
// ---------------------------------------------------------------------------
export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  userRole?: string;
  message: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  skills: string[];
  certifications: Certification[];
  availabilityPercent: number;
  teamId?: string;
  avatarUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  managerId: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  priority: Priority;
  description: string;
  progress?: number;
  budget?: number;
  complexity?: Complexity;
  techKeywords?: string[];
  documentation?: string;
  /** Optional linked estimation matrix (Abaque de chiffrage) */
  linkedAbaqueId?: string;
  /** Optional project scoping estimate generated from abaque criteria */
  abaqueEstimate?: ProjectAbaqueEstimate;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  plannedStart: string;
  plannedEnd: string;
  realStart?: string;
  realEnd?: string;
  progressPercent: number;
  estimatedHours: number;
  actualHours: number;
  effortHours: number;
  isCritical: boolean;
  riskLevel: RiskLevel;
  comments?: string;
}

export interface Timesheet {
  id: string;
  userId: string;
  date: string;
  hours: number;
  projectId: string;
  taskId?: string;
  comment?: string;
}

export interface Evaluation {
  id: string;
  userId: string;
  evaluatorId: string;
  projectId: string;
  period: string;
  score: number;
  qualitativeGrid: {
    productivity: number;
    quality: number;
    autonomy: number;
    collaboration: number;
    innovation: number;
  };
  feedback: string;
  createdAt: string;
}

export interface Deliverable {
  id: string;
  projectId: string;
  taskId?: string;
  type: string;
  name: string;
  url?: string;
  fileRef?: string;
  validationStatus: ValidationStatus;
  functionalComment?: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  /** Auto-generated unique Ticket ID (e.g. TK-2026-0001) */
  ticketCode: string;
  projectId: string;
  /** ID of the parent WRICEF Item (Object) */
  wricefItemId: string;
  createdBy: string;
  assignedTo?: string;
  /** Role of the assigned person at assignment time (historical accuracy) */
  assignedToRole?: UserRole;
  /** ID of the assigned technical consultant (FK to backend Users entity) */
  techConsultantId?: string;
  /** ID of the assigned functional consultant (FK to backend Users entity) */
  functionalConsultantId?: string;
  status: TicketStatus;
  priority: Priority;
  /** Required nature/category of the ticket */
  nature: TicketNature;
  title: string;
  description: string;
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
  history: TicketEvent[];
  /** Manual effort hours logged by the consultant */
  effortHours: number;
  effortComment?: string;
  /** Optional functional tester */
  functionalTesterId?: string;
  /** Tags for search / AI matching */
  tags?: string[];
  /** SAP module assignment */
  module: SAPModule;
  /** Estimation / chiffrage in hours */
  estimationHours: number;
  /** Business complexity level */
  complexity: TicketComplexity;
  /** True when estimation was auto-calculated from project abaque */
  estimatedViaAbaque?: boolean;
}

// TicketGroup is replaced by WricefObject – kept as alias for backward compatibility
export type TicketGroup = WricefObject;
export interface TicketGroupDocument {
  id: string;
  name: string;
  url: string;
  addedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ReferenceData {
  id: string;
  type: 'TASK_STATUS' | 'PRIORITY' | 'PROJECT_TYPE' | 'SKILL';
  code: string;
  label: string;
  active: boolean;
  order?: number;
}

export interface Allocation {
  id: string;
  userId: string;
  projectId: string;
  allocationPercent: number;
  startDate: string;
  endDate: string;
}

export interface LeaveRequest {
  id: string;
  consultantId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus;
  managerId: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface KPI {
  projectProgress: number;
  tasksOnTrack: number;
  tasksLate: number;
  criticalTasks: number;
  averageProductivity: number;
  allocationRate: number;
  activeRisks: number;
}

// ---------------------------------------------------------------------------
// AI Dispatch – Assignee Recommendation
// ---------------------------------------------------------------------------

export interface AssigneeRecommendation {
  userId: string;
  userName: string;
  userRole: UserRole;
  score: number;
  /** Breakdown of scoring factors */
  factors: {
    availabilityScore: number;
    skillsMatchScore: number;
    performanceScore: number;
    similarTicketsScore: number;
  };
  explanation: string;
}

// ---------------------------------------------------------------------------
// Imputation – Bi-weekly time-entry object
// ---------------------------------------------------------------------------

export interface Imputation {
  id: string;
  /** The consultant who performed the work */
  consultantId: string;
  /** Linked ticket */
  ticketId: string;
  /** Linked project (denormalized for faster queries) */
  projectId: string;
  /** SAP module (denormalized from ticket) */
  module: SAPModule;
  /** Date the hours were worked */
  date: string;
  /** Hours worked */
  hours: number;
  /** Description of work done */
  description?: string;
  /** Validation status */
  validationStatus: ImputationValidationStatus;
  /** Bi-weekly period key, e.g. "2026-02-H1" or "2026-02-H2" */
  periodKey: string;
  /** ID of the validator (Chef de Projet / Manager) */
  validatedBy?: string;
  /** Validation timestamp */
  validatedAt?: string;
  /** Created at */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Imputation period – groups imputations for bi-weekly submission
// ---------------------------------------------------------------------------

export interface ImputationPeriod {
  id: string;
  /** e.g. "2026-02-H1" */
  periodKey: string;
  consultantId: string;
  /** Start date of the 15-day period */
  startDate: string;
  /** End date of the 15-day period */
  endDate: string;
  /** Overall validation status for this submission */
  status: ImputationValidationStatus;
  /** Total hours in the period */
  totalHours: number;
  /** Submitted at */
  submittedAt?: string;
  /** Validated by */
  validatedBy?: string;
  /** Validated at */
  validatedAt?: string;
  /** Sent to StraTIME / Stratime platform */
  sentToStraTIME?: boolean;
  /** User who sent the period to StraTIME */
  sentBy?: string;
  /** Send timestamp */
  sentAt?: string;
}
