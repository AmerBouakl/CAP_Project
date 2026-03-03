// ---------------------------------------------------------------------------
// CDS Schema – Tickets & WRICEF Object Organizer
// ---------------------------------------------------------------------------
namespace sap.performance;

using { cuid, managed } from '@sap/cds/common';

// ---------------------------------------------------------------------------
// Enums (as string types – CDS enum support)
// ---------------------------------------------------------------------------

type TicketStatus       : String(20) enum { PENDING; NEW; IN_PROGRESS; IN_TEST; BLOCKED; DONE; REJECTED; };
type Priority           : String(20) enum { LOW; MEDIUM; HIGH; CRITICAL; };
type TicketNature       : String(20) enum { WORKFLOW; FORMULAIRE; PROGRAMME; ENHANCEMENT; MODULE; REPORT; };
type TicketComplexity   : String(20) enum { SIMPLE; MOYEN; COMPLEXE; TRES_COMPLEXE; };
type SAPModule          : String(10) enum { FI; CO; MM; SD; PP; PM; QM; HR; PS; WM; BASIS; ABAP; FIORI; BW; OTHER; };
type TicketEventAction  : String(20) enum { CREATED; STATUS_CHANGE; ASSIGNED; COMMENT; PRIORITY_CHANGE; EFFORT_CHANGE; SENT_TO_TEST; };
type DocObjectType      : String(20) enum { SFD; GUIDE; ARCHITECTURE_DOC; GENERAL; };
type WricefType         : String(1)  enum { W; R; I; C; E; F; };

// ---------------------------------------------------------------------------
// User Role enum
// ---------------------------------------------------------------------------
type UserRole : String(30) enum {
  ADMIN;
  MANAGER;
  CONSULTANT_TECHNIQUE;
  CONSULTANT_FONCTIONNEL;
  PROJECT_MANAGER;
  DEV_COORDINATOR;
};

// ---------------------------------------------------------------------------
// Users – platform users with their role
// ---------------------------------------------------------------------------
entity Users : cuid, managed {
  name                 : String(200)  @mandatory;
  email                : String(200)  @mandatory;
  role                 : UserRole     @mandatory;
  active               : Boolean      default true;
  skills               : String(2000);               // comma-separated
  availabilityPercent  : Integer      default 100;
  teamId               : String(100);
  avatarUrl            : String(1000);
  // Navigation back to tickets assigned to this user
  techTickets          : Association to many Tickets on techTickets.techConsultant = $self;
  funcTickets          : Association to many Tickets on funcTickets.functionalConsultant = $self;
}

// ---------------------------------------------------------------------------
// WRICEF – the top-level grouping from the WRICEF spreadsheet
// Each project has many WRICEFs; each WRICEF groups objects & docs.
// ---------------------------------------------------------------------------

entity WricefObjects : cuid, managed {
  projectId      : String(100)   @mandatory;
  wricefId       : String(50)    @mandatory;   // e.g. W-001, R-003
  type           : WricefType;                 // W, R, I, C, E, F
  title          : String(500)   @mandatory;
  description    : String(5000);
  complexity     : TicketComplexity  default 'MOYEN';
  module         : SAPModule        default 'OTHER';
  approvalStatus : String(20)        default 'PENDING';  // PENDING | APPROVED | REJECTED
  // Navigation
  items          : Composition of many WricefItems on items.wricef = $self;
  documents      : Composition of many DocumentationObjects on documents.wricefObject = $self;
}

// ---------------------------------------------------------------------------
// WRICEF Items (Objects) – individual objects within a WRICEF entry
// Each WRICEF has many objects; each object groups tickets.
// ---------------------------------------------------------------------------

