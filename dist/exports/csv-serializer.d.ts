export declare const CSV_FORMULA_TRIGGERS: string[];
export declare function neutralizeCsvFormula(value: string): string;
export declare function escapeCsvValue(value: unknown): string;
export declare function serializeCsv(columns: readonly string[], rows: readonly Record<string, unknown>[]): string;
