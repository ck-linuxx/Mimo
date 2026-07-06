# Google Drive Sync — Tasks

**Design**: `.specs/features/google-drive-sync/design.md`
**Status**: In Progress

> Sem TESTING.md no projeto — Tests: none em todas as tasks. Gate: `bunx tsc --noEmit`.

---

## Execution Plan

```
T1 → T2 [P] → T4 → T5 → T6 [P] → T8
     T3 [P] ↗        T7 [P] ↗
```

---

## Task Breakdown

### T1: Instalar pacotes e configurar app.json
**What**: Instalar `@react-native-google-signin/google-signin` e `expo-secure-store`; adicionar config plugin ao `app.json`.
**Where**: `package.json`, `app.json`
**Depends on**: None
**Status**: ⏳ Pending

### T2: `services/googleAuth.ts` [P]
**What**: Serviço de OAuth — signIn, signOut, getAccessToken, restoreSession, persistência de user + last backup no SecureStore.
**Where**: `services/googleAuth.ts` (novo)
**Depends on**: T1
**Status**: ⏳ Pending

### T3: `services/driveService.ts` [P]
**What**: Chamadas à Drive REST API — findFolder, createFolder, listFiles, uploadFile (2-step), downloadFile, deleteFile.
**Where**: `services/driveService.ts` (novo)
**Depends on**: T1
**Status**: ⏳ Pending

### T4: `services/driveSync.ts`
**What**: Lógica de negócio — uploadBackup (rotate FIFO max 5), checkFirstLoginBackup, restoreBackup (fecha conexão → copia arquivo → BackHandler.exitApp).
**Where**: `services/driveSync.ts` (novo)
**Depends on**: T2, T3
**Status**: ⏳ Pending

### T5: `hooks/useGoogleDriveSync.ts` + `providers/DriveSyncProvider.tsx`
**What**: Hook + contexto React com estado de sessão, AppState listener (debounce 30s módulo-level), ações expostas para UI.
**Where**: `hooks/useGoogleDriveSync.ts` (novo), `providers/DriveSyncProvider.tsx` (novo)
**Depends on**: T4
**Status**: ⏳ Pending

### T6: `components/settings/GoogleDriveSection.tsx` [P]
**What**: Componente de UI para a seção Google Drive nas Configurações (estados: desconectado, conectado, sincronizando).
**Where**: `components/settings/GoogleDriveSection.tsx` (novo)
**Depends on**: T5
**Status**: ⏳ Pending

### T7: Atualizar `app/_layout.tsx` [P]
**What**: Adicionar `DriveSyncProvider` e chamar `configure()` do googleAuth no bootstrap do app.
**Where**: `app/_layout.tsx`
**Depends on**: T5
**Status**: ⏳ Pending

### T8: Atualizar `app/(tabs)/settings.tsx`
**What**: Adicionar seção Google Drive com `SectionLabel` + `GoogleDriveSection` antes dos menuItems.
**Where**: `app/(tabs)/settings.tsx`
**Depends on**: T6, T7
**Status**: ⏳ Pending
