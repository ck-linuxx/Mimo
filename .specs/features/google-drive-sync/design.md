# Google Drive Sync — Design

**Spec**: `.specs/features/google-drive-sync/spec.md`
**Status**: Draft

---

## Architecture Overview

A feature é dividida em três camadas horizontais + uma camada de UI:

```
┌──────────────────────────────────────────────────────────┐
│  UI Layer                                                │
│  GoogleDriveSection (Settings) + DriveSyncProvider       │
└──────────────────┬───────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────┐
│  Hook Layer                                              │
│  useGoogleDriveSync — estado React + AppState listener   │
└──────────────────┬───────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────┐
│  Business Logic Layer                                    │
│  driveSync.ts — orquestra backup/restore + rotação       │
└────────┬─────────────────────────────┬───────────────────┘
         │                             │
┌────────▼──────────┐      ┌───────────▼───────────────────┐
│  googleAuth.ts    │      │  driveService.ts              │
│  OAuth + tokens   │      │  Drive REST API (fetch nativo) │
│  expo-secure-store│      │  FileSystem upload/download    │
└───────────────────┘      └───────────────────────────────┘
```

### Fluxo de backup automático

```
AppState change (active↔background)
        │
        ▼
useGoogleDriveSync (listener)
        │
        ├─ debounce: < 30s desde último upload? → ignorar
        │
        ├─ session válida? → refreshAccessToken se expirado
        │
        └─ driveSync.uploadBackup(accessToken)
                │
                ├─ getDbFilePath() → caminho do db.db
                ├─ ensureFolder(accessToken) → folderId
                ├─ lista arquivos na pasta
                ├─ se > 4 arquivos → deletar o mais antigo
                └─ upload em 2 passos: POST metadata → PATCH conteúdo
```

### Fluxo de restauração

```
Usuário confirma restauração
        │
        ▼
driveSync.restoreBackup(fileId, accessToken)
        │
        ├─ FileSystem.downloadAsync() → caminho temporário
        ├─ validar: SQLite.openDatabaseSync(tmp) → closeSync()
        ├─ expo.closeSync()  ← singleton de db/client.ts
        ├─ FileSystem.copyAsync(tmp → dbPath)
        └─ alert "App será fechado" → BackHandler.exitApp()
```

---

## Packages necessários (instalar)

| Package | Versão | Motivo |
|---------|--------|--------|
| `@react-native-google-signin/google-signin` | `^14.x` | OAuth Android nativo — refresh token automático e confiável |
| `expo-secure-store` | `^14.x` | Armazenamento seguro de tokens OAuth (nunca SQLite) |

`expo-file-system` já está instalado (v55). Não há necessidade de `expo-updates` — a restauração usa `BackHandler.exitApp()`.

### Configuração manual obrigatória (fora do código)

1. Google Cloud Console → criar projeto → habilitar **Google Drive API**
2. Credenciais → OAuth 2.0 Android → informar package `com.clark1104.mimov2` + SHA-1 do keystore de debug e release
3. Baixar `google-services.json` → colocar na raiz do projeto
4. Adicionar config plugin em `app.json`:
   ```json
   "@react-native-google-signin/google-signin"
   ```
5. OAuth scope necessário: `https://www.googleapis.com/auth/drive.file` (acesso apenas a arquivos criados pelo app)

---

## Code Reuse Analysis

### Componentes existentes aproveitados

| Componente | Localização | Uso |
|-----------|-------------|-----|
| `MenuItem` | `app/(tabs)/settings.tsx` | Reutilizar o componente local para ações (conectar, restaurar) |
| `ConfigCard` | `app/(tabs)/settings.tsx` | Reutilizar para o toggle visual do status de conexão |
| `useCustomAlert` | `hooks/useCustomAlert.ts` | `showConfirm`, `showError`, `showSuccess` para todos os dialogs |
| `expo` (singleton) | `db/client.ts` | `expo.closeSync()` na restauração |
| `FileSystem` | `expo-file-system` | `downloadAsync`, `uploadAsync`, `copyAsync`, `deleteAsync` |
| `AppState` | `react-native` | Já importado em `_layout.tsx` — padrão de listener já estabelecido |
| `SPRING_BOUNCE`, `SPRING_MODAL` | `app/(tabs)/settings.tsx` | Constantes de spring da tela de configurações |

