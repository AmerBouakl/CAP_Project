const D = require('./node_modules/better-sqlite3');
const db = new D('./db.sqlite');

const tablesToClear = [
    'sap_performance_TicketEvents',
    'sap_performance_TicketComments',
    'sap_performance_Tickets',
    'sap_performance_WricefItems',
    'sap_performance_DocumentationObjects',
    'sap_performance_DocumentationAttachments',
    'sap_performance_WricefObjects',
    'sap_performance_Projects',
    'sap_performance_Tasks',
    'sap_performance_Notifications',
    'sap_performance_Allocations',
    'sap_performance_ImputationPeriods',
    'sap_performance_Imputations',
    'sap_performance_LeaveRequests',
    'sap_performance_AbaqueCriteria',
    'sap_performance_Abaques',
    'sap_performance_ReferenceData',
];

db.transaction(() => {
    for (const table of tablesToClear) {
        try {
            const count = db.prepare(`DELETE FROM "${table}"`).run();
            console.log(`Cleared ${table}: ${count.changes} rows`);
        } catch (e) {
            console.log(`Skipped ${table}: ${e.message}`);
        }
    }
})();

const userCount = db.prepare('SELECT COUNT(*) as n FROM sap_performance_Users').get();
console.log(`\nUsers preserved: ${userCount.n}`);
db.close();
