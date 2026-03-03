// ─────────────────────────────────────────────────────────────────────────────
// WRICEF Domain Service — business logic only
// No CAP event registration, no direct DB calls (uses WricefRepo + TicketsRepo).
// ─────────────────────────────────────────────────────────────────────────────
const XLSX = require('xlsx');
const { pick, mapComplexity, mapModule, mapNature } = require('../utils/mappings');
const { EXCEL_COLUMNS } = require('../utils/mappings');

class WricefDomainService {
    /**
     * @param {import('../repo/wricef.repo')} wricefRepo
     * @param {import('../repo/tickets.repo')} ticketsRepo
     */
    constructor(wricefRepo, ticketsRepo) {
        this.wricefRepo = wricefRepo;
        this.ticketsRepo = ticketsRepo;
    }

    // ---------------------------------------------------------------------------
    // Action: uploadWricefExcel
    // ---------------------------------------------------------------------------
    async handleExcelUpload(req) {
        const { projectId, base64File } = req.data;
        if (!projectId || !base64File) {
            return req.reject(400, 'projectId and base64File are required');
        }

        try {
            const rows = this._parseExcel(base64File);
            if (!rows || rows.length === 0) {
                return req.reject(400, 'Excel file is empty or has no data rows');
            }

            const year = new Date().getFullYear();
            const created = [];

            for (const row of rows) {
                const wricefId = pick(row, ...EXCEL_COLUMNS.wricefId);
                const rawType = pick(row, ...EXCEL_COLUMNS.type);
                const title = pick(row, ...EXCEL_COLUMNS.title);
                const description = pick(row, ...EXCEL_COLUMNS.description);
                const rawModule = pick(row, ...EXCEL_COLUMNS.module);
                const rawComplexity = pick(row, ...EXCEL_COLUMNS.complexity);

                if (!wricefId && !title) continue; // skip empty rows

                const type = rawType.toUpperCase().charAt(0);
                const validTypes = ['W', 'R', 'I', 'C', 'E', 'F'];
                const mappedType = validTypes.includes(type) ? type : null;

                const complexity = mapComplexity(rawComplexity);
                const module = mapModule(rawModule);
                const nature = mapNature(rawType);
                const ticketCode = await this.ticketsRepo.getNextTicketCode(year);
                const finalTitle = title || `Object ${wricefId}`;
                const finalId = wricefId || `OBJ-${Date.now()}`;

                const entry = {
                    projectId,
                    wricefId: finalId,
                    type: mappedType || undefined,
                    title: finalTitle,
                    description,
                    complexity,
                    module,
                    items: [{
                        objectId: 'obj-001',
                        title: finalTitle,
                        description,
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
                            history: [{
                                timestamp: new Date().toISOString(),
                                userId: 'excel-import',
                                action: 'CREATED',
                                comment: 'Created from Excel import',
                            }],
                        }],
                    }],
                };

                await this.wricefRepo.insertWricefObject(entry);
                created.push(entry);
            }

            console.log(`Excel import: created ${created.length} WRICEFs for project ${projectId}`);
            return await this.wricefRepo.findByProject(projectId);
        } catch (err) {
            console.error('Excel parse error:', err);
            return req.reject(400, `Failed to parse Excel file: ${err.message}`);
        }
    }

    // ---------------------------------------------------------------------------
    // Private: parse Excel base64 and detect header row
    // ---------------------------------------------------------------------------
    _parseExcel(base64File) {
        const buffer = Buffer.from(base64File, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        const headerKeywords = ['id', 'ID', 'Id', 'wricefId', 'WRICEF', 'wricef'];

        let headerRowIndex = 0;
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

        return XLSX.utils.sheet_to_json(sheet, { defval: '', range: headerRowIndex });
    }
}

module.exports = WricefDomainService;