entity WricefItems : cuid, managed {
  wricef         : Association to WricefObjects @mandatory;
  objectId       : String(50)    @mandatory;   // e.g. OBJ-001
  title          : String(500)   @mandatory;
  description    : String(5000);
  // Navigation
  tickets        : Composition of many Tickets on tickets.wricefItem = $self;
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

entity Tickets : cuid, managed {
  ticketCode            : String(30);                  // Auto-generated TK-YYYY-NNNN
  projectId             : String(100)  @mandatory;
  wricefItem            : Association to WricefItems;
  createdBy             : String(100)  @mandatory;

  // ------------ Consultant assignments (mandatory) -------------------------
  // Technical consultant responsible for development/implementation
  techConsultant        : Association to Users;        // role CONSULTANT_TECHNIQUE
  techConsultantRole    : String(30)  default 'CONSULTANT_TECHNIQUE';

  // Functional consultant responsible for testing/validation
  functionalConsultant  : Association to Users;        // role CONSULTANT_FONCTIONNEL
  functionalConsultantRole : String(30) default 'CONSULTANT_FONCTIONNEL';

  // Legacy assignedTo fields (kept for backward compat)
  assignedTo            : String(100);
  assignedToRole        : String(30);

  status                : TicketStatus    default 'NEW';
  priority              : Priority        default 'MEDIUM';
  nature                : TicketNature    @mandatory;
  title                 : String(500)     @mandatory;
  description           : String(5000);
  dueDate               : Date;
  effortHours           : Decimal(8,2)    default 0;
  effortComment         : String(2000);
  functionalTesterId    : String(100);
  tags                  : String(1000);                // comma-separated
  module                : SAPModule       default 'OTHER';
  estimationHours       : Decimal(8,2)    default 0;
  complexity            : TicketComplexity default 'MOYEN';
  estimatedViaAbaque    : Boolean         default false;
  // Consultant Feedback (each consultant's written assessment)
  techFeedback          : String(5000);   // Written by CONSULTANT_TECHNIQUE
  functionalFeedback    : String(5000);   // Written by CONSULTANT_FONCTIONNEL
  // Navigation
  history               : Composition of many TicketEvents on history.ticket = $self;
}

// ---------------------------------------------------------------------------
// Ticket History Events
// ---------------------------------------------------------------------------

entity TicketEvents : cuid {
  ticket     : Association to Tickets;
  timestamp  : Timestamp  @cds.on.insert: $now;
  userId     : String(100);
  action     : TicketEventAction;
  fromValue  : String(500);
  toValue    : String(500);
  comment    : String(2000);
}

// ---------------------------------------------------------------------------
// Documentation Objects (Knowledge Base / SFD) – linked to WRICEF objects
// ---------------------------------------------------------------------------

entity DocumentationObjects : cuid, managed {
  wricefObject  : Association to WricefObjects @mandatory;
  projectId     : String(100)   @mandatory;
  title         : String(500)   @mandatory;
  description   : String(5000);
  type          : DocObjectType  default 'GENERAL';
  content       : LargeString;                    // markdown
  authorId      : String(100);
  // Navigation
  attachments   : Composition of many DocumentationAttachments on attachments.document = $self;
}

// ---------------------------------------------------------------------------
// Documentation Attachments
// ---------------------------------------------------------------------------

entity DocumentationAttachments : cuid {
  document  : Association to DocumentationObjects;
  filename  : String(500)  @mandatory;
  size      : Integer;
  url       : String(1000);
}

// ---------------------------------------------------------------------------
// Ticket Comments (Chat between technique & fonctionnel)
// ---------------------------------------------------------------------------

entity TicketComments : cuid {
  ticket     : Association to Tickets @mandatory;
  userId     : String(100)  @mandatory;
  userRole   : String(30);
  message    : String(5000) @mandatory;
  timestamp  : Timestamp    @cds.on.insert: $now;
}

// ---------------------------------------------------------------------------
// Ticket Code Counter (singleton for auto-increment)
// ---------------------------------------------------------------------------

entity TicketCounters {
  key year     : Integer;
  lastNumber   : Integer default 0;
}