### Ponto de integração crítico — AppState em _layout.tsx

O `_layout.tsx` já contém um listener de `AppState` em `BiometricGate`. O listener do Drive Sync **não** deve ser colocado dentro de `BiometricGate` (ele só monta quando o app está desbloqueado). O listener do Drive precisa rodar **mesmo com o app bloqueado** para garantir que o backup aconteça quando o app vai para background.

**Solução**: Adicionar `DriveSyncProvider` como wrapper em `RootLayout`, **fora** de `BiometricGate`, antes de `ThemeProvider`.

```tsx
// _layout.tsx — ordem atual
<GestureHandlerRootView>
  <SafeAreaProvider>
    <ThemeProvider>
      <BiometricGate>
        <AppNavigator />
      </BiometricGate>
    </ThemeProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>

// _layout.tsx — com Drive Sync
<GestureHandlerRootView>
  <SafeAreaProvider>
    <DriveSyncProvider>       ← novo, fora do BiometricGate
      <ThemeProvider>
        <BiometricGate>
          <AppNavigator />
        </BiometricGate>
      </ThemeProvider>
    </DriveSyncProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
```

---

## Componentes

### `services/googleAuth.ts`

- **Purpose**: Operações de OAuth — sign in, sign out, leitura/escrita de tokens no `expo-secure-store`, refresh de access token.
- **Location**: `services/googleAuth.ts`
- **Interfaces**:
  ```ts
  interface GoogleSession {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;       // ms timestamp
    email: string;
    displayName: string;
    lastBackupAt: number | null;
  }

  signIn(): Promise<GoogleSession>
  signOut(): Promise<void>
  getStoredSession(): Promise<GoogleSession | null>
  saveSession(session: GoogleSession): Promise<void>
  clearSession(): Promise<void>
  getValidAccessToken(session: GoogleSession): Promise<string>
  // ↑ retorna accessToken se válido, ou chama refreshAccessToken e salva o novo
  ```
- **Dependencies**: `@react-native-google-signin/google-signin`, `expo-secure-store`
- **Secure-store keys**:
  ```
  GDRIVE_ACCESS_TOKEN
  GDRIVE_REFRESH_TOKEN
  GDRIVE_EXPIRES_AT
  GDRIVE_EMAIL
  GDRIVE_DISPLAY_NAME
  GDRIVE_LAST_BACKUP_AT
  ```

---

### `services/driveService.ts`

- **Purpose**: Chamadas diretas à Drive REST API v3 — sem biblioteca adicional, usa `fetch` nativo + `FileSystem`.
- **Location**: `services/driveService.ts`
- **Interfaces**:
  ```ts
  interface DriveFile {
    id: string;
    name: string;
    createdTime: string;  // ISO 8601
    size: string;         // bytes como string
  }

  findFolder(name: string, accessToken: string): Promise<string | null>
  // retorna folderId ou null

  createFolder(name: string, accessToken: string): Promise<string>
  // retorna folderId do folder criado

  listFiles(folderId: string, accessToken: string): Promise<DriveFile[]>
  // lista arquivos .db na pasta, ordenados por createdTime ASC

  uploadFile(opts: {
    localPath: string;
    fileName: string;
    folderId: string;
    accessToken: string;
  }): Promise<string>
  // retorna fileId do arquivo criado
  // usa 2 passos: POST /files (metadata) → PATCH /upload/files/{id} (conteúdo binário via FileSystem.uploadAsync)

  downloadFile(opts: {
    fileId: string;
    destPath: string;
    accessToken: string;
  }): Promise<void>
  // usa FileSystem.downloadAsync

  deleteFile(fileId: string, accessToken: string): Promise<void>
  ```
