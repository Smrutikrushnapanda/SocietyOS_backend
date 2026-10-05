"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSV_FORMULA_TRIGGERS = void 0;
exports.neutralizeCsvFormula = neutralizeCsvFormula;
exports.escapeCsvValue = escapeCsvValue;
exports.serializeCsv = serializeCsv;
exports.CSV_FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];
function neutralizeCsvFormula(value) {
    if (value.length === 0) {
        return value;
    }
    return exports.CSV_FORMULA_TRIGGERS.includes(value[0]) ? `'${value}` : value;
}
function escapeCsvValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    let text;
    if (value instanceof Date) {
        text = Number.isNaN(value.getTime()) ? '' : value.toISOString();
    }
    else if (typeof value === 'number') {
        text = Number.isFinite(value) ? String(value) : '';
    }
    else if (typeof value === 'boolean') {
        text = value ? 'true' : 'false';
    }
    else if (typeof value === 'string') {
        text = neutralizeCsvFormula(value);
    }
    else {
        text = neutralizeCsvFormula(String(value));
    }
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}
function serializeCsv(columns, rows) {
    const header = columns.map((column) => escapeCsvValue(column)).join(',');
    const body = rows.map((row) => columns.map((column) => escapeCsvValue(row?.[column])).join(','));
    return [header, ...body].join('\r\n') + '\r\n';
}
//# sourceMappingURL=csv-serializer.js.map