// ---------------------------------------------------------------------------
// CAP Service Handler – Tickets & WRICEF Object Organizer
// ---------------------------------------------------------------------------
const cds = require('@sap/cds');
const XLSX = require('xlsx');

module.exports = class PerformanceService extends cds.ApplicationService {

  async init() {
    const { Tickets, WricefObjects, WricefItems, TicketEvents, DocumentationObjects, Users } = this.entities;

    // -----------------------------------------------------------------------
    // BEFORE CREATE Tickets – auto-generate ticketCode + validate consultant roles
    // -----------------------------------------------------------------------
    this.before('CREATE', 'Tickets', async (req) => {
      const year = new Date().getFullYear();
      const code = await this._nextTicketCode(year);
      req.data.ticketCode = code;

      // Default status
      if (!req.data.status) req.data.status = 'NEW';

      // Validate techConsultant has role CONSULTANT_TECHNIQUE
      if (req.data.techConsultant_ID) {
        const tech = await SELECT.one.from(Users).where({ ID: req.data.techConsultant_ID });
        if (!tech) {
          return req.reject(400, `Technical consultant with ID '${req.data.techConsultant_ID}' not found.`);
        }
        if (tech.role !== 'CONSULTANT_TECHNIQUE') {
          return req.reject(400, `User '${tech.name}' (${tech.role}) cannot be assigned as Technical Consultant. Expected role: CONSULTANT_TECHNIQUE.`);
        }
        // Keep denormalized assignedTo in sync
        req.data.assignedTo = tech.ID;
        req.data.assignedToRole = 'CONSULTANT_TECHNIQUE';
        req.data.techConsultantRole = 'CONSULTANT_TECHNIQUE';
      }

      // Validate functionalConsultant has role CONSULTANT_FONCTIONNEL
      if (req.data.functionalConsultant_ID) {
        const func = await SELECT.one.from(Users).where({ ID: req.data.functionalConsultant_ID });
        if (!func) {
          return req.reject(400, `Functional consultant with ID '${req.data.functionalConsultant_ID}' not found.`);
        }
        if (func.role !== 'CONSULTANT_FONCTIONNEL') {
          return req.reject(400, `User '${func.name}' (${func.role}) cannot be assigned as Functional Consultant. Expected role: CONSULTANT_FONCTIONNEL.`);
        }
        req.data.functionalConsultantRole = 'CONSULTANT_FONCTIONNEL';
      }

      // Create initial history event
      if (!req.data.history) {
        req.data.history = [];
      }
      req.data.history.push({
        timestamp: new Date().toISOString(),
        userId: req.data.createdBy || 'system',
        action: 'CREATED',
        comment: 'Ticket created',
      });
    });

    // -----------------------------------------------------------------------
    // BEFORE UPDATE Tickets – validate consultant roles + push history events
    // -----------------------------------------------------------------------
    this.before('UPDATE', 'Tickets', async (req) => {
      if (!req.data.ID) return;

      const existing = await SELECT.one.from(Tickets).where({ ID: req.data.ID });
      if (!existing) return;

      // Validate techConsultant role when being changed
      if (req.data.techConsultant_ID && req.data.techConsultant_ID !== existing.techConsultant_ID) {
        const tech = await SELECT.one.from(Users).where({ ID: req.data.techConsultant_ID });
        if (!tech) {
          return req.reject(400, `Technical consultant with ID '${req.data.techConsultant_ID}' not found.`);
        }
        if (tech.role !== 'CONSULTANT_TECHNIQUE') {
          return req.reject(400, `User '${tech.name}' (${tech.role}) cannot be assigned as Technical Consultant. Expected role: CONSULTANT_TECHNIQUE.`);
        }
        req.data.assignedTo = tech.ID;
        req.data.assignedToRole = 'CONSULTANT_TECHNIQUE';
        req.data.techConsultantRole = 'CONSULTANT_TECHNIQUE';
      }

      // Validate functionalConsultant role when being changed
      if (req.data.functionalConsultant_ID && req.data.functionalConsultant_ID !== existing.functionalConsultant_ID) {
        const func = await SELECT.one.from(Users).where({ ID: req.data.functionalConsultant_ID });
        if (!func) {
          return req.reject(400, `Functional consultant with ID '${req.data.functionalConsultant_ID}' not found.`);
        }
        if (func.role !== 'CONSULTANT_FONCTIONNEL') {
          return req.reject(400, `User '${func.name}' (${func.role}) cannot be assigned as Functional Consultant. Expected role: CONSULTANT_FONCTIONNEL.`);
        }
        req.data.functionalConsultantRole = 'CONSULTANT_FONCTIONNEL';
      }

      // Emit history events for auditable changes
      const events = [];
      const now = new Date().toISOString();
      const userId = req.data.techConsultant_ID || existing.techConsultant_ID || req.data.assignedTo || existing.assignedTo || 'system';

      if (req.data.status && req.data.status !== existing.status) {
        events.push({
          ticket_ID: req.data.ID,
          timestamp: now,
          userId,
          action: 'STATUS_CHANGE',
          fromValue: existing.status,
          toValue: req.data.status,
        });
      }

      if (req.data.techConsultant_ID && req.data.techConsultant_ID !== existing.techConsultant_ID) {
        events.push({
          ticket_ID: req.data.ID,
          timestamp: now,
          userId,
          action: 'ASSIGNED',
          toValue: req.data.techConsultant_ID,
          comment: 'Technical consultant assigned',
        });
      }

      if (req.data.functionalConsultant_ID && req.data.functionalConsultant_ID !== existing.functionalConsultant_ID) {
        events.push({
          ticket_ID: req.data.ID,
          timestamp: now,
          userId,
          action: 'ASSIGNED',
          toValue: req.data.functionalConsultant_ID,
          comment: 'Functional consultant assigned',
        });
      }

      // Keep legacy assignedTo in sync too
      if (req.data.assignedTo && req.data.assignedTo !== existing.assignedTo && !req.data.techConsultant_ID) {
        events.push({
          ticket_ID: req.data.ID,
          timestamp: now,
          userId,
          action: 'ASSIGNED',
          toValue: req.data.assignedTo,
        });
      }

      if (req.data.priority && req.data.priority !== existing.priority) {
        events.push({
          ticket_ID: req.data.ID,
          timestamp: now,
          userId,
          action: 'PRIORITY_CHANGE',
          fromValue: existing.priority,
          toValue: req.data.priority,
        });
      }

      if (req.data.effortHours !== undefined && req.data.effortHours !== existing.effortHours) {
        events.push({
          ticket_ID: req.data.ID,
          timestamp: now,
          userId,
          action: 'EFFORT_CHANGE',
          fromValue: String(existing.effortHours),
          toValue: String(req.data.effortHours),
          comment: req.data.effortComment || undefined,
        });
      }

      if (events.length > 0) {
        await INSERT.into(TicketEvents).entries(events);
      }
    });

    // -----------------------------------------------------------------------
    // Action: uploadWricefExcel – parse Excel base64 and create full hierarchy
    //   WricefObject → WricefItem (Object) → Ticket  for EACH Excel row
    // -----------------------------------------------------------------------
    this.on('uploadWricefExcel', async (req) => {
      const { projectId, base64File } = req.data;

      if (!projectId || !base64File) {
        return req.reject(400, 'projectId and base64File are required');
      }

      try {
        const buffer = Buffer.from(base64File, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Auto-detect where the header row is.
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        let headerRowIndex = 0;
        const headerKeywords = ['id', 'ID', 'Id', 'wricefId', 'WRICEF', 'wricef'];
        for (let r = range.s.r; r <= Math.min(range.s.r + 5, range.e.r); r++) {
          const cellA = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
          const cellB = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
          const valA = cellA ? String(cellA.v).trim() : '';
          const valB = cellB ? String(cellB.v).trim() : '';
          if (headerKeywords.includes(valA) || valB.toLowerCase().includes('type')) {
            headerRowIndex = r;
            break;
          }
        }

        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', range: headerRowIndex });

        if (!rows || rows.length === 0) {
          return req.reject(400, 'Excel file is empty or has no data rows');
        }

        const created = [];

        // Helper: get a value by trying multiple candidate column names
        const pick = (row, ...keys) => {
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== '') return String(row[k]).trim();
          }
          return '';
        };

        // Map WRICEF type char to TicketNature
        const natureMap = {
          'W': 'WORKFLOW',
          'R': 'REPORT',
          'I': 'MODULE',        // Interface → Module
          'C': 'PROGRAMME',     // Conversion → Programme
          'E': 'ENHANCEMENT',
          'F': 'FORMULAIRE',
        };

        const year = new Date().getFullYear();
        let rowIdx = 0;

        for (const row of rows) {
          rowIdx++;

          // Flexible column names (supports English & French headers)
          const wricefId    = pick(row, 'ID', 'id', 'Id', 'wricefId', 'WRICEF ID');
          const rawType     = pick(row, 'Type WRICEF', 'Type', 'type', 'TYPE', 'TYPE WRICEF');
          const title       = pick(row, 'Titre', 'Title', 'title', 'TITLE', 'TITRE');
          const description = pick(row, 'Description', 'description', 'DESCRIPTION');
          const rawModule   = pick(row, 'Module SAP', 'Module', 'module', 'MODULE', 'MODULE SAP');
          const rawComplexity = pick(row, 'Complexité', 'Complexity', 'complexity', 'COMPLEXITY', 'COMPLEXITE');

          // Map WRICEF type (W, R, I, C, E, F)
          const typeChar = rawType.toUpperCase().charAt(0);
          const validTypes = ['W', 'R', 'I', 'C', 'E', 'F'];
          const type = validTypes.includes(typeChar) ? typeChar : null;

          // Map complexity (French + English)
          let complexity = 'MOYEN';
          const complexityMap = {
            'SIMPLE': 'SIMPLE', 'LOW': 'SIMPLE', 'EASY': 'SIMPLE', 'FAIBLE': 'SIMPLE',
            'MOYEN': 'MOYEN', 'MEDIUM': 'MOYEN', 'MODERATE': 'MOYEN', 'MOYENNE': 'MOYEN',
            'COMPLEXE': 'COMPLEXE', 'COMPLEX': 'COMPLEXE', 'HIGH': 'COMPLEXE',
            'ELEVE': 'COMPLEXE', 'ÉLEVÉ': 'COMPLEXE', 'ÉLEVÉE': 'COMPLEXE', 'ELEVÉ': 'COMPLEXE',
            'TRES_COMPLEXE': 'TRES_COMPLEXE', 'VERY_COMPLEX': 'TRES_COMPLEXE', 'CRITICAL': 'TRES_COMPLEXE',
            'TRÈS COMPLEXE': 'TRES_COMPLEXE', 'TRES COMPLEXE': 'TRES_COMPLEXE',
          };
          const normComplexity = rawComplexity.toUpperCase().replace(/[_-]/g, ' ').trim();
          if (complexityMap[normComplexity]) complexity = complexityMap[normComplexity];
          else if (complexityMap[rawComplexity.toUpperCase().trim()]) complexity = complexityMap[rawComplexity.toUpperCase().trim()];

          // Map SAP module
          let module = 'OTHER';
          const validModules = ['FI', 'CO', 'MM', 'SD', 'PP', 'PM', 'QM', 'HR', 'PS', 'WM', 'BASIS', 'ABAP', 'FIORI', 'BW', 'OTHER'];
          const modulePart = rawModule.toUpperCase().replace(/[/-].*$/, '').trim();
          if (validModules.includes(modulePart)) module = modulePart;

          if (!wricefId && !title) continue; // skip empty rows

          // Generate ticket code for this row
          const ticketCode = await this._nextTicketCode(year);

          // Determine ticket nature from WRICEF type
          const nature = (type && natureMap[type]) ? natureMap[type] : 'PROGRAMME';

          const finalTitle = title || `Object ${wricefId}`;
          const finalWricefId = wricefId || `OBJ-${Date.now()}-${rowIdx}`;

          // ── Deep insert: WricefObject → WricefItem → Ticket ──
          const entry = {
            projectId,
            wricefId: finalWricefId,
            type: type || undefined,
            title: finalTitle,
            description,
            complexity,
            module,
            // One default Item (Object) per WRICEF
            items: [{
              objectId: `obj-001`,
              title: finalTitle,
              description,
              // One default Ticket per Item
              tickets: [{
                ticketCode,
                projectId,
                createdBy: 'excel-import',
                status: 'NEW',
                priority: 'MEDIUM',
                nature,
                title: finalTitle,
                description,
                module,
                complexity,
                effortHours: 0,
                estimationHours: 0,
                // Initial history event
                history: [{
                  timestamp: new Date().toISOString(),
                  userId: 'excel-import',
                  action: 'CREATED',
                  comment: 'Created from Excel import',
                }],
              }],
            }],
          };

          await INSERT.into(WricefObjects).entries(entry);
          created.push(entry);
        }

        console.log(`Excel import: created ${created.length} WRICEFs with items & tickets for project ${projectId}`);

        // Return all objects for this project (with full hierarchy)
        return await SELECT.from(WricefObjects).where({ projectId });
      } catch (err) {
        console.error('Excel parse error:', err);
        return req.reject(400, `Failed to parse Excel file: ${err.message}`);
      }
    });

    // -----------------------------------------------------------------------
    // Function: nextTicketCode
    // -----------------------------------------------------------------------
    this.on('nextTicketCode', async () => {
      const year = new Date().getFullYear();
      return this._nextTicketCode(year);
    });

    await super.init();
  }

  // -------------------------------------------------------------------------
  // Helper: generate next ticket code (TK-YYYY-NNNN)
  // -------------------------------------------------------------------------
  async _nextTicketCode(year) {
    const db = await cds.connect.to('db');
    const { TicketCounters } = db.entities('sap.performance');

    let counter = await SELECT.one.from(TicketCounters).where({ year });

    if (!counter) {
      await INSERT.into(TicketCounters).entries({ year, lastNumber: 1 });
      return `TK-${year}-0001`;
    }

    const nextNum = counter.lastNumber + 1;
    await UPDATE(TicketCounters).set({ lastNumber: nextNum }).where({ year });
    return `TK-${year}-${String(nextNum).padStart(4, '0')}`;
  }
};
