// ─────────────────────────────────────────────────────────────────────────────
// Tickets Service Definition
// ─────────────────────────────────────────────────────────────────────────────
using { sap.performance as db } from '../db/schema';

service TicketsService @(path: '/odata/v4/performance/tickets', impl: './impl/tickets.impl') {

  entity Tickets as projection on db.Tickets;
  entity TicketEvents as projection on db.TicketEvents;
  entity Users as projection on db.Users;
  entity TicketComments as projection on db.TicketComments;

  function nextTicketCode() returns String;
}
