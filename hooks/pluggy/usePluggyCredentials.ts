import { useCallback, useEffect, useState } from 'react';
import {
  clearCredentials,
  clearManualItemIds,
  getCredentials,
  getManualItemIds,
  saveCredentials,
  saveManualItemIds,
} from 'services/pluggy/credentials';
import { authenticate, clearApiKeyCache } from 'services/pluggy/auth';

interface UsePluggyCredentialsResult {
  loading: boolean;
  configured: boolean;
  clientId: string;
  clientSecret: string;
  itemIdsText: string;
  setClientId: (v: string) => void;
  setClientSecret: (v: string) => void;
  setItemIdsText: (v: string) => void;
  /** Valida (POST /auth) e, se OK, salva. Lança PluggyError em caso de falha. */
  saveAndTest: () => Promise<void>;
  /** Apaga SOMENTE as credenciais (e Item IDs manuais). Dados importados permanecem. */
  disconnect: () => Promise<void>;
}

function parseItemIds(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function usePluggyCredentials(): UsePluggyCredentialsResult {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [itemIdsText, setItemIdsText] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [credentials, itemIds] = await Promise.all([getCredentials(), getManualItemIds()]);
      if (cancelled) return;
      if (credentials) {
        setClientId(credentials.clientId);
        setClientSecret(credentials.clientSecret);
        setConfigured(true);
      }
      setItemIdsText(itemIds.join('\n'));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveAndTest = useCallback(async () => {
    const credentials = { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
    // Só persiste se a Pluggy aceitar as credenciais.
    await authenticate(credentials);
    await saveCredentials(credentials);
    await saveManualItemIds(parseItemIds(itemIdsText));
    setConfigured(true);
  }, [clientId, clientSecret, itemIdsText]);

  const disconnect = useCallback(async () => {
    await Promise.all([clearCredentials(), clearManualItemIds()]);
    clearApiKeyCache();
    setClientId('');
    setClientSecret('');
    setItemIdsText('');
    setConfigured(false);
  }, []);

  return {
    loading,
    configured,
    clientId,
    clientSecret,
    itemIdsText,
    setClientId,
    setClientSecret,
    setItemIdsText,
    saveAndTest,
    disconnect,
  };
}

