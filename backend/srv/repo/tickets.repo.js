// ─────────────────────────────────────────────────────────────────────────────
// Tickets Repository — all DB access for Tickets and TicketEvents
// No business logic, no CAP event registration, just queries.
// ─────────────────────────────────────────────────────────────────────────────
const cds = require('@sap/cds');

class TicketsRepo {
    constructor(srv) {
        this.srv = srv;
    }

    get entities() {
        return this.srv.entities;
    }

    /** Find a single ticket by ID */
    async findById(id) {
        const { Tickets } = this.entities;
        return SELECT.one.from(Tickets).where({ ID: id });
    }

    /** Find a user by ID */
    async findUserById(id) {
        const { Users } = this.entities;
        return SELECT.one.from(Users).where({ ID: id });
    }

    /** Insert multiple TicketEvent records */
    async insertHistoryEvents(events) {
        if (!events || events.length === 0) return;
        const { TicketEvents } = this.entities;
        await INSERT.into(TicketEvents).entries(events);
    }

    /** Get or create the next sequential ticket code for a given year */
    async getNextTicketCode(year) {
        const db = await cds.connect.to('db');
        const { TicketCounters } = db.entities('sap.performance');

        const counter = await SELECT.one.from(TicketCounters).where({ year });
        if (!counter) {
            await INSERT.into(TicketCounters).entries({ year, lastNumber: 1 });
            return `TK-${year}-0001`;
        }

        const nextNum = counter.lastNumber + 1;
        await UPDATE(TicketCounters).set({ lastNumber: nextNum }).where({ year });
        return `TK-${year}-${String(nextNum).padStart(4, '0')}`;
    }
}

module.exports = TicketsRepo;
