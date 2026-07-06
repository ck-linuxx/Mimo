# Google Drive Sync — Specification

## Problem Statement

O usuário do mimoV2 tem dados financeiros valiosos armazenados apenas localmente no dispositivo — incluindo imagens de comprovantes. Se o app for desinstalado, o dispositivo quebrar ou o usuário trocar de celular, todos os dados são perdidos. A sincronização automática com o Google Drive resolve o backup contínuo e a migração entre dispositivos sem depender de infraestrutura própria.

## Goals

- [ ] Usuário pode conectar sua conta Google nas Configurações para habilitar backup automático no Drive.
- [ ] Backup é o arquivo `.db` do SQLite — completo, incluindo todas as tabelas e imagens de comprovantes.
- [ ] Backup é criado automaticamente ao entrar e sair do app (máximo 5 backups, fila FIFO — o mais antigo é removido).
- [ ] Na primeira conexão, se já existir backup no Drive, o usuário é oferecido restauração com 1 confirmação.
- [ ] O login Google é opcional — o app funciona normalmente sem ele.

## Out of Scope

| Feature | Motivo |
|---------|--------|
| Sync em tempo real (por transação) | Muito custoso em quota de API; backup por sessão é suficiente |
| Múltiplas contas Google | Complexidade desnecessária para v1 |
| iCloud / Dropbox | Fora do escopo Android-first |
| Apagar backups do Drive ao desconectar | Usuário decidiu: manter arquivos; app apenas para de sincronizar |
| Merge/resolução de conflito entre dados locais e Drive | Drive é fonte de verdade somente em restauração explícita |
| Export/import em formato JSON para Drive | Substituído pelo `.db` direto — mais completo e inclui imagens |

---

## User Stories

### P1: Conectar conta Google ⭐ MVP

**User Story**: Como usuário, quero conectar minha conta Google nas Configurações para habilitar o backup automático no Drive.

**Why P1**: Sem autenticação não há sync — é o pré-requisito de tudo.

**Acceptance Criteria**:

1. WHEN o usuário abre Configurações THEN o sistema SHALL exibir uma seção "Google Drive" com o item "Conectar conta Google" quando não há conta conectada.
2. WHEN o usuário toca em "Conectar conta Google" THEN o sistema SHALL iniciar o fluxo OAuth do Google solicitando as scopes `email`, `profile` e `https://www.googleapis.com/auth/drive.file`.
3. WHEN a autenticação é bem-sucedida THEN o sistema SHALL persistir `accessToken`, `refreshToken`, `expiresAt`, `email` e `displayName` no `expo-secure-store` (nunca em SQLite — são credenciais).
4. WHEN o usuário está conectado THEN o sistema SHALL exibir o email/nome da conta e um botão "Desconectar" na seção Google Drive.
5. WHEN a autenticação falha ou é cancelada pelo usuário THEN o sistema SHALL exibir mensagem de erro via `showError` e não alterar o estado atual.

**Independent Test**: Configurações → "Conectar Google" → completar OAuth → ver email da conta exibido na seção.

---

### P1: Verificação e oferta de restauração no primeiro login ⭐ MVP

**User Story**: Como usuário, quero que o app verifique automaticamente se existe um backup no Drive ao conectar minha conta, para poder recuperar meus dados (incluindo imagens) em caso de reinstalação.

**Why P1**: Sem isso, a promessa de recuperação pós-reinstalação não funciona.

**Acceptance Criteria**:

1. WHEN a autenticação Google é concluída com sucesso pela primeira vez THEN o sistema SHALL buscar arquivos `.db` na pasta `mimo` do Drive do usuário.
2. WHEN nenhum backup é encontrado THEN o sistema SHALL criar a pasta `mimo` (se não existir) e fazer upload imediato do arquivo `db.db` local com o nome `mimo-backup-YYYY-MM-DD-HHmmss.db`.
3. WHEN um ou mais backups são encontrados THEN o sistema SHALL exibir um dialog de confirmação: "Backup encontrado de [data do mais recente]. Deseja restaurar seus dados?" com opções "Restaurar" e "Manter dados locais".
4. WHEN o usuário confirma "Restaurar" THEN o sistema SHALL baixar o arquivo `.db` mais recente para um path temporário, fechar todas as conexões SQLite, substituir o `db.db` local pelo arquivo baixado e reinicializar as conexões.
5. WHEN o usuário escolhe "Manter dados locais" THEN o sistema SHALL fechar o dialog sem alterar dados locais; o ciclo de backup automático começa normalmente.
6. WHEN a restauração falha (conexão, arquivo corrompido, incompatibilidade de schema) THEN o sistema SHALL exibir erro via `showError`, descartar o arquivo temporário e manter o `db.db` original intacto.

