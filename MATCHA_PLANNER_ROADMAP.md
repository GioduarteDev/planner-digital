# Matcha Planner — roadmap do produto

Legenda: ⬜ pendente · 🟡 em implementação ou teste · ✅ aprovado pelo usuário. Compilação e testes não significam aprovação visual.

## Fase A — Editor V6.2

🟡 Seleção contextual de mídia e elementos; escrita direta; encadernação; Seções apenas no índice; contadores derivados dos catálogos; abas laterais persistentes; modelos de página; Korean Study Planner; recibo das tarefas reais; revisão de post-its, washi, carimbos, formas e setas; arquitetura incremental. Fluxos validados no navegador e contra as rotas FastAPI reais com banco isolado; revisão visual feita em desktop e celular. Aguarda aprovação visual do usuário.

## Fase B — Hoje V2

🟡 Saudação com nome real e horário; clima com permissão e cidade manual; frase estável por dia; mini calendário de eventos e tarefas; recibo de tarefas reais; foto do dia; Meu Momento com humor, música, leitura, acompanhamento e nota curta; estudo manual; compromissos próximos; composição responsiva de papelaria. Reutiliza `profile.settings`, `/tasks`, `/events`, `/studies` e `/library/media`. Fluxos validados no navegador e contra as rotas FastAPI reais com banco isolado; revisão visual feita em desktop, tablet e celular. Aguarda aprovação visual do usuário.

## Identidade e infraestrutura

🟡 Ícone oficial, nome, tokens de cor, sombra, espaçamento e radius, tipografia, microinterações, estados de foco, acessibilidade e zero gradientes decorativos. O contrato autenticado das rotas reais foi testado com banco temporário isolado. ⬜ Divisão natural do bundle e validação manual integrada com PostgreSQL.

## Demais módulos e funcionalidades

⬜ Biblioteca física: capa, crop, marcador, favoritos, recentes, busca, operações existentes, estados vazios e rodapé integrado. Preservar o limite de seis agendas e cinco páginas iniciais.

🟡 Agenda e páginas: máximo 400, criar, duplicar, excluir, renomear, mover, favoritar, Seções, autosave e duas folhas reais. ⬜ Miniaturas no índice e experiência de busca refinada.

⬜ Texto avançado: caixas independentes, tipografia, estilos favoritos, seleção, alinhamento e atalhos. ⬜ Desenho avançado: oito tipos de caneta, pressão, conta-gotas, favoritos, undo/redo e borracha por segmentos. 🟡 Régua flutuante.

🟡 Bibliotecas de formas, setas, post-its, washi e carimbos; mídia privada, stickers, recorte de cartela e fotos. ⬜ Edição avançada e unificação completa de camadas.

🟡 Templates de página, Task Receipt e Korean Study Planner implementados e testados em navegador isolado. ⬜ Templates de seção adicionais, busca e favoritos de templates. Validação com backend autenticado e aprovação visual do usuário pendentes.

⬜ Perfil expandido; login e registro ilustrados; integração visual do Calendário; melhorias de Organização, Papelaria e Dados; busca global integrada; rodapé e cartão da criadora. Não redesenhar esses módulos nas Fases A/B.

## Regras preservadas

🟡 Autenticação, isolamento por usuário, mídia privada, tarefas e calendário reais, autosave, favoritos, duplicações e ausência de histórico de versões. Nenhuma destas regras deve ser substituída por dados de demonstração na aplicação.
