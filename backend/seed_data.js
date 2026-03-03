const D = require('./node_modules/better-sqlite3');
const db = new D('./db.sqlite');
const crypto = require('crypto');

try {
    const projectId = 'p1';

    // Clear existing seeded objects to avoid confusion
    db.prepare("DELETE FROM sap_performance_WricefObjects WHERE ID LIKE 'WRICEF-SEED%'").run();

    // Add sample WRICEF objects with valid UUID strings
    const objects = [
        {
            id: crypto.randomUUID(),
            wricefId: 'W-001',
            title: 'Sales Order Interface',
            description: 'Inbound interface for sales orders from external system',
            type: 'W',
            complexity: 'COMPLEXE',
            approvalStatus: 'PENDING'
        },
        {
            id: crypto.randomUUID(),
            wricefId: 'R-100',
            title: 'Financial Report Custom',
            description: 'Custom report for finance department',
            type: 'R',
            complexity: 'MOYEN',
            approvalStatus: 'PENDING'
        },
        {
            id: crypto.randomUUID(),
            wricefId: 'I-200',
            title: 'Material Master Update',
            description: 'Periodic update of material master data',
            type: 'I',
            complexity: 'MOYEN',
            approvalStatus: 'PENDING'
        }
    ];

    const insertObj = db.prepare(`
    INSERT INTO sap_performance_WricefObjects (id, projectId, wricefId, title, description, type, complexity, approvalStatus, createdAt, modifiedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

    for (const obj of objects) {
        insertObj.run(obj.id, projectId, obj.wricefId, obj.title, obj.description, obj.type, obj.complexity, obj.approvalStatus);
    }

    console.log('Seed data created successfully with valid UUIDs!');
} catch (e) {
    console.error('Seed error:', e.message);
} finally {
    db.close();
}
