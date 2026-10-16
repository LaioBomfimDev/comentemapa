import type { MapDatabase, MapStatement, QueryResult, SqlValue } from './database-contract';

type Credentials = { accountId: string; databaseId: string; token: string };
type Query = { sql: string; params: SqlValue[] };
type ApiResult = { success?: boolean; results?: Record<string, unknown>[]; meta?: { changes?: number } };

// Server only: use D1's official HTTP API when no Worker binding is available.
// A batch is sent as one request, preserving D1's transaction boundary.
export function createD1HttpDatabase(credentials: Credentials, transport: typeof fetch = fetch): MapDatabase {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(credentials.accountId)}/d1/database/${encodeURIComponent(credentials.databaseId)}/query`;
  async function execute(input: Query | { batch: Query[] }): Promise<QueryResult[]> {
    const response = await transport(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${credentials.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error('Não foi possível consultar o banco D1.');
    const payload = await response.json() as { success?: boolean; result?: ApiResult[] };
    const expected = 'batch' in input ? input.batch.length : 1;
    if (payload.success !== true || !Array.isArray(payload.result) || payload.result.length !== expected || payload.result.some(r => r.success !== true)) {
      throw new Error('O banco D1 não concluiu a operação.');
    }
    return payload.result.map(r => ({ results: r.results || [], meta: { changes: Number(r.meta?.changes || 0) } }));
  }
  class Statement implements MapStatement {
    constructor(readonly sql: string, readonly params: SqlValue[] = []) {}
    bind(...values: SqlValue[]) { return new Statement(this.sql, values); }
    async all<T = Record<string, unknown>>() { return (await execute(this))[0] as QueryResult<T>; }
    async first<T = Record<string, unknown>>() { return (await this.all<T>()).results[0] || null; }
    async run() { return (await execute(this))[0]; }
  }
  return {
    prepare: sql => new Statement(sql),
    batch: statements => {
      if (!statements.length) return Promise.resolve([]);
      if (statements.some(s => !(s instanceof Statement))) throw new Error('Lote de banco inválido.');
      return execute({ batch: statements.map(s => ({ sql: (s as Statement).sql, params: (s as Statement).params })) });
    },
  };
}