- **Dependencies**: `expo-file-system`, `fetch` nativo

---

### `services/driveSync.ts`

- **Purpose**: Lógica de negócio — orquestra backup, restauração e rotação de arquivos.
- **Location**: `services/driveSync.ts`
- **Interfaces**:
  ```ts
  getDbFilePath(): string
  // retorna ${FileSystem.documentDirectory}SQLite/db.db
  // ⚠️ verificar path correto com console.log durante implementação

  ensureFolder(accessToken: string): Promise<string>
  // findFolder('mimo') → se null, createFolder('mimo') → retorna folderId

  uploadBackup(accessToken: string): Promise<number>
  // retorna timestamp ms do backup criado
  // 1. ensureFolder → folderId
  // 2. listFiles → se length >= 5, deleteFile(mais antigo)
  // 3. gera fileName = mimo-backup-YYYY-MM-DD-HHmmss.db
  // 4. uploadFile(dbPath, fileName, folderId)

  checkFirstLoginBackup(accessToken: string): Promise<DriveFile | null>
  // ensureFolder → listFiles → retorna o mais recente ou null

  restoreBackup(fileId: string, accessToken: string): Promise<void>
  // 1. downloadFile → ${FileSystem.cacheDirectory}mimo-restore-tmp.db
  // 2. validar: SQLite.openDatabaseSync(tmpPath) → closeSync()
  // 3. expo.closeSync()  (singleton de db/client.ts)
  // 4. FileSystem.copyAsync(tmp → dbPath, { overwrite: true })
  // 5. lança evento — quem chama cuida de fechar o app
  ```
- **Dependencies**: `driveService.ts`, `googleAuth.ts`, `db/client.ts` (import de `expo`), `expo-sqlite`, `expo-file-system`

---

### `hooks/useGoogleDriveSync.ts`

- **Purpose**: Hook React que gerencia estado de autenticação + AppState listener de backup automático + contexto compartilhado.
- **Location**: `hooks/useGoogleDriveSync.ts`
- **Interfaces**:
  ```ts
  interface DriveSyncContextValue {
    session: GoogleSession | null;
    isConnected: boolean;
    isSyncing: boolean;
    lastBackupAt: number | null;
    signIn(): Promise<void>;
    signOut(): Promise<void>;
    restoreBackup(fileId: string): Promise<void>;
    checkFirstLoginBackup(): Promise<DriveFile | null>;
  }

  // Hook para consumir o contexto
  useDriveSyncContext(): DriveSyncContextValue
  ```
- **AppState listener (módulo-level debounce)**:
  ```ts
  let lastUploadAt = 0; // módulo-level — sobrevive remounts

  AppState.addEventListener('change', (next) => {
    if (!session) return;
    if (next === 'background' || (prev !== 'active' && next === 'active')) {
      const now = Date.now();
      if (now - lastUploadAt < 30_000) return;
      lastUploadAt = now;
      driveSync.uploadBackup(validToken).catch(() => {}); // best-effort
    }
  });
  ```
- **Dependencies**: `services/googleAuth.ts`, `services/driveSync.ts`

---

### `providers/DriveSyncProvider.tsx`

- **Purpose**: Componente wrapper que instancia `useGoogleDriveSync` e provê o contexto. Monta no `_layout.tsx` fora de `BiometricGate`.
- **Location**: `providers/DriveSyncProvider.tsx`
- **Interfaces**:
  ```tsx
  <DriveSyncProvider>
    {children}
  </DriveSyncProvider>
  ```
- **Reuses**: padrão de `ThemeProvider` em `themes/`

---

### `components/settings/GoogleDriveSection.tsx`

