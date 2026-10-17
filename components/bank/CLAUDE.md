# components/bank — Bancos e logos

Lista de bancos (BrasilAPI) usada para criar contas e cartões.

- `banks.ts` — `BANKS`: apenas `name`, `code`, `fullName`, `logo_url` (gerado; só bancos com logo, uma entrada por marca).
- `logos/<BankName>Logo.tsx` — uma logo = um componente React nomeado a partir do `name` do banco em PascalCase (SVG via `react-native-svg`; PNGs via `Image` + `assets/banks/<code>.png`). Gerados, não editar à mão.
- `logoLoaders.ts` — `BANK_LOGO_LOADERS[code]`: `require` lazy por banco, para só carregar as logos exibidas.
- `BankLogo.tsx` — `BankLogo`, `EntityIcon` (renderiza `bank:<code>` ou ícone Feather), helpers `toBankIcon` / `parseBankIcon`.
- `BankPicker.tsx` — grade paginada e pesquisável (logo + `name`).

Convenção: `accounts.icon` e `cards.icon` guardam `bank:<code>` quando um banco é escolhido; caso contrário, nome Feather legado.
