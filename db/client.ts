import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../drizzle/migrations.js';

export const expo = SQLite.openDatabaseSync('db.db');

// Roda as migrations para garantir que o schema está atualizado
try {
  migrate(drizzle(expo), migrations);
  console.log('Migrations aplicadas com sucesso!');
} catch (e) {
  console.error('Erro ao aplicar migrations:', e);
}


// Pre-migration fix: o RENAME COLUMN original deixou o banco com `finish_at` mas sem
// `deadline` e sem `start_at`. A migração 0010 tenta `ADD finish_at`, que falha, parando
// toda a cadeia. Aqui renomeamos de volta para `deadline` para que 0010 rode normalmente
// e as migrações seguintes (0011, 0012) possam completar.
try {
  let cols = expo.getAllSync<{ name: string }>(`PRAGMA table_info(financial_goals)`);
  let has = (n: string) => cols.some((c) => c.name === n);

  if (has('finish_at') && !has('deadline') && !has('start_at')) {
    expo.execSync(`ALTER TABLE financial_goals RENAME COLUMN finish_at TO deadline`);
    cols = expo.getAllSync<{ name: string }>(`PRAGMA table_info(financial_goals)`);
    has = (n: string) => cols.some((c) => c.name === n);
  }

  // migration 0011 pode não ter rodado ainda; garante a coluna para não bloquear o INSERT
  if (has('finish_at') && !has('start_at')) {
    expo.execSync(`ALTER TABLE financial_goals ADD COLUMN start_at INTEGER`);
  }
} catch (_) {
  // tabela ainda não existe (instalação nova) — sem ação necessária
}

export const db = drizzle(expo);
