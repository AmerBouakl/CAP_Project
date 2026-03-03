// ─────────────────────────────────────────────────────────────────────────────
// WRICEF impl — thin CAP event registration only (< 40 lines)
// Delegates immediately to WricefDomainService. No logic here.
// ─────────────────────────────────────────────────────────────────────────────
const WricefRepo = require('../repo/wricef.repo');
const TicketsRepo = require('../repo/tickets.repo');
const WricefDomainService = require('../domain/wricef.domain.service');

/**
 * Register all CAP event handlers related to WRICEF Objects.
 * @param {import('@sap/cds').ApplicationService} srv
 */
module.exports = (srv) => {
    const wricefRepo = new WricefRepo(srv);
    const ticketsRepo = new TicketsRepo(srv);
    const domain = new WricefDomainService(wricefRepo, ticketsRepo);

    srv.on('uploadWricefExcel', (req) => domain.handleExcelUpload(req));
};
