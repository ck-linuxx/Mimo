# services/pluggy/ — Integração Open Finance (Pluggy)

Módulo de serviços da integração 100% local com a **Pluggy** (Opção B — credenciais no `expo-secure-store`, sem backend).

## Principais Arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `routes.ts` | Rotas da API da Pluggy centralizadas já com a URL base (`PLUGGY_ROUTES`) |
| `types.ts` | Tipos DTO da API Pluggy (`PluggyItemDto`, `PluggyAccountDto`, `PluggyTransactionDto`, `PluggyPaginatedResponse`) e estado de sync |
| `credentials.ts` | Armazenamento seguro de `clientId`, `clientSecret` e `itemIds` manuais via `expo-secure-store` |
| `auth.ts` | Autenticação `POST /auth` com cache em memória do `apiKey` (expiração de 110 min) |
| `api.ts` | Cliente HTTP com paginação por cursor em `GET /v2/transactions` (`next` repassado intacto até `null`) e retry automático em 401 |
| `connections.ts` | Descoberta e atualização de `bank_connections` e `bank_accounts`, vínculo com contas/cartões locais e limpeza de dados |
| `utils/pluggy/mappersPluggy.ts` | Normalização DTO → staging (`pluggy_transactions`), detecção de pagamento de fatura, sugestão de categoria e conversão para `NewTransaction` |
| `utils/pluggy/matchingPluggy.ts` | Busca de transações manuais candidatas a vínculo (janela de ±3 dias, tolerância de R$ 0,02, score por data e similaridade textual) |
| `notifications.ts` | Notificação local agregada (`expo-notifications`) ao chegarem novas transações pendentes na caixa de entrada |
| `syncService.ts` | Orquestração da sincronização (cursor inicial com janela de 30/60/90 dias, sync incremental `createdAtFrom`, re-checagem de 7 dias `dateFrom`, throttle de 15 min) |
| `reviewService.ts` | Ações da caixa de entrada: importar como nova, editar e importar, vincular a existente, ignorar, desfazer (`undo`) e ações em massa |
| `backgroundTask.ts` | Task em segundo plano via `expo-background-task` / `expo-task-manager` (`PLUGGY_BACKGROUND_SYNC_TASK`) |

## Decisões de Arquitetura

- **Segurança:** `CLIENT_ID` e `CLIENT_SECRET` nunca são salvos no SQLite nem em backups — ficam exclusivamente no `expo-secure-store`.
- **Rotas centralizadas:** Todas as URLs da API Pluggy devem vir de `PLUGGY_ROUTES` (`services/pluggy/routes.ts`), já contendo a URL base.
- **Uso correto do QueryClient:** As chamadas imperativas para a API Pluggy usam `queryClient.query({ queryKey, queryFn })` (substituindo o antigo `fetchQuery` que foi depreciado).
- **Constantes de auxílio:** Chaves de cache do React Query ficam na pasta global `constants/` sob o padrão `[funcao][servico/uso]` (`constants/queryKeysPluggy.ts`).
- **Fluxo em dois estágios (Staging Inbox):** Nenhuma transação da Pluggy entra diretamente na tabela `transactions`. Tudo passa por `pluggy_transactions` com `reviewStatus = 'pending'` até aprovação do usuário.
- **Desconexão:** `clearCredentials()` apaga apenas o `SecureStore` e interrompe novas sincronizações, preservando `pluggy_transactions` e `transactions` até ação explícita do usuário (`clearIntegrationData`).

