import { useState, useEffect, useCallback } from 'react';
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq, and } from 'drizzle-orm';
import { attachments } from 'db/schema';
import type { Attachment, NewAttachment } from 'types/attachment';

const MAX_ATTACHMENTS = 5;

const expo = SQLite.openDatabaseSync('db.db');
const db = drizzle(expo);

export function useAttachments(transactionId?: string) {
  const [data, setData] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (!transactionId) {
      setData([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = db
        .select()
        .from(attachments)
        .where(eq(attachments.transactionId, transactionId))
        .all();
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar anexos');
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createAttachment = (newAttachment: NewAttachment): string | null => {
    try {
      const existing = db
        .select()
        .from(attachments)
        .where(eq(attachments.transactionId, newAttachment.transactionId))
        .all();

      if (existing.length >= MAX_ATTACHMENTS) {
        return `Máximo de ${MAX_ATTACHMENTS} anexos por transação atingido`;
      }

      db.insert(attachments).values(newAttachment).run();
      fetch();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Erro ao criar anexo';
    }
  };

  const createReceipt = (newAttachment: NewAttachment): string | null => {
    try {
      const existing = db
        .select()
        .from(attachments)
        .where(
          and(
            eq(attachments.transactionId, newAttachment.transactionId),
            eq(attachments.isReceipt, true),
          ),
        )
        .all();

      if (existing.length > 0) {
        return 'Já existe um comprovante para esta transação';
      }

      db.insert(attachments)
        .values({ ...newAttachment, isReceipt: true })
        .run();
      fetch();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Erro ao criar comprovante';
    }
  };

  const deleteAttachment = (id: string): string | null => {
    try {
      db.delete(attachments).where(eq(attachments.id, id)).run();
      fetch();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Erro ao excluir anexo';
    }
  };

  const getReceipt = (txId: string): Attachment | null => {
    try {
      const rows = db
        .select()
        .from(attachments)
        .where(
          and(eq(attachments.transactionId, txId), eq(attachments.isReceipt, true)),
        )
        .all();
      return rows[0] ?? null;
    } catch {
      return null;
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetch,
    createAttachment,
    createReceipt,
    deleteAttachment,
    getReceipt,
  };
}
