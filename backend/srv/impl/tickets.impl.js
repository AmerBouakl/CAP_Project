// ─────────────────────────────────────────────────────────────────────────────
// Tickets impl — thin CAP event registration only (< 40 lines)
// Delegates immediately to TicketsDomainService. No logic here.
// ─────────────────────────────────────────────────────────────────────────────
const TicketsRepo = require('../repo/tickets.repo');
const TicketsDomainService = require('../domain/tickets.domain.service');

/**
 * Register all CAP event handlers related to Tickets.
 * @param {import('@sap/cds').ApplicationService} srv
 */
module.exports = (srv) => {
    const repo = new TicketsRepo(srv);
    const domain = new TicketsDomainService(repo);

    srv.before('CREATE', 'Tickets', (req) => domain.handleBeforeCreate(req));
    srv.before('UPDATE', 'Tickets', (req) => domain.handleBeforeUpdate(req));
    srv.on('nextTicketCode', () => domain.getNextTicketCode());
};
