import { Pool, type PoolConfig, type QueryResultRow } from 'pg';

export type QueryParamValue =
  | string
  | number
  | boolean
  | Date
  | null
  | string[]
  | number[]
  | boolean[];

export interface QueryParamMap {
  [key: string]: QueryParamValue;
}

type GlobalWithPool = typeof globalThis & {
  __cloudbaseLandingPgPool?: Pool;
};

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `CloudBase PostgreSQL is not configured: missing environment variable ${name}.`,
    );
  }
  return value;
}

function parseSslValue(value: string | undefined): boolean | 'require' {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'require') return 'require';
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function buildPoolConfig(): PoolConfig {
  const connectionString =
    process.env.CLOUDBASE_POSTGRES_URL?.trim() ||
    process.env.CLOUDBASE_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim();

  const sslMode = parseSslValue(process.env.CLOUDBASE_PG_SSL ?? process.env.DATABASE_SSL);
  const ssl = sslMode ? { rejectUnauthorized: false } : undefined;

  if (connectionString) {
    return {
      connectionString,
      ssl,
      max: Number(process.env.CLOUDBASE_PG_POOL_MAX ?? 10),
      idleTimeoutMillis: Number(process.env.CLOUDBASE_PG_IDLE_TIMEOUT_MS ?? 10000),
    };
  }

  return {
    host: readRequiredEnv('CLOUDBASE_PG_HOST'),
    port: Number(process.env.CLOUDBASE_PG_PORT ?? 5432),
    database: readRequiredEnv('CLOUDBASE_PG_DATABASE'),
    user: readRequiredEnv('CLOUDBASE_PG_USER'),
    password: readRequiredEnv('CLOUDBASE_PG_PASSWORD'),
    ssl,
    max: Number(process.env.CLOUDBASE_PG_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.CLOUDBASE_PG_IDLE_TIMEOUT_MS ?? 10000),
  };
}

function getPool(): Pool {
  const globalScope = globalThis as GlobalWithPool;
  if (!globalScope.__cloudbaseLandingPgPool) {
    globalScope.__cloudbaseLandingPgPool = new Pool(buildPoolConfig());
  }
  return globalScope.__cloudbaseLandingPgPool;
}

function compileNamedParams(sql: string, params: QueryParamMap): { text: string; values: QueryParamValue[] } {
  const values: QueryParamValue[] = [];
  const indexByKey = new Map<string, number>();

  const text = sql.replace(/(^|[^:]):([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, prefix: string, key: string) => {
    if (!(key in params)) {
      throw new Error(`Missing SQL parameter :${key}`);
    }

    if (!indexByKey.has(key)) {
      values.push(params[key]);
      indexByKey.set(key, values.length);
    }

    return `${prefix}$${indexByKey.get(key)}`;
  });

  return { text, values };
}

export async function queryRows<T extends QueryResultRow>(
  sql: string,
  params: QueryParamMap = {},
): Promise<T[]> {
  const { text, values } = compileNamedParams(sql, params);
  const result = await getPool().query<T>(text, values);
  return result.rows;
}

export async function queryFirst<T extends QueryResultRow>(
  sql: string,
  params: QueryParamMap = {},
): Promise<T | null> {
  const rows = await queryRows<T>(sql, params);
  return rows[0] ?? null;
}

export async function executeQuery(
  sql: string,
  params: QueryParamMap = {},
): Promise<number> {
  const { text, values } = compileNamedParams(sql, params);
  const result = await getPool().query(text, values);
  return result.rowCount ?? 0;
}