**Independent Test**: Desinstalar app → reinstalar → conectar a mesma conta Google → ver dialog de restauração com data do backup anterior → confirmar → ver dados anteriores restaurados incluindo imagens.

---

### P1: Backup automático ao entrar/sair do app ⭐ MVP

**User Story**: Como usuário conectado ao Google, quero que meu banco de dados completo seja automaticamente salvo no Drive ao abrir e fechar o app.

**Why P1**: Core da feature — sem o ciclo automático a sincronização não tem valor.

**Acceptance Criteria**:

1. WHEN o usuário está conectado ao Google E o app vai para background (`AppState: active → background`) THEN o sistema SHALL fazer upload do arquivo `db.db` atual para a pasta `mimo` no Drive.
2. WHEN o usuário está conectado ao Google E o app volta para foreground (`AppState: background → active`) THEN o sistema SHALL fazer upload do arquivo `db.db` atual para a pasta `mimo` no Drive.
3. WHEN um backup é criado THEN o arquivo SHALL ser nomeado `mimo-backup-YYYY-MM-DD-HHmmss.db` e o MIME type SHALL ser `application/octet-stream`.
4. WHEN o total de arquivos `.db` na pasta `mimo` ultrapassa 5 THEN o sistema SHALL deletar o arquivo com `createdTime` mais antigo antes de fazer o upload do novo.
5. WHEN eventos de `AppState` disparam em sequência rápida THEN o sistema SHALL ignorar eventos com menos de 30 segundos desde o último upload concluído (debounce).
6. WHEN o `accessToken` está expirado no momento do upload THEN o sistema SHALL usar o `refreshToken` para obter um novo token automaticamente antes de tentar o upload.
7. WHEN o upload falha por perda de conexão ou erro da API THEN o sistema SHALL falhar silenciosamente sem notificar o usuário (backup é best-effort).

**Independent Test**: Conectar Google → abrir/fechar o app 7 vezes → verificar no Google Drive que existem exatamente 5 arquivos `.db` na pasta `mimo`, sendo o mais antigo da 2ª abertura.

---

### P1: Desconectar conta Google ⭐ MVP

**User Story**: Como usuário, quero poder desconectar minha conta Google para parar o backup automático sem perder os arquivos já salvos.

**Why P1**: O usuário precisa ter controle total sobre a conexão.

**Acceptance Criteria**:

1. WHEN o usuário toca em "Desconectar" THEN o sistema SHALL exibir um `showConfirm`: "Deseja desconectar? Os backups existentes no Drive serão mantidos, mas o sync automático será interrompido."
2. WHEN o usuário confirma THEN o sistema SHALL remover todos os tokens do `expo-secure-store` e atualizar a UI para o estado desconectado.
3. WHEN o usuário está desconectado THEN o sistema NÃO SHALL criar novos backups ao entrar/sair do app.
4. WHEN o usuário desconecta THEN os arquivos existentes na pasta `mimo` do Drive SHALL ser preservados (não deletados pelo app).

**Independent Test**: Conectar → desconectar → confirmar → ver UI voltar para "Conectar conta Google"; acessar Drive manualmente e confirmar arquivos `.db` ainda presentes.

---

### P2: Indicador de status do último backup

**User Story**: Como usuário conectado, quero ver quando foi o último backup realizado, para ter confiança de que meus dados estão seguros.

**Why P2**: Confiança sem ser MVP — o sync funciona sem feedback visual explícito.

**Acceptance Criteria**:

1. WHEN o usuário está conectado THEN a seção Google Drive SHALL exibir "Último backup: [data e hora]" abaixo do email da conta.
2. WHEN um backup é criado com sucesso THEN o timestamp SHALL ser atualizado em tempo real na UI.
3. WHEN o app é aberto e ainda não houve backup nesta sessão THEN SHALL exibir o timestamp do upload anterior (persistido no `expo-secure-store`) ou "Sincronizando..." enquanto o primeiro upload ocorre.

**Independent Test**: Conectar → esperar backup automático → ver timestamp atualizado na seção Google Drive.

---

### P3: Restaurar backup manualmente

**User Story**: Como usuário conectado, quero poder restaurar um backup do Drive a qualquer momento (não apenas no primeiro login), para casos de corrupção ou rollback intencional.

**Why P3**: Caso de uso raro — a restauração automática no primeiro login cobre o cenário principal.

**Acceptance Criteria**:

1. WHEN o usuário está conectado THEN a seção Google Drive SHALL exibir um item "Restaurar backup do Drive".
2. WHEN o usuário toca em "Restaurar" THEN o sistema SHALL listar os backups disponíveis com data/hora e tamanho de cada arquivo `.db`.
3. WHEN o usuário seleciona um backup THEN o sistema SHALL exibir confirmação: "Isso substituirá TODOS os dados locais, incluindo imagens. Continuar?"
4. WHEN o usuário confirma THEN o sistema SHALL baixar o `.db` selecionado, substituir o banco local e reinicializar as conexões, exibindo feedback de conclusão.

