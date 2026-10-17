# constants/ — Constantes do Projeto

Constantes globais e de auxílio utilizadas no aplicativo.

## Regras de Organização e Nomenclatura

- **Constantes de auxílio:** Devem seguir o padrão de nomenclatura `[funcao][servico/uso]`.
  - Exemplo: `queryKeysPluggy.ts` (Função: `queryKeys`, Serviço/Uso: `Pluggy`).
  - Nunca criar constantes de auxílio dispersas dentro de pastas de serviços quando forem de uso compartilhado ou chaves de integração global.
