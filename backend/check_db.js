const D = require('./node_modules/better-sqlite3');
const db = new D('./db.sqlite');
const obs = db.prepare("SELECT * FROM sap_performance_WricefObjects").all();
console.log(JSON.stringify(obs, null, 2));
db.close();