---

## Edge Cases

- WHEN o dispositivo não tem internet ao tentar sincronizar THEN o sistema SHALL falhar silenciosamente e tentar novamente no próximo evento de AppState.
- WHEN o `refreshToken` foi revogado pelo usuário na conta Google THEN o sistema SHALL detectar o erro 401 e exibir um banner nas Configurações pedindo reconexão.
- WHEN a pasta `mimo` não existe no Drive do usuário THEN o sistema SHALL criá-la antes do primeiro upload.
- WHEN o banco de dados local está recém-criado (sem dados) THEN o sistema SHALL fazer upload normalmente — um `.db` vazio/inicial é um backup válido.
- WHEN o usuário está restaurando e perde conexão THEN o sistema SHALL exibir erro, descartar o arquivo temporário e manter o `db.db` original intacto.
- WHEN o arquivo `.db` baixado está corrompido ou é incompatível com o schema atual THEN o sistema SHALL detectar a falha ao tentar abrir o banco e reverter para o arquivo original.
- WHEN o app vai para background durante um upload em andamento THEN o sistema SHALL aguardar o upload concluir ou cancelar se ultrapassar o tempo limite do sistema operacional.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---------------|-------|-------|--------|
| GDS-01 | P1: Conectar conta Google (UI da seção) | Design | Pending |
| GDS-02 | P1: Conectar conta Google (OAuth flow + scopes) | Design | Pending |
| GDS-03 | P1: Conectar conta Google (persistência de tokens no secure-store) | Design | Pending |
| GDS-04 | P1: Conectar conta Google (UI estado conectado) | Design | Pending |
| GDS-05 | P1: Verificação no primeiro login (busca arquivos .db na pasta mimo) | Design | Pending |
| GDS-06 | P1: Verificação (sem backup → upload imediato do db.db) | Design | Pending |
| GDS-07 | P1: Verificação (com backup → dialog de restauração) | Design | Pending |
| GDS-08 | P1: Verificação (restauração: fechar conexões → substituir db.db → reinicializar) | Design | Pending |
| GDS-09 | P1: Backup automático (AppState background → upload) | Design | Pending |
| GDS-10 | P1: Backup automático (AppState foreground → upload) | Design | Pending |
| GDS-11 | P1: Backup automático (nomear arquivo .db + MIME type) | Design | Pending |
| GDS-12 | P1: Backup automático (rotação FIFO max 5) | Design | Pending |
| GDS-13 | P1: Backup automático (debounce 30s) | Design | Pending |
| GDS-14 | P1: Backup automático (token refresh automático) | Design | Pending |
| GDS-15 | P1: Backup automático (falha silenciosa) | Design | Pending |
| GDS-16 | P1: Desconectar (confirm dialog) | Design | Pending |
| GDS-17 | P1: Desconectar (limpar tokens do secure-store) | Design | Pending |
| GDS-18 | P1: Desconectar (parar sync) | Design | Pending |
| GDS-19 | P2: Status do último backup (timestamp na UI) | - | Pending |
| GDS-20 | P3: Restaurar backup manualmente | - | Pending |

**Coverage:** 20 total, 0 mapped to tasks, 20 unmapped ⚠️

---

## Context Decisions

| Decisão | Escolha | Alternativa descartada |
|---------|---------|----------------------|
| Formato do backup | Arquivo `.db` SQLite completo (inclui imagens) | JSON estruturado — não inclui base64 dos anexos |
| Backup existe no 1º login | Oferecer restaurar (dialog) | Ignorar silenciosamente |
| Tokens OAuth | `expo-secure-store` | SQLite settings (inseguro para credenciais) |
| Ao desconectar | Manter arquivos no Drive | Perguntar e apagar |
| Login obrigatório | Não — feature opcional nas Configurações | Obrigatório (onboarding) |
| Scope Drive | `drive.file` (só arquivos criados pelo app) | `drive` (acesso total — desnecessário) |
| Restore | Substituir `db.db` + reinicializar conexões | Re-importar via `import-from-backup` (não suporta binários) |

---

## Success Criteria

- [ ] Usuário conecta/desconecta conta Google em ≤ 3 taps nas Configurações.
- [ ] Após reinstalação do app + reconexão com a mesma conta, backup `.db` é identificado e restauração (com imagens) ocorre com 1 confirmação.
- [ ] Backups criados silenciosamente sem interromper o uso do app.
- [ ] Nunca mais de 5 arquivos `.db` na pasta `mimo` do Drive.
- [ ] Falhas de rede não geram popups ou erros visíveis ao usuário.
- [ ] Token expirado é renovado automaticamente sem intervenção do usuário.
