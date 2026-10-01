# Fundação do editor V6

O backend e os contratos de autenticação, blocos, páginas, mídia e CanvasElement foram preservados. Nenhuma dependência foi adicionada. A migração é incremental sobre o canvas DOM/SVG existente; Konva não é necessário para esta etapa.

## Organização

- `AgendaPage.tsx`: modo folha/agenda aberta, zoom, paginação e foco entre folhas reais.
- `PageEditor.tsx`: controlador legado por folha, com APIs, autosave, desenhos, mídia e painéis existentes. Ainda exige extrações futuras; esta etapa não reescreve todos esses subsistemas.
- `EditorBlocks.tsx`: blocos editáveis e navegação ordenável de páginas/seções.
- `EditorToolbar.tsx` e `useTransientPanels.ts`: ferramentas, fechamento por Escape e clique fora.
- `CanvasElementFrame.tsx`: seleção, alça de movimento e ajuste por teclado compartilhados pelos elementos livres.
- `CanvasElementContent.tsx`: renderização de post-its, formas, setas, washi e carimbos.
- `useCanvasElements.ts`: criação, manipulação e persistência dos elementos pela API existente. PATCHes são serializados por elemento; erros ficam visíveis e permitem nova tentativa.
- `canvasGeometry.ts`: limites de movimento no papel.
- `editorModel.ts`: contratos e conversores preservados.
- `editorCatalog.ts`: catálogos existentes de papelaria e cores de desenho.
- `EditorTokens.css`: paleta aprovada e cores legadas centralizadas para migração gradual.
- `EditorWorkspace.css` e `AgendaPage.css`: composição V6 e estilos dos controles preservados. Os padrões de linhas/grade do papel e de transparência são funcionais, não gradientes decorativos.

## Comportamento

As posições usam pixels do papel, independentes do zoom. Cada folha tem seu estado de edição. A segunda folha permanece montada quando o usuário volta ao modo único, preservando edições e gravações pendentes. A navegação principal acompanha a folha esquerda; clicar na direita direciona as ferramentas para ela. As páginas vêm da agenda real, sem conteúdo de demonstração no produto.

Post-its têm alça de arraste visível, seleção ao editar, movimento por setas (Shift: dez pixels), limites de posição, redimensionamento limitado, giro, duplicação, bloqueio, exclusão e comando para trazer à frente. Posição e texto usam CanvasElement; o texto é gravado ao sair do campo, conforme o fluxo existente.

## Evolução V6.2

- Texto livre nasce com clique na área vazia da folha e persiste como `CanvasElement` após a edição; a seleção de mídia e elementos se exclui, Escape e clique fora limpam a seleção.
- `BindingRings` acompanha o vão das duas folhas sem interceptar eventos. `PageTabs` salva marcadores de página ou Seção em `agenda.settings.page_tabs_v1`, com edição, cor, remoção e ordenação.
- O painel de modelos inclui Blank, Lined, Grid, Dotted e Daily Planner; aplicar papel mantém o conteúdo, enquanto os modelos salvos pelo usuário continuam usando `/templates`.
- Korean Study Planner e Task Receipt são elementos persistentes da folha. O recibo lê e conclui tarefas da agenda pela rota `/tasks/{id}`; remover o widget preserva as tarefas.
- Catálogos de formas e setas incluem linha e seta decorativa. Os demais catálogos continuam expansíveis. Nenhuma rota ou tabela de backend foi adicionada.
- Os testes de navegador usam uma API isolada em memória. Ainda é necessário revisar com uma conta autenticada e dados reais, além de validar visualmente em navegadores e tamanhos de tela variados.

## Evolução V6.3 — histórico, camadas e visualização

- Cada folha tem histórico independente, limitado às 50 operações mais recentes. Mover, redimensionar, girar, bloquear, reordenar camadas, criar, duplicar e excluir CanvasElements graváveis podem ser desfeitos/refeitos com chamadas às rotas existentes; gestos de ponteiro gravam apenas no fim do gesto.
- Mídia de página registra em histórico mover, redimensionar, girar, bloquear, reordenar e duplicar. Undo/redo de duplicação usa a rota de duplicação existente; IDs de recursos recriados são remapeados nas entradas ainda pendentes.
- Traços mantêm o comando dedicado de desfazer o último traço; apagamentos por borracha e traços novos ainda não participam do histórico unificado.
- A exclusão de mídia exige confirmação e não entra no histórico: a rota DELETE apaga também o arquivo físico. CanvasElements com asset persistido também exigem confirmação e não têm undo de exclusão; elementos sem asset podem ser restaurados pelo POST existente.
- Camadas são ordenadas separadamente dentro de CanvasElements e de PageMedia. O CSS coloca PageMedia abaixo de CanvasElements e desenhos acima de ambos; não há ordenação cruzada falsa entre tabelas. Ao alterar a ordem do mesmo grupo, os índices são normalizados para posições compactas e persistidos.
- Ctrl/Cmd+Z desfaz, Ctrl/Cmd+Shift+Z e Ctrl+Y refazem. O atalho global ignora campos editáveis. A entrada em outra página limpa o histórico da folha anterior.
- O modo Visualizar oculta controles de edição e torna o papel inerte, mantendo conteúdo, tabs de navegação e paginação. O botão fixo “Sair da visualização” e Escape encerram o modo; não há gravação de estado ao alterná-lo.

## Validação

```text
npm run build
npm run lint
node --test tests/canvasGeometry.test.mjs
node tests/editor-browser.mjs
../backend/.venv/Scripts/python.exe tests/backend-contract.py
```

O teste de navegador usa Edge headless e uma API de teste em memória, isolada dos dados e contas reais. `EDITOR_TEST_BROWSER` permite escolher outro executável Chromium. Ele verifica inserção, seleção, arraste, gravação/leitura após reload, bloqueio, teclado, falha/retry, painéis, duas páginas, aros, limites com zoom, templates, tabs, Task Receipt, Study Planner, escrita direta, paginação e tela móvel. Capturas ficam em `frontend/test-results/`, ignorado pelo Git.

`backend-contract.py` executa as rotas FastAPI reais com autenticação, CSRF e um banco SQLite temporário em memória. Ele confirma os contratos de agendas/páginas, settings de tabs, CanvasElement, tarefas, widgets, perfil, eventos, estudos e upload. Não acessa a base PostgreSQL configurada, contas existentes ou mídia do usuário. Ainda falta a conferência manual em uma instalação completa com PostgreSQL e uma conta descartável.

O build ainda informa um bundle principal acima de 500 kB; a divisão por rotas fica para uma etapa própria.

## Fora desta etapa

- Migração completa de mídia e desenhos para um único renderer/Konva.
- Novos templates de seção, biblioteca avançada de templates e novos estilos de papelaria.
- Borracha por segmentos; o comportamento legado de apagar traços foi preservado.
- Sincronização colaborativa de marcadores e páginas.
- Recuperação offline durável: falhas são exibidas e podem ser reenviadas enquanto o editor está aberto.

## Correção pré-existente necessária ao build

`components/AgendaCard/AgendaCard.css` continha uma cópia de código TSX, tornando o CSS inválido. Foi restaurado o último stylesheet válido no histórico (`65b1fbf`), sem alterar o componente ou reescrever a Biblioteca. Nenhum arquivo do backend foi alterado.

Além dos módulos listados acima, foram adicionados `tests/editor-browser.mjs`, `tests/canvasGeometry.test.mjs` e este documento. `frontend/.gitignore` recebeu a entrada `test-results` para não versionar capturas de teste. Não houve commit ou push.
