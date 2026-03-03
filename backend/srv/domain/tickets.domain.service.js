// ─────────────────────────────────────────────────────────────────────────────
// Tickets Domain Service — business logic only
// No CAP event registration, no direct DB calls (uses TicketsRepo).
// ─────────────────────────────────────────────────────────────────────────────

class TicketsDomainService {
    constructor(repo) {
        this.repo = repo;
    }

    // ---------------------------------------------------------------------------
    // Before CREATE — auto-generate ticketCode, validate consultant roles, init history
    // ---------------------------------------------------------------------------
    async handleBeforeCreate(req) {
        const year = new Date().getFullYear();
        req.data.ticketCode = await this.repo.getNextTicketCode(year);

        if (!req.data.status) req.data.status = 'NEW';

        await this._validateTechConsultant(req);
        await this._validateFunctionalConsultant(req);

        if (!req.data.history) req.data.history = [];
        req.data.history.push({
            timestamp: new Date().toISOString(),
            userId: req.data.createdBy || 'system',
            action: 'CREATED',
            comment: 'Ticket created',
        });
    }

    // ---------------------------------------------------------------------------
    // Before UPDATE — validate changed consultant roles, emit auditable history events
    // ---------------------------------------------------------------------------
    async handleBeforeUpdate(req) {
        if (!req.data.ID) return;

        const existing = await this.repo.findById(req.data.ID);
        if (!existing) return;

        await this._validateTechConsultantOnUpdate(req, existing);
        await this._validateFunctionalConsultantOnUpdate(req, existing);

        const events = this._buildHistoryEvents(req.data, existing);
        await this.repo.insertHistoryEvents(events);
    }

    // ---------------------------------------------------------------------------
    // Action: nextTicketCode
    // ---------------------------------------------------------------------------
    async getNextTicketCode() {
        return this.repo.getNextTicketCode(new Date().getFullYear());
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    async _validateTechConsultant(req) {
        const id = req.data.techConsultant_ID;
        if (!id) return;
        const user = await this.repo.findUserById(id);
        if (!user) return req.reject(400, `Technical consultant '${id}' not found.`);
        if (user.role !== 'CONSULTANT_TECHNIQUE') {
            return req.reject(400, `User '${user.name}' (${user.role}) cannot be assigned as Technical Consultant.`);
        }
        req.data.assignedTo = user.ID;
        req.data.assignedToRole = 'CONSULTANT_TECHNIQUE';
        req.data.techConsultantRole = 'CONSULTANT_TECHNIQUE';
    }

    async _validateFunctionalConsultant(req) {
        const id = req.data.functionalConsultant_ID;
        if (!id) return;
        const user = await this.repo.findUserById(id);
        if (!user) return req.reject(400, `Functional consultant '${id}' not found.`);
        if (user.role !== 'CONSULTANT_FONCTIONNEL') {
            return req.reject(400, `User '${user.name}' (${user.role}) cannot be assigned as Functional Consultant.`);
        }
        req.data.functionalConsultantRole = 'CONSULTANT_FONCTIONNEL';
    }

    async _validateTechConsultantOnUpdate(req, existing) {
        const id = req.data.techConsultant_ID;
        if (!id || id === existing.techConsultant_ID) return;
        const user = await this.repo.findUserById(id);
        if (!user) return req.reject(400, `Technical consultant '${id}' not found.`);
        if (user.role !== 'CONSULTANT_TECHNIQUE') {
            return req.reject(400, `User '${user.name}' (${user.role}) cannot be assigned as Technical Consultant.`);
        }
        req.data.assignedTo = user.ID;
        req.data.assignedToRole = 'CONSULTANT_TECHNIQUE';
        req.data.techConsultantRole = 'CONSULTANT_TECHNIQUE';
    }

    async _validateFunctionalConsultantOnUpdate(req, existing) {
        const id = req.data.functionalConsultant_ID;
        if (!id || id === existing.functionalConsultant_ID) return;
        const user = await this.repo.findUserById(id);
        if (!user) return req.reject(400, `Functional consultant '${id}' not found.`);
        if (user.role !== 'CONSULTANT_FONCTIONNEL') {
            return req.reject(400, `User '${user.name}' (${user.role}) cannot be assigned as Functional Consultant.`);
        }
        req.data.functionalConsultantRole = 'CONSULTANT_FONCTIONNEL';
    }

    _buildHistoryEvents(data, existing) {
        const events = [];
        const now = new Date().toISOString();
        const userId = data.techConsultant_ID || existing.techConsultant_ID || data.assignedTo || existing.assignedTo || 'system';

        if (data.status && data.status !== existing.status) {
            events.push({ ticket_ID: data.ID, timestamp: now, userId, action: 'STATUS_CHANGE', fromValue: existing.status, toValue: data.status });
        }
        if (data.techConsultant_ID && data.techConsultant_ID !== existing.techConsultant_ID) {
            events.push({ ticket_ID: data.ID, timestamp: now, userId, action: 'ASSIGNED', toValue: data.techConsultant_ID, comment: 'Technical consultant assigned' });
        }
        if (data.functionalConsultant_ID && data.functionalConsultant_ID !== existing.functionalConsultant_ID) {
            events.push({ ticket_ID: data.ID, timestamp: now, userId, action: 'ASSIGNED', toValue: data.functionalConsultant_ID, comment: 'Functional consultant assigned' });
        }
        if (data.assignedTo && data.assignedTo !== existing.assignedTo && !data.techConsultant_ID) {
            events.push({ ticket_ID: data.ID, timestamp: now, userId, action: 'ASSIGNED', toValue: data.assignedTo });
        }
        if (data.priority && data.priority !== existing.priority) {
            events.push({ ticket_ID: data.ID, timestamp: now, userId, action: 'PRIORITY_CHANGE', fromValue: existing.priority, toValue: data.priority });
        }
        if (data.effortHours !== undefined && data.effortHours !== existing.effortHours) {
            events.push({ ticket_ID: data.ID, timestamp: now, userId, action: 'EFFORT_CHANGE', fromValue: String(existing.effortHours), toValue: String(data.effortHours), comment: data.effortComment || undefined });
        }
        return events;
    }
}

module.exports = TicketsDomainService;
