# External Integrations

## Device APIs

### Biometric Authentication

**Service:** expo-local-authentication  
**Purpose:** Lock the app behind device biometric (fingerprint/face) or PIN  
**Implementation:** `app/_layout.tsx` — `BiometricGate` component; `hooks/useSettings.ts` — availability check  
**Configuration:** Enabled/disabled via `settings` SQLite row (`biometricsEnabled` column)  
**Authentication:** Device-local (Face ID, fingerprint, PIN) — no remote auth

### Camera / Image Picker

**Service:** expo-image-picker  
**Purpose:** Capture or select receipt photos and attachments  
**Implementation:** `components/AttachmentPicker.tsx`  
**Configuration:** Requires `NSPhotoLibraryUsageDescription` (iOS) and `READ_MEDIA_IMAGES` (Android) permissions  
**Authentication:** N/A

### Document Picker

**Service:** expo-document-picker  
**Purpose:** Pick file attachments (PDFs, etc.) for transactions  
**Implementation:** `components/AttachmentPicker.tsx`  
**Configuration:** Standard file system permission  
**Authentication:** N/A

### File System

**Service:** expo-file-system  
**Purpose:** Read file content into base64 for storage in SQLite; write files for sharing  
**Implementation:** `components/AttachmentPicker.tsx`, `components/AttachmentViewer.tsx`  
**Configuration:** N/A  
**Authentication:** N/A

### Media Library

**Service:** expo-media-library  
**Purpose:** Save shared files/receipts to device gallery  
**Implementation:** `components/AttachmentViewer.tsx` or receipt-related components  
**Configuration:** `WRITE_EXTERNAL_STORAGE` (Android) / `NSPhotoLibraryAddUsageDescription` (iOS)  
**Authentication:** N/A

### Sharing

**Service:** expo-sharing  
**Purpose:** Share attachments/receipts via system share sheet  
**Implementation:** `components/AttachmentViewer.tsx`  
**Configuration:** N/A  
**Authentication:** N/A

## Local Database

### SQLite (expo-sqlite)

**Service:** expo-sqlite ~16.0.10  
**Purpose:** All app data persistence — transactions, accounts, goals, settings, attachments  
**Implementation:** Opened as `SQLite.openDatabaseSync('db.db')` in each hook and selected screens  
**Configuration:** `drizzle.config.ts` (schema + output dir); migrations bundled in `drizzle/migrations.js` and applied at boot via `useMigrations` in `app/_layout.tsx`  
**Authentication:** N/A — device-local

## Build & Distribution

### EAS (Expo Application Services)

**Service:** EAS Build + EAS Submit  
**Purpose:** Cloud-based and local native builds for Android (APK/AAB) and iOS  
**Implementation:** `eas.json` (build profiles), `app.json` (app config)  
**Configuration:**
- `build:apk` → local preview APK (`--local`)
- `build:aab` → EAS cloud production AAB
**Authentication:** EAS account (run `eas login` locally); not required at runtime

## API Integrations

None — the app is fully offline. There are no HTTP calls, no REST/GraphQL APIs, no WebSockets, and no push notification services integrated.

## Webhooks

None.

## Background Jobs

None — no background queue system. Recurring transaction generation happens synchronously when:
- The `addTransaction` screen creates a recurring group (generates ~6 months of transactions upfront)
- No background daemon runs to extend recurring transactions over time beyond the initial generation window
