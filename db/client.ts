import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { ExpoSQLitePreparedQuery } from 'drizzle-orm/expo-sqlite/session';

// ─── Patch: finaliza prepared statements após cada operação do Drizzle ───────
//
// O ExpoSQLitePreparedQuery do Drizzle (drizzle-orm ^0.45) não finaliza os
// prepared statements após executá-los. No expo-sqlite SDK 57 (nova arquitetura),
// isso causa SIGSEGV em exsqlite3_clear_bindings() quando o nativeStatement é
// liberado pelo GC ou reutilizado sem o stmt* ainda ser válido.
//
// O próprio expo-sqlite (runSync, getFirstSync, etc.) sempre chama finalizeSync()
// em um bloco finally. Este patch faz o mesmo para os métodos do Drizzle.
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const proto = ExpoSQLitePreparedQuery.prototype as any;

(['run', 'all', 'get', 'values'] as const).forEach((method) => {
  const original = proto[method];
  proto[method] = function (this: ExpoSQLitePreparedQuery<unknown>, pv?: unknown) {
    try {
      return original.call(this, pv);
    } finally {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any).stmt?.finalizeSync?.();
      } catch (_) {
        // já finalizado — ignorar
      }
    }
  };
});

// ─────────────────────────────────────────────────────────────────────────────

export const expo = SQLite.openDatabaseSync('db.db');

// Migrations e pre-migration fixes são executados em app/_layout.tsx
// via runMigrationsSync (utils/runMigrations.ts) usando expo.execSync,
// que não usa prepareSync/executeSync e evita o crash de null stmt.
export const db = drizzle(expo);
