import { backupDatabaseSync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

const PRE_MIGRATION_BACKUP_NAME = 'db.pre-migration.db';

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

  const pending = data.journal.entries.filter((entry) => entry.when > lastWhen);
  if (pending.length === 0) return;

  // Backup de segurança antes de aplicar migrations em um banco que já tem dados.
  // Mantém apenas o estado imediatamente anterior à última atualização
  // (arquivo `db.pre-migration.db`). Falha no backup nunca bloqueia o app.
  if (lastWhen > 0) {
    try {
      const backupDb = openDatabaseSync(PRE_MIGRATION_BACKUP_NAME);
      try {
        backupDatabaseSync({ sourceDatabase: expo, destDatabase: backupDb });
      } finally {
        backupDb.closeSync();
      }
    } catch (e) {
      console.warn('[migrations] Backup pré-migration falhou:', e);
    }
  }

  // Aplica migrations pendentes dentro de uma transação (tudo ou nada:
  // se qualquer migration falhar, o banco volta ao estado anterior sem perder dados).
  expo.withTransactionSync(() => {
    for (const entry of pending) {
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
        try {
          expo.execSync(stmt);
        } catch (e) {
          // Idempotência: coluna já existe (ex.: banco com schema parcialmente aplicado).
          // Só ignora ADD COLUMN duplicado; qualquer outro erro aborta e faz rollback.
          const isAddColumn = /^\s*ALTER\s+TABLE\s+\S+\s+ADD(\s+COLUMN)?\s/i.test(stmt);
          const isDuplicate = e instanceof Error && /duplicate column name/i.test(e.message);
          if (isAddColumn && isDuplicate) continue;
          throw new Error(
            `Migration ${entry.tag} falhou: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }

      // Registra a migration como aplicada
      // (valores controlados — seguro interpolar diretamente)
      expo.execSync(
        `INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('', ${entry.when})`
      );
    }
  });
}
