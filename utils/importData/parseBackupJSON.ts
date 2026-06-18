import type { BackupJSON } from 'utils/exportData/types';

export function parseBackupJSON(content: string): BackupJSON {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Arquivo inválido: não é um JSON válido.');
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.app !== 'mimoV2') {
    throw new Error('Arquivo não reconhecido: este JSON não é um backup do mimoV2.');
  }

  if (obj.version !== '1.0') {
    throw new Error('Versão de backup não suportada. Este app suporta apenas backups v1.0.');
  }

  return parsed as BackupJSON;
}
