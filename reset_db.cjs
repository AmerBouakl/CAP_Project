// Run this script AFTER stopping cds watch to reset the SQLite database.
// cds watch will recreate db.sqlite from schema.cds automatically on next start.
const fs = require('fs');
const path = require('path');
const backendDir = path.join(__dirname, 'backend');
const files = ['db.sqlite', 'db.sqlite-shm', 'db.sqlite-wal'];
files.forEach(f => {
    const p = path.join(backendDir, f);
    if (fs.existsSync(p)) { fs.unlinkSync(p); console.log('Deleted:', f); }
    else { console.log('Not found (ok):', f); }
});
console.log('Done. Now run: cd backend && cds watch');
