import {
  CSV_FORMULA_TRIGGERS,
  escapeCsvValue,
  neutralizeCsvFormula,
  serializeCsv,
} from './csv-serializer';

describe('CSV serializer (Phase 10 Step 4)', () => {
  describe('escaping', () => {
    it('leaves plain values untouched', () => {
      expect(escapeCsvValue('Tower A')).toBe('Tower A');
      expect(escapeCsvValue('A-101')).toBe('A-101');
    });

    it('quotes fields containing a comma', () => {
      expect(escapeCsvValue('Doe, John')).toBe('"Doe, John"');
    });

    it('doubles embedded double quotes', () => {
      expect(escapeCsvValue('He said "hi"')).toBe('"He said ""hi"""');
    });

    it('quotes fields containing newlines and carriage returns', () => {
      expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
      expect(escapeCsvValue('line1\r\nline2')).toBe('"line1\r\nline2"');
      expect(escapeCsvValue('a\rb')).toBe('"a\rb"');
    });

    it('handles null and undefined as empty fields', () => {
      expect(escapeCsvValue(null)).toBe('');
      expect(escapeCsvValue(undefined)).toBe('');
    });

    it('handles dates as ISO-8601 and invalid dates as empty', () => {
      expect(escapeCsvValue(new Date('2026-01-31T10:20:30.000Z'))).toBe(
        '2026-01-31T10:20:30.000Z',
      );
      expect(escapeCsvValue(new Date('nope'))).toBe('');
    });

    it('handles numbers and booleans without quoting', () => {
      expect(escapeCsvValue(2500)).toBe('2500');
      expect(escapeCsvValue(0)).toBe('0');
      expect(escapeCsvValue(-12.5)).toBe('-12.5');
      expect(escapeCsvValue(Number.NaN)).toBe('');
      expect(escapeCsvValue(true)).toBe('true');
      expect(escapeCsvValue(false)).toBe('false');
    });

    it('preserves UTF-8 characters', () => {
      expect(escapeCsvValue('Café — Wörter ₹')).toBe('Café — Wörter ₹');
    });
  });

  describe('formula injection protection', () => {
    it.each(CSV_FORMULA_TRIGGERS)(
      'neutralizes a leading %p in string values',
      (trigger) => {
        const payload = `${trigger}cmd|' /C calc'!A1`;
        expect(neutralizeCsvFormula(payload)).toBe(`'${payload}`);
        // The escaped output must place the neutralizing apostrophe first in
        // the cell (with RFC 4180 quoting only when the cell requires it).
        const escaped = escapeCsvValue(payload);
        const inner = escaped.startsWith('"')
          ? escaped.slice(1, -1)
          : escaped;
        expect(inner.startsWith(`'${trigger}`)).toBe(true);
      },
    );

    it('covers the classic =, +, - and @ triggers', () => {
      expect(neutralizeCsvFormula('=1+1')).toBe("'=1+1");
      expect(neutralizeCsvFormula('+1')).toBe("'+1");
      expect(neutralizeCsvFormula('-1')).toBe("'-1");
      expect(neutralizeCsvFormula('@SUM(A1)')).toBe("'@SUM(A1)");
    });

    it('does not alter numeric values even when negative', () => {
      expect(escapeCsvValue(-1500)).toBe('-1500');
      expect(escapeCsvValue(-0.5)).toBe('-0.5');
    });

    it('does not alter booleans or dates', () => {
      expect(escapeCsvValue(true)).toBe('true');
      expect(escapeCsvValue(new Date('2026-01-01T00:00:00.000Z'))).toBe(
        '2026-01-01T00:00:00.000Z',
      );
    });

    it('leaves an empty string unchanged', () => {
      expect(neutralizeCsvFormula('')).toBe('');
    });
  });

  describe('document structure', () => {
    it('emits a header row followed by data rows', () => {
      const csv = serializeCsv(['a', 'b'], [{ a: '1', b: '2' }]);
      expect(csv).toBe('a,b\r\n1,2\r\n');
    });

    it('emits only the header row for zero rows', () => {
      expect(serializeCsv(['a', 'b'], [])).toBe('a,b\r\n');
    });

    it('keeps the server-defined column order', () => {
      const csv = serializeCsv(['z', 'a', 'm'], [{ a: '2', z: '1', m: '3' }]);
      expect(csv).toBe('z,a,m\r\n1,2,3\r\n');
    });

    it('renders missing keys as empty fields', () => {
      const csv = serializeCsv(['a', 'b'], [{ a: '1' } as any]);
      expect(csv).toBe('a,b\r\n1,\r\n');
    });

    it('terminates the document with CRLF', () => {
      const csv = serializeCsv(['a'], [{ a: 'x' }]);
      expect(csv.endsWith('\r\n')).toBe(true);
    });
  });
});
