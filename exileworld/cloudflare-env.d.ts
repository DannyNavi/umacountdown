interface ExileD1Statement {
  bind(...values: unknown[]): ExileD1Statement;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes?: number } }>;
}

interface ExileD1Database {
  prepare(query: string): ExileD1Statement;
}

declare module "cloudflare:workers" {
  export const env: {
    DB: ExileD1Database;
  };
}
