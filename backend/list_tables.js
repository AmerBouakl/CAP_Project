const D = require('./node_modules/better-sqlite3');
const db = new D('./db.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables.map(t => t.name).join(', '));
db.close();
