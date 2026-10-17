# components/pluggy/ — Componentes da Integração Pluggy

Componentes de interface especializados para o fluxo Open Finance com a Pluggy (Caixa de Entrada e Configurações de Conexões).

## Principais Arquivos e Responsabilidades

### `BankMappingModal.tsx`
Modal padrão da aplicação para configuração e mapeamento de contas/cartões importados da Pluggy:
- **Criação inteligente**: Sugere automaticamente ícone e nome baseado no maior match via regex (`matchBankPluggy`).
- **Personalização completa**: Permite selecionar a cor do banco (`ColorPickerCarousel`), buscar e trocar o banco (`BankPicker`), e editar o nome do lançamento local.
- **Vínculo flexível**: Permite vincular a uma conta ou cartão já existente ou remover o vínculo prévio.
- **Confirmação explícita**: Dispara diálogo de confirmação antes de persistir a criação ou o vínculo.

### `ImportEditModal.tsx`
Modal padrão para edição e importação de transações da staging:
- Suporta separação de tipo (`income` / `expense`) e status (`paid` / `pending`).
- Seletor de data usando o `DatePicker` padrão da aplicação.
- Seleção de categoria e conta/cartão de destino.

### `InboxFilters.tsx`
Barra de filtros e busca da Caixa de Entrada da Pluggy:
- Busca textual por descrição e nome do banco.
- Abas de status de revisão (`pending`, `imported`, `linked`, `ignored`).
- Subfiltro exclusivo de conflitos para pendentes (`all`, `without_conflict`, `with_conflict`).
- Seletor de contas/bancos conectados.

### `InboxItem.tsx`
Card de transação pendente com botões de ação e alertas de conflito.

### `MatchCandidatesModal.tsx`
Modal para resolução de duplicidades / vinculação de transações existentes no app com os lançamentos da Pluggy.

