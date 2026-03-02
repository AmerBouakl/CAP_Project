// ---------------------------------------------------------------------------
// CDS Service Definition – Performance Service (Tickets & WRICEF)
// ---------------------------------------------------------------------------
using { sap.performance as db } from '../db/schema';

service PerformanceService @(path: '/odata/v4/performance') {

  // --- Users (with roles) ---
  entity Users as projection on db.Users;

  // --- WRICEF Objects (top-level WRICEF entries) ---
  entity WricefObjects as projection on db.WricefObjects;

  // --- WRICEF Items (objects within a WRICEF) ---
  entity WricefItems as projection on db.WricefItems;

  // --- Tickets (belong to WRICEF Items) ---
  entity Tickets as projection on db.Tickets;

  // --- Ticket Events (read via expand on Tickets) ---
  entity TicketEvents as projection on db.TicketEvents;

  // --- Documentation Objects ---
  entity DocumentationObjects as projection on db.DocumentationObjects;

  // --- Documentation Attachments ---
  entity DocumentationAttachments as projection on db.DocumentationAttachments;

  // --- Ticket Comments (Chat) ---
  entity TicketComments as projection on db.TicketComments;

  // --- Actions ---

  // Upload WRICEF Excel for a project (returns created objects)
  action uploadWricefExcel(projectId : String, base64File : LargeString) returns array of WricefObjects;

  // Generate next ticket code
  function nextTicketCode() returns String;
}
