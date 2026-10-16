export type SqlValue = string | number | null;
export type QueryResult<T = Record<string, unknown>> = {
  results: T[];
  meta: { changes: number };
};
export interface MapStatement {
  bind(...values: SqlValue[]): MapStatement;
  all<T = Record<string, unknown>>(): Promise<QueryResult<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<QueryResult>;
}
export interface MapDatabase {
  prepare(sql: string): MapStatement;
  batch(statements: MapStatement[]): Promise<QueryResult[]>;
}
