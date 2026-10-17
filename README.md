# Mimo — Controle Financeiro Pessoal

**Mimo** é um aplicativo mobile de gestão financeira pessoal com abordagem **100% local-first**. Todos os seus lançamentos, contas, cartões de crédito, metas e conexões via Open Finance ficam armazenados diretamente no dispositivo usando **SQLite** com **Drizzle ORM**, garantindo privacidade, velocidade e funcionamento offline.

---

## ✨ Principais Funcionalidades

- **Gestão Completa de Lançamentos:** Receitas, despesas à vista, parcelamentos e assinaturas/recorrências com cálculo automático de vencimento de fatura (`dueDate` e `billingPeriod`).
- **Contas Bancárias e Cartões de Crédito:** Cadastro com seletor visual de instituições financeiras brasileiras (logos embutidas via SVG e cores institucionais), controle de fechamento/vencimento e acordeão de faturas mensais.
- **Integração Open Finance (Pluggy):**
  - Sincronização incremental e segura (somente leitura) com bancos e cartões conectados no [Meu Pluggy](https://meu.pluggy.ai).
  - **Caixa de Entrada (Staging Inbox):** Nenhum lançamento bancário altera seu saldo sem sua permissão. Revise, edite, ignore ou importe em lote (com barra de progresso em tempo real).
  - **Conciliação Inteligente (Matching):** Detecta lançamentos manuais compatíveis por valor, tipo e proximidade de data para vinculação sem perda de categoria, notas ou comprovantes.
  - **Mapeamento Automático de Bancos:** Sugere automaticamente o ícone, a cor e o nome da instituição ao vincular uma nova conta ou cartão da Pluggy.
  - **Sincronização em Segundo Plano e Notificações:** Busca novos lançamentos ao abrir o app, recuperar conexão ou via *background task*, notificando sobre novos itens pendentes.
- **Metas Financeiras:** Acompanhamento de objetivos com progresso visual, aportes e resgates integrados às transações.
- **Relatórios e Gráficos Interativos:** Visão consolidada de receitas vs. despesas, gastos por categoria, conta e cartão, assinaturas ativas e provisão futura.
- **Backup e Importação:** Exportação/importação de banco SQLite (`.db`), JSON e extratos OFX/CSV.
- **Segurança e Aparência:** Bloqueio por biometria ( Impressão Digital / Face ID ), temas Claro e Escuro persistidos localmente com tipografia **Inter** e layout responsivo completo para **celulares e tablets** (incluindo modo horizontal / *notebook mode* com navegação lateral e grades em 2 colunas).

---

## 🛠️ Stack Tecnológica

- **Framework:** [Expo SDK 57](https://expo.dev) + [React Native 0.86](https://reactnative.dev) (React 19)
- **Roteamento:** [Expo Router](https://docs.expo.dev/router/introduction/) (navegação baseada em arquivos `(tabs)` e `(stack)`)
- **Banco de Dados Local:** `expo-sqlite` + [Drizzle ORM](https://orm.drizzle.team) (`drizzle-kit` para migrations)
- **Gerenciamento de Estado Assíncrono & Formulários:** `@tanstack/react-query`, `@tanstack/react-form` + `zod`
- **Estilização & Animações:** [NativeWind](https://www.nativewind.dev) (Tailwind CSS) + `react-native-reanimated`
- **Gráficos:** `@wuba/react-native-echarts` + `react-native-svg`
- **Segurança:** `expo-secure-store` (credenciais de API criptografadas no chaveiro nativo) + `expo-local-authentication`
- **Gerenciador de Pacotes:** [Bun](https://bun.sh)

---

## 🚀 Como Configurar e Executar o Projeto

### Pré-requisitos

- **[Bun](https://bun.sh)** instalado (`curl -fsSL https://bun.sh/install | bash`)
- **Node.js** (LTS recomendado para ferramentas auxiliares do ecossistema Expo)
- **Android Studio** (SDK Android configurado em `$HOME/Android/Sdk`) e/ou **Xcode** (para iOS no macOS)

### 1. Instalar dependências

> **Importante:** Este projeto utiliza exclusivamente o **Bun** como gerenciador de pacotes.

```bash
bun install
```

### 2. Iniciar o servidor de desenvolvimento

```bash
# Inicia o Metro Bundler
bun run start

# Executar diretamente no Android (emulador ou dispositivo conectado)
bun run android

# Executar diretamente no iOS
bun run ios

# Executar na Web
bun run web
```

---

## 🗄️ Banco de Dados e Migrations (Drizzle ORM)

O schema do banco SQLite está localizado em [`db/schema.ts`](db/schema.ts) e as migrações geradas ficam na pasta [`drizzle/`](drizzle/). As migrações são aplicadas automaticamente na inicialização do app.

Sempre que alterar o arquivo `db/schema.ts`, gere e valide a nova migration com:

```bash
# Gera a migration SQL e verifica a integridade do journal
bun run db:generate

# Apenas valida se todas as migrations estão registradas corretamente
bun run db:check
```

---

## 🏦 Configurando a Integração Open Finance (Pluggy)

A integração com a Pluggy foi desenhada para uso pessoal no modelo *Client-Side Local-First*:

1. Crie uma conta de desenvolvedor no [Pluggy Dashboard](https://dashboard.pluggy.ai) e obtenha seu `CLIENT_ID` e `CLIENT_SECRET`.
2. Conecte suas instituições financeiras através do [Meu Pluggy](https://meu.pluggy.ai) e copie os **`Item IDs`** de cada conexão bancária (obrigatórios).
3. No aplicativo **Mimo**, acesse **Configurações → Integração Pluggy**:
   - Insira o `PLUGGY_CLIENT_ID`, o `PLUGGY_CLIENT_SECRET` e os `ITEM IDs` (um por linha — campo obrigatório).
   - Toque em **Salvar e testar**. As credenciais são armazenadas exclusivamente no armazenamento seguro do dispositivo (`expo-secure-store` com `WHEN_UNLOCKED_THIS_DEVICE_ONLY`) e **nunca** entram em arquivos de backup exportados.
4. Após a primeira sincronização, vincule cada conta/cartão retornado a uma conta ou cartão local do Mimo (ou crie um novo com 1 toque pelo modal de sugestão inteligente) e revise os lançamentos na **Caixa de Entrada**.

---

## 📂 Estrutura de Pastas

Cada módulo principal possui seu próprio arquivo `CLAUDE.md` com documentação detalhada de arquitetura e regras de negócio:

```text
├── app/
│   ├── (tabs)/          # Telas principais (Início, Transações, Adicionar, Relatórios, Configurações)
│   └── (stack)/         # Fluxos em pilha (Metas, Detalhes de Conta/Cartão, Importação, Pluggy Settings/Inbox)
├── components/
│   ├── bank/            # Catálogo de bancos brasileiros, logos SVG e BankPicker
│   ├── charts/          # Gráficos Donut e ECharts
│   ├── import/          # Componentes de importação de arquivos OFX/CSV/Backup
│   ├── pluggy/          # Modais e itens da Caixa de Entrada Pluggy (BankMappingModal, ImportEditModal, etc.)
│   └── reports/         # Cards analíticos da tela de Relatórios
├── constants/           # Chaves de cache do React Query e rotas de API
├── db/                  # Cliente SQLite e definição de tabelas (Drizzle ORM)
├── drizzle/             # Arquivos SQL de migração versionados
├── hooks/               # Hooks de acesso a dados, responsividade (useBreakpoint) e integração Pluggy
├── services/
│   └── pluggy/          # Cliente HTTP Pluggy, autenticação, sync incremental, conciliação e background task
├── themes/              # Paletas Light/Dark e contexto de tema
├── types/               # Tipagens TypeScript e enums globais
└── utils/               # Formatadores, cálculo de fatura (cardDueDate, billingCycle) e mappers da Pluggy
```

---

## 🧪 Qualidade de Código e Build

```bash
# Verificar lint e formatação (ESLint + Prettier)
bun run lint

# Corrigir automaticamente problemas de lint e formatação
bun run format

# Gerar APK de preview localmente (requer Android SDK configurado)
bun run build:apk

# Gerar AAB de produção via EAS Build
bun run build:aab
```

