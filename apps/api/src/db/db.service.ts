import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;

  async onModuleInit(): Promise<void> {
    this.pool = new Pool({
      host: process.env.PGHOST ?? 'localhost',
      port: Number(process.env.PGPORT ?? 5432),
      user: process.env.PGUSER ?? 'app',
      password: process.env.PGPASSWORD ?? 'app',
      database: process.env.PGDATABASE ?? 'goodsforecast',
      max: 10,
    });
    // wait until ready
    for (let i = 0; i < 30; i++) {
      try {
        await this.pool.query('SELECT 1');
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async query<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    const r = await this.pool.query<T>(sql, params as never[]);
    return r.rows;
  }
}