- **Purpose**: Seção de UI "Google Drive" na tela de Configurações.
- **Location**: `components/settings/GoogleDriveSection.tsx`
- **Estados visuais**:
  - **Desconectado**: botão "Conectar conta Google" (ícone Google, accentColor = `colors.primaryGold`)
  - **Conectado**: email + displayName, "Último backup: [data]" (P2), botão "Desconectar", item "Restaurar backup" (P3)
  - **Sincronizando**: `ActivityIndicator` inline (não bloqueia a UI)
- **Reuses**: `MenuItem`, `SectionLabel` de `settings.tsx`; `useCustomAlert` para confirms/errors; `withSpring(SPRING_BOUNCE)` para animações

---

## Data Models

### `GoogleSession` (expo-secure-store, não SQLite)

```typescript
interface GoogleSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;        // Date.now() + expires_in * 1000
  email: string;
  displayName: string;
  lastBackupAt: number | null; // ms timestamp do último upload concluído
}
```

Serializado como JSON único na key `GDRIVE_SESSION` no `expo-secure-store` (uma key, um parse — mais simples que múltiplas keys).

### `DriveFile` (em memória, nunca persistido)

```typescript
interface DriveFile {
  id: string;
  name: string;            // "mimo-backup-2025-06-22-143021.db"
  createdTime: string;     // "2025-06-22T14:30:21.000Z"
  size: string;            // bytes como string (retorno da Drive API)
}
```

---

## Error Handling Strategy

| Cenário | Tratamento | Impacto para o usuário |
|---------|-----------|----------------------|
| Upload falha (sem rede) | Silencioso — tenta no próximo AppState | Nenhum |
| `accessToken` expirado | `getValidAccessToken()` faz refresh automaticamente | Nenhum |
| `refreshToken` revogado (401) | Limpa session, exibe banner nas Configurações | Banner discreto pedindo reconexão |
| Download falha durante restore | `showError` + mantém db.db original intacto | Mensagem de erro, nenhum dado perdido |
| Arquivo `.db` corrompido no Drive | `SQLite.openDatabaseSync(tmp)` lança exceção → `showError` | Mensagem de erro, nenhum dado perdido |
| OAuth cancelado pelo usuário | Silencioso — nenhum estado alterado | Nenhum |
| Pasta `mimo` não existe | `ensureFolder()` cria automaticamente | Transparente |

---

## Tech Decisions

| Decisão | Escolha | Rationale |
|---------|---------|-----------|
| Lib OAuth | `@react-native-google-signin/google-signin` | Refresh token automático e confiável no Android; `expo-auth-session` requer config manual de `access_type=offline` e é menos estável em produção |
| Drive API | REST direto com `fetch` + `FileSystem.uploadAsync` | Sem biblioteca extra (`googleapis` é Node.js, não roda em RN); upload binário em 2 passos (POST metadata → PATCH conteúdo) |
| Token storage | `expo-secure-store` (1 key `GDRIVE_SESSION`, JSON) | Mais seguro que SQLite para credenciais; 1 key = 1 parse |
| Restore strategy | `BackHandler.exitApp()` após copiar o arquivo | `expo-updates` não está instalado; matar e reabrir o app é o único jeito confiável de recarregar o singleton `expo` de `db/client.ts` |
| AppState listener | Módulo-level (fora de React state) | Debounce de 30s via variável de módulo sobrevive remounts de componentes |
| Caminho do db.db | `${FileSystem.documentDirectory}SQLite/db.db` | Path padrão do expo-sqlite v14+; **verificar com `console.log` na implementação** |
| Scope Drive | `drive.file` | App vê apenas seus próprios arquivos — mínimo privilégio; requisito de segurança |

---

## Mudanças em arquivos existentes

| Arquivo | Mudança |
|---------|---------|
| `app/_layout.tsx` | Adicionar `<DriveSyncProvider>` envolvendo `<ThemeProvider>` |
| `app/(tabs)/settings.tsx` | Adicionar `<GoogleDriveSection>` e `<SectionLabel label="Google Drive" />` antes dos `menuItems` |
| `app.json` | Adicionar `"@react-native-google-signin/google-signin"` ao array `plugins`; configurar o `clientId` |
