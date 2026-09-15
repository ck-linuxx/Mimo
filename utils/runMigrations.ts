import type { SQLiteDatabase } from 'expo-sqlite';

interface MigrationJournalEntry {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface MigrationData {
  journal: { entries: MigrationJournalEntry[] };
  migrations: Record<string, string>;
}

/**
 * Executa migrations usando expo.execSync em vez do session.run() do Drizzle.
 *
 * Por quê isso existe:
 * O Drizzle's ExpoSQLitePreparedQuery.run() chama prepareSync() sem finalizar o
 * statement depois. Quando o SQLite recebe SQL vazio ou só com comentários,
 * retorna SQLITE_OK mas com sqlite3_stmt* = NULL. O expo-sqlite nova arquitetura
 * não verifica esse caso e chama clear_bindings(NULL) → SIGSEGV.
 *
 * expo.execSync() usa sqlite3_exec() internamente, que não cria prepared
 * statements e trata SQL vazio/comentário de forma segura.
 */
export function runMigrationsSync(expo: SQLiteDatabase, data: MigrationData): void {
  // Garante que a tabela de controle de migrations existe
  expo.execSync(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text    NOT NULL,
      created_at numeric
    )
  `);

  // Lê a última migration aplicada
  const last = expo.getFirstSync<{ created_at: number }>(
    `SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1`
  );
  const lastWhen: number = last?.created_at ?? 0;

  // Aplica migrations pendentes dentro de uma transação
  expo.withTransactionSync(() => {
    for (const entry of data.journal.entries) {
      // Já aplicada? Pula.
      if (entry.when <= lastWhen) continue;

      const key = `m${String(entry.idx).padStart(4, '0')}`;
      const rawSql = (data.migrations as Record<string, string>)[key];
      if (!rawSql) throw new Error(`Migration não encontrada: ${entry.tag}`);

      // Divide pelos breakpoints e filtra pedaços vazios ou só com comentários.
      // IMPORTANTE: SQL de comentário faz sqlite3_prepare_v2 retornar SQLITE_OK
      // com stmt* = NULL, causando crash no expo-sqlite nova arquitetura.
      const statements = rawSql
        .split('-->statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => {
          if (!s) return false;
          // Remove linhas de comentário (-- ...) e verifica se sobra algo
          const withoutComments = s
            .split('\n')
            .filter((line) => !line.trimStart().startsWith('--'))
            .join('\n')
            .trim();
          return withoutComments.length > 0;
        });

      for (const stmt of statements) {
        expo.execSync(stmt);
      }

      // Registra a migration como aplicada
      // (valores controlados — seguro interpolar diretamente)
      expo.execSync(
        `INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('', ${entry.when})`
      );
    }
  });
}
