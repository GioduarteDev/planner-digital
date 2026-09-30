# Central Acadêmica, Inbox, Prazos e Revisão Semanal

## Base preservada e lacunas encontradas

Já existiam Subject e seu CRUD, Project/Category, Task/Event/StudySession, rotas de leitura/edição, relacionamentos parciais com Subject, CRUD backend da Inbox e a migration `c8f5a0b4ad79`. Organização já tinha os formulários de projetos, categorias e matérias. Essas entidades e operações foram reaproveitadas.

Faltavam a interface acadêmica agregada, captura global, listagem/conversão da Inbox, professor/período, comprovantes de conversão e a reconciliação da migration pendente. Prazos e Revisão Semanal foram acrescentados conforme o pedido seguinte.

## Banco e migrations

O histórico tinha duas ramificações saindo de `8a1f4c7d2e90`: a cadeia existente terminava em `717bc4ba7ad7`, e a migration acadêmica terminava em `c8f5a0b4ad79`. O banco estava apenas em `717bc4ba7ad7`.

- `a924001_merge_academic.py`: merge dos dois heads, sem reescrever o histórico.
- `a924002_academic_metadata.py`: campos opcionais `Subject.professor`, `Subject.semester`, `InboxItem.processed_at`, `converted_type`, `converted_id`.
- `a925001_weekly_reviews.py`: `Task.completed_at` opcional e tabela `weekly_reviews`, única por usuário/segunda-feira.
- `c8f5a0b4ad79` foi aplicada como existente, criando Inbox e os vínculos de Task/Event/Project. `StudySession.subject_id` já existia fisicamente e foi preservado.

O último estado confirmado no banco e na árvore foi `a925001`, um único head. O teste percorre toda a cadeia em schema vazio e também verifica o upgrade com um registro legado inserido antes do merge. Nenhuma tabela existente foi recriada ou esvaziada.

## Funcionalidades

**Central Acadêmica:** entrada padrão de Organização; matérias com professor/período, filtro de semestre, totais, projetos ativos, tempo estudado, próximos eventos e prazos; detalhe com entregas, eventos/lembretes, projetos/tarefas e estudos; conclusão de Task real; criação e associação dos quatro tipos reais; cronologia e estados vazios/erro/carregamento. Seletores de matérias também foram integrados a Tasks, Calendar, Studies e formulário de projetos.

**Inbox:** botão global `＋ Capturar`, diálogo compacto, texto obrigatório e detalhes opcionais, Enter/Shift+Enter, listagem por status, edição/exclusão, conversão para Task/Event/StudySession/Project e nota mantida na própria captura. Conversão transacional com bloqueio de linha, IDs reais, isolamento por usuário e comprovante reutilizado em tentativas repetidas. Eventos sem horário usam dia inteiro; estudos pedem duração/data/matéria quando ausentes. Textos maiores que o limite do destino geram erro explicativo, sem truncamento silencioso.

**Prazos:** rota `/deadlines`, leitura de Tasks/Events/Projects reais, agrupamento por dia civil local, ordenação, contexto por IDs, links e conclusão direta de Task. Tasks concluídas/projetos arquivados ou concluídos não aparecem como pendentes. Eventos de dias passados não são tratados como tarefas atrasadas sem um status de pendência que não existe no modelo.

**Revisão Semanal:** rota `/weekly-review`, segunda a domingo, identificação ISO da semana, navegação anterior/atual/próxima, indicadores reais, pendências, próximos prazos, dedicação por matéria e atividade de projetos. Três prioridades, reflexão e objetivo persistidos no backend por semana/usuário. Salva pelo botão e antes da navegação entre semanas. Conclusões novas usam `completed_at`; as antigas não recebem datas fictícias.

## Endpoints

- Novo: `POST /inbox/{item_id}/convert`.
- Novos: `GET /weekly-reviews/{week_start}` e `PUT /weekly-reviews/{week_start}`.
- Ampliados: schemas/respostas de Subjects e Inbox, `PATCH /tasks/{id}` para data real de conclusão.
- Preservados: CRUD de `/tasks`, `/events`, `/studies`, `/projects`, `/subjects`, `/categories` e `/inbox`.
- A auditoria posterior corrigiu leitura canônica de matérias em Studies/Busca, exportação e alguns caminhos de atualização. Detalhes em [AUDITORIA_FONTE_UNICA.md](AUDITORIA_FONTE_UNICA.md).

## Arquivos da implementação

Backend: `app/models.py`, `app/schemas.py`, `app/main.py`, `app/routes/inbox.py`, `subjects.py`, `tasks.py`, `weekly_reviews.py`, as três revisions acima e `test_academic_inbox.py`.

Frontend: `src/App.tsx`, `components/AppShell.tsx`, `QuickCapture.tsx/.css`, `SubjectPicker.tsx`, `pages/Inbox/InboxPage.tsx`, `pages/Organization/AcademicCenter.tsx/.css`, `OrganizationPage.tsx`, `TasksPage.tsx`, `CalendarPage.tsx`, `StudiesPage.tsx`; `pages/Planning/{planningModel.ts,usePlanningData.ts,DeadlineList.tsx,DeadlinesPage.tsx,WeeklyReviewPage.tsx,Planning.css}`; testes `academic-browser.mjs` e `planning.test.mjs`.

O CSS visual existente de AppShell não foi redesenhado. Alterações da usuária e checkpoints feitos durante a sessão foram preservados.

## Validação realizada

- PostgreSQL/FastAPI reais em schema temporário: CRUD, cinco conversões, concorrência, repetição sem duplicatas, ownership, validação 404/409/422, persistência, FKs e cadeia de migrations.
- Navegador com API real isolada: duas matérias, metadados, totais, conclusão, criação/edição da Inbox, cinco destinos, F5, telas de destino, layout móvel e recuperação de erro.
- Prazos: ontem, hoje, amanhã, +3, +7 e +10 dias; mudança de data e conclusão.
- Revisão: salvar, trocar semana, voltar, salvar automaticamente ao navegar, atualizar indicador de conclusão e F5.
- Testes de calendário, virada de ano ISO, fuso local, deduplicação e agregação de estudos; regressões de editor, Biblioteca e Today.
- Build, lint e compileall executados. O build apresenta apenas o aviso de chunk acima de 500 kB.

O fechamento dos testes cruzados adicionais solicitados na auditoria está documentado no relatório de auditoria, sem confundir uma execução interrompida com uma execução aprovada.
