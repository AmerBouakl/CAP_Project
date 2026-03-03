// ─────────────────────────────────────────────────────────────────────────────
// WRICEF Repository — all DB access for WricefObjects and WricefItems
// No business logic, no CAP event registration, just queries.
// ─────────────────────────────────────────────────────────────────────────────

class WricefRepo {
    constructor(srv) {
        this.srv = srv;
    }

    get entities() {
        return this.srv.entities;
    }

    /** Insert a full WricefObject hierarchy (with items and tickets) */
    async insertWricefObject(entry) {
        const { WricefObjects } = this.entities;
        await INSERT.into(WricefObjects).entries(entry);
    }

    /** Get all WricefObjects for a project */
    async findByProject(projectId) {
        const { WricefObjects } = this.entities;
        return SELECT.from(WricefObjects).where({ projectId });
    }
}

module.exports = WricefRepo;
