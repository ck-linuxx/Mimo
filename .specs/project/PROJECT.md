# mimoV2

**Vision:** App de controle financeiro pessoal offline-first para brasileiros — simples, rápido e que funciona sem internet.
**For:** Pessoas comuns que querem se organizar financeiramente, evitar dívidas e identificar gastos invisíveis.
**Solves:** Falta de visibilidade sobre para onde o dinheiro vai no dia a dia, levando a gastos desnecessários e endividamento.

## Goals

- Usuário consegue registrar 100% das suas transações sem depender de internet (SQLite local, dados nunca saem do dispositivo).
- Usuário consegue visualizar claramente para onde seu dinheiro está indo (relatórios, gráficos por categoria, período).
- Usuário consegue evitar gastos desnecessários monitorando contas, cartões e metas financeiras em um único lugar.

## Tech Stack

**Core:**

- Framework: React Native 0.81.5 + Expo ~54.0.33
- Router: Expo Router ~6.0.23 (file-based, tabs + stack)
- Language: TypeScript
- Database: expo-sqlite (SQLite local, offline-first) via Drizzle ORM ^0.45.2
- Styling: NativeWind (TailwindCSS for React Native)

**Key dependencies:**

- `react-native-reanimated` ~4.1.1 — animações obrigatórias em todos os componentes interativos
- `@tanstack/react-form` + `zod` — formulários com validação
- `@wuba/react-native-echarts` — gráficos interativos (donut, barras, linhas)
- `expo-local-authentication` — autenticação biométrica
- `expo-image-picker` + `expo-document-picker` — anexos de comprovantes

## Scope

**v1 inclui:**

- Contas financeiras (corrente, poupança, dinheiro, investimento) com saldo calculado
- Cartões de crédito com ciclo de faturamento (fechamento/vencimento)
- Transações (receitas e despesas) — únicas, recorrentes e parceladas
- Categorias de transações (pré-cadastradas + customizáveis)
- Metas financeiras com progresso via transações vinculadas
- Relatórios e gráficos por categoria, período e conta
- Anexos de comprovantes por transação (foto / documento)
- Tema dark/light com persistência via SQLite
- Autenticação biométrica (opcional)

**Explicitamente fora do escopo:**

- Sincronização na nuvem ou multi-device
- Versão web (planejada para o futuro, após Android estável)
- Suporte a iOS (fase atual é exclusivamente Android — celular e tablet)
- Open banking / integração automática com bancos
- Compartilhamento de dados entre usuários

## Constraints

- **Plataforma:** Android (celular e tablet); iOS e Web são fases futuras
- **Dados:** 100% locais — sem backend, sem autenticação remota
- **Package manager:** sempre `bun` (nunca npm/yarn/pnpm)
- **Distribuição atual:** build local via EAS (`build:apk` / `build:aab`)
