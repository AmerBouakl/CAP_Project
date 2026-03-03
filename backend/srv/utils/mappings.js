// ─────────────────────────────────────────────────────────────────────────────
// Shared mappings — no business logic, no DB, no CAP dependency
// ─────────────────────────────────────────────────────────────────────────────

/** WRICEF single-letter type → TicketNature enum */
const NATURE_MAP = {
    W: 'WORKFLOW',
    R: 'REPORT',
    I: 'MODULE',       // Interface → Module
    C: 'PROGRAMME',    // Conversion → Programme
    E: 'ENHANCEMENT',
    F: 'FORMULAIRE',
};

/** Normalised string → TicketComplexity enum */
const COMPLEXITY_MAP = {
    SIMPLE: 'SIMPLE', LOW: 'SIMPLE', EASY: 'SIMPLE', FAIBLE: 'SIMPLE',
    MOYEN: 'MOYEN', MEDIUM: 'MOYEN', MODERATE: 'MOYEN', MOYENNE: 'MOYEN',
    COMPLEXE: 'COMPLEXE', COMPLEX: 'COMPLEXE', HIGH: 'COMPLEXE',
    ELEVE: 'COMPLEXE', 'ÉLEVÉ': 'COMPLEXE', 'ÉLEVÉE': 'COMPLEXE', 'ELEVÉ': 'COMPLEXE',
    TRES_COMPLEXE: 'TRES_COMPLEXE', VERY_COMPLEX: 'TRES_COMPLEXE', CRITICAL: 'TRES_COMPLEXE',
    'TRÈS COMPLEXE': 'TRES_COMPLEXE', 'TRES COMPLEXE': 'TRES_COMPLEXE',
};

/** Valid SAP module codes */
const VALID_MODULES = ['FI', 'CO', 'MM', 'SD', 'PP', 'PM', 'QM', 'HR', 'PS', 'WM', 'BASIS', 'ABAP', 'FIORI', 'BW', 'OTHER'];

/** WRICEF Excel column name candidates (English & French) */
const EXCEL_COLUMNS = {
    wricefId: ['ID', 'id', 'Id', 'wricefId', 'WRICEF ID'],
    type: ['Type WRICEF', 'Type', 'type', 'TYPE', 'TYPE WRICEF'],
    title: ['Titre', 'Title', 'title', 'TITLE', 'TITRE'],
    description: ['Description', 'description', 'DESCRIPTION'],
    module: ['Module SAP', 'Module', 'module', 'MODULE', 'MODULE SAP'],
    complexity: ['Complexité', 'Complexity', 'complexity', 'COMPLEXITY', 'COMPLEXITE'],
};

/**
 * Pick the first non-empty value from a row using candidate column names.
 * @param {object} row
 * @param {...string} keys
 * @returns {string}
 */
function pick(row, ...keys) {
    for (const k of keys) {
        if (row[k] !== undefined && row[k] !== '') return String(row[k]).trim();
    }
    return '';
}

/**
 * Map a raw complexity string to a TicketComplexity enum value.
 * @param {string} raw
 * @returns {'SIMPLE'|'MOYEN'|'COMPLEXE'|'TRES_COMPLEXE'}
 */
function mapComplexity(raw) {
    const norm = raw.toUpperCase().replace(/[_-]/g, ' ').trim();
    return COMPLEXITY_MAP[norm] || COMPLEXITY_MAP[raw.toUpperCase().trim()] || 'MOYEN';
}

/**
 * Map a raw SAP module string to a valid module code.
 * @param {string} raw
 * @returns {string}
 */
function mapModule(raw) {
    const part = raw.toUpperCase().replace(/[/-].*$/, '').trim();
    return VALID_MODULES.includes(part) ? part : 'OTHER';
}

/**
 * Map a WRICEF type character to a TicketNature enum value.
 * @param {string} raw
 * @returns {string}
 */
function mapNature(raw) {
    const char = raw.toUpperCase().charAt(0);
    return NATURE_MAP[char] || 'PROGRAMME';
}

module.exports = { NATURE_MAP, COMPLEXITY_MAP, VALID_MODULES, EXCEL_COLUMNS, pick, mapComplexity, mapModule, mapNature };
