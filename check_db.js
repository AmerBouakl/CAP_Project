const Database = require('better-sqlite3');
const db = new Database('./backend/db.sqlite', { readonly: true });
const cols = db.prepare('PRAGMA table_info(sap_performance_Tickets)').all();
console.log('Columns:', cols.map(c => c.name).join(', '));
db.close();
