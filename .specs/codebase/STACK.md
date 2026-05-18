# Tech Stack

**Analyzed:** 2026-05-17

## Core

- Framework: React Native 0.81.5
- Language: TypeScript ~5.9.2
- Runtime: Expo SDK ~54.0.33
- Package manager: bun

## Frontend

- UI Framework: React Native 0.81.5 + React 19.1.0
- Router: expo-router ~6.0.23 (file-based, tabs + stack navigation)
- Styling: NativeWind (latest) — Tailwind CSS classes via `className`; tailwindcss ^3.4.0
- Icons: @expo/vector-icons (Feather set)
- Animation: react-native-reanimated ~4.1.1 (required for all interactive components)
- Gestures: react-native-gesture-handler ^2.31.1
- Safe areas: react-native-safe-area-context ~5.6.0
- State management: React local state + custom hooks (no Redux/Zustand); module-level singleton for cross-screen selection (`utils/selectionStore.ts`)
- Form handling: @tanstack/react-form ^1.28.6 + @tanstack/zod-form-adapter ^0.42.1
- Validation: zod ^4.3.6

## Database

- ORM: drizzle-orm ^0.45.2 (expo-sqlite driver)
- Database: expo-sqlite ~16.0.10 (SQLite local, offline-first — data never leaves the device)
- Migrations: drizzle-kit ^0.31.10 (generates SQL migrations, applied at startup via `useMigrations`)
- IDs: custom UUID v4 generator (`utils/generateId.ts`) — no external uuid library

## Charts & Data Visualization

- @wuba/react-native-echarts ^3.0.1 (Apache ECharts adapter for RN)
- echarts ^6.0.0
- react-native-svg ^15.15.4 (SVG renderer for ECharts)

## Device Integrations

- expo-local-authentication ^55.0.13 (biometric/PIN lock gate)
- expo-image-picker ^55.0.18 (receipt/attachment photos)
- expo-document-picker ^55.0.13 (file attachments)
- expo-file-system ^55.0.16 (file read/write for attachments)
- expo-media-library ^55.0.14
- expo-sharing ^55.0.18

## Testing

- Unit: none
- Integration: none
- E2E: none
- Coverage: none

## External Services

- None — fully offline, no network calls at runtime

## Build & Distribution

- EAS (Expo Application Services): eas-cli ^18.9.1
- Preview builds: `build:apk` (local APK via EAS)
- Production builds: `build:aab` (AAB via EAS cloud)

## Development Tools

- Linter: ESLint ^9.25.1 + eslint-config-expo ~10.0.0
- Formatter: Prettier ^3.2.5 + prettier-plugin-tailwindcss ^0.5.11
- Build config: Babel ^7.20.0 + babel-plugin-inline-import
- Type checking: TypeScript ~5.9.2 (strict)
