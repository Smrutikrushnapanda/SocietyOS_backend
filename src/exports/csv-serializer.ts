/**
 * Phase 10 - Step 4: safe CSV serialization.
 *
 * Handles commas, double quotes, CR/LF, null/undefined, dates, numbers and
 * booleans, and neutralizes spreadsheet formula injection for STRING values
 * only (numeric/date/boolean cells are never altered).
 *
 * RFC 4180 style: fields containing , " CR or LF are quoted; an embedded "
 * is doubled. null/undefined become an empty field.
 */

/** Leading characters that spreadsheet software treats as a formula. */
export const CSV_FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Neutralize formula injection on a raw string.
 *
 * A leading apostrophe is prepended so spreadsheet software renders the value
 * as literal text instead of evaluating it. Applied ONLY to string values:
 * real numbers (including negative numbers) and dates are untouched.
 */
export function neutralizeCsvFormula(value: string): string {
  if (value.length === 0) {
    return value;
  }
  return CSV_FORMULA_TRIGGERS.includes(value[0]) ? `'${value}` : value;
}

/** Serialize a single CSV cell (no formula neutralization for non-strings). */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let text: string;
  if (value instanceof Date) {
    text = Number.isNaN(value.getTime()) ? '' : value.toISOString();
  } else if (typeof value === 'number') {
    text = Number.isFinite(value) ? String(value) : '';
  } else if (typeof value === 'boolean') {
    text = value ? 'true' : 'false';
  } else if (typeof value === 'string') {
    text = neutralizeCsvFormula(value);
  } else {
    text = neutralizeCsvFormula(String(value));
  }

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Serialize rows into a CSV document.
 *
 * The column order is server-defined and stable; there is no client control
 * over columns or column order. Rows are emitted in the order supplied, so
 * callers must provide a deterministic ordering.
 */
export function serializeCsv(
  columns: readonly string[],
  rows: readonly Record<string, unknown>[],
): string {
  const header = columns.map((column) => escapeCsvValue(column)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row?.[column])).join(','),
  );
  return [header, ...body].join('\r\n') + '\r\n';
}
