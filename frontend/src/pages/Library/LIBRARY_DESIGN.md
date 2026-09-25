# Biblioteca — direção visual

A Biblioteca é um desktop pessoal cozy. O centro é um objeto de papel editorial, cercado por pequenos widgets; os livros são os protagonistas.

## Composição

- Desktop: widgets do dia à esquerda, biblioteca no centro, cantinho pessoal à direita.
- Painel: papel creme, moldura fina, divisões editoriais, sombra suave, fita e aba lateral.
- Cabeçalho: “Sua biblioteca”, contador de até seis agendas, busca compacta, ação de criação e filtros discretos.
- Coleção: até três colunas e duas linhas; uma agenda recebe uma composição central com bilhete.
- Livros: capa livre sem título automático, lombada, páginas laterais, fita e movimento discreto. Nome e metadados abaixo, sem cards externos.
- Dock: Hoje, Biblioteca, Calendário, Tarefas, Agenda e Papelaria, com Lucide.
- Celular: priorizar painel e livros; reduzir colunas e retirar widgets periféricos quando não couberem.

## Paleta

| Papel | Cor |
| --- | --- |
| Base Latte | `#F7F1E8` |
| Matcha | `#9CA362` |
| Green Beryl | `#D0DDC4` |
| Ballet Slipper | `#FDD0D0` |
| Wisteria | `#E6E3F7` |
| Azure Sky | `#B5D8FF` |
| Sun Drenched | `#FCEABC` |
| Pêssego | `#EDCBB9` |

Superfícies neutras dominantes, acentos suaves, sem gradientes decorativos. Respeitar cores e imagens de capas já escolhidas pelo usuário.

Títulos serifados editoriais; controles sans-serif legíveis; detalhes manuscritos ou itálicos pontuais. A proporção desejada é 80% organização e 20% surpresa.

## Conteúdo e interação

Perfil, coleção e lembretes vêm dos dados reais. A polaroid atual é uma ilustração decorativa, não uma memória do usuário. A agenda sugerida é a atualizada mais recentemente. Clima, música e contagens de páginas só devem aparecer quando houver dados reais disponíveis.

Preservar criação, personalização, renomeação, favoritos, duplicação, exclusão e limite de seis agendas. Menu discreto no hover, também acessível por teclado e toque. Respeitar movimento reduzido.

Evitar busca gigante, filtros grandes, livro dentro de cards, barra de prateleira artificial, slogans, controles sem função e agenda isolada no canto.

## Arquivos

`LibraryPage.tsx`: composição e dados. `LibraryRoom.css`: aparência do ambiente. `room-wallpaper.svg` e `RoomScene.tsx`: ilustrações vetoriais. `LibraryPage.css`: estilos de suporte, navegação e modal. `AgendaCard`: objeto livro compartilhado.
