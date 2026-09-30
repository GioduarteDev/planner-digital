# Auditoria de integridade — Matcha Planner

Escopo: código atual, banco PostgreSQL, migrations e fluxos reais das telas. Nenhum commit ou push foi feito pelo agente. Nenhuma migration foi criada para as correções desta auditoria; `a925001` pertence à implementação anterior da Revisão Semanal.

## OK — fonte única confirmada

| Registro | Leituras / representações | Gravação real |
|---|---|---|
| Task | Tasks e seu recibo visual, Today, Calendar, Central Acadêmica, Prazos, Revisão Semanal, Busca e recibos nas agendas | `/tasks`, `/tasks/{id}`; a agenda também cria em `/pages/{id}/tasks`, na mesma tabela |
| Event | Calendar, Today, AppShell, ReminderWatcher, Busca, Central Acadêmica, Prazos e Revisão Semanal | `/events`, `/events/{id}` |
| StudySession | Studies, Today, Central Acadêmica, Busca, Revisão Semanal e exportação em Dados | `/studies`, `/studies/{id}` |
| Project / Subject | Organização e seletores/vínculos das outras telas | `/projects`, `/subjects` e respectivos IDs |
| InboxItem | Captura e histórico de conversão | `/inbox`; `/inbox/{id}/convert` cria a entidade original e grava apenas o comprovante da conversão |
| Habit / HabitCompletion | Today, indicadores da Revisão Semanal e Backup V3; Reminder pode referenciar `habit_id` | `/habits`, `/habits/{id}/completions/{date}`, `/habit-completions`; tabelas `habits` e `habit_completions` |

- `CalendarTask`, `PlannerTask`, itens de Prazos e os agregados semanais são projeções em memória de IDs reais. Não são persistidos como tarefas independentes.
- `TaskReceipt` guarda `taskIds` no canvas e obtém texto/conclusão das Tasks reais. O recibo visual de Tasks calcula totais do mesmo array vindo de `/tasks`.
- `localStorage` contém dados de apresentação/autenticação legada, cidade do clima, posição do post-it da Biblioteca e assinaturas de notificações já exibidas. Não foram encontrados arrays de Tasks/Events/Studies persistidos ali como segunda fonte.
- A Inbox usa bloqueio de linha e commit único para a entidade e `status`, `processed_at`, `converted_type`, `converted_id`. Requisições repetidas ao mesmo destino devolvem o mesmo comprovante; outro destino retorna 409. Exclusão da captura não exclui a entidade convertida.
- Ownership é validado em Tasks, Events, Studies, Projects, Subjects e Inbox. FKs de `subject_id` foram confirmadas em `tasks`, `events`, `study_sessions`, `projects` e `inbox_items`.
- A inspeção inicial do banco real encontrou zero divergências de nomes de estudos vinculados, zero datas de tarefa divergentes pelo fuso do banco, zero vínculos de matéria entre usuários diferentes e zero sobreposições entre lembrete legado e Reminder push no mesmo intervalo.

## ATENÇÃO — compatibilidade / duplicação intencional

### Estudos

`StudySession.subject_id` é a relação prioritária. `subject` continua existindo como texto de compatibilidade e para sessões avulsas. A resposta `/studies` continua com a mesma forma, mas resolve `subject` pelo nome atual de Subject quando há vínculo. O texto livre é usado quando não há relação.

### Lembretes

- `Event.reminder_minutes` ainda é editado pelo Calendário e lido por AppShell, ReminderWatcher e `process_legacy_event_reminders`.
- `Reminder` permite múltiplos intervalos/canais e possui rotas próprias. O worker usa `process_multiple_reminders` para registros push habilitados.
- Os comprovantes diferem: `EventReminderDelivery` no legado; `sent_for_signature` em Reminder. O navegador também mantém assinatura local para não repetir seu aviso.
- Não foi removida nem convertida automaticamente nenhuma representação. Remover o legado agora quebraria a configuração e leitura existentes no frontend.
- A Central Acadêmica mostra ambos os tipos existentes. Um mesmo evento pode deliberadamente ter mais de um lembrete.

### Outros dados de aparência semelhante

- Study Planner, Daily Planner e campos de templates do canvas são anotações livres; não são cópias automáticas de StudySessions ou Tasks. Não foi feita promoção automática desses textos para entidades.
- `SectionTemplates.tsx`, seção `habit-tracker`, também guarda nomes/marcações livres em `CanvasElement.data`, sem IDs de Habit. É um quadro manual independente; não participa dos totais de hábitos reais. Foi preservado para não apagar anotações da usuária. Os templates decorativos de hábitos seguem a mesma distinção.
- Duplicar uma agenda/página é uma ação explícita de cópia: cria novos IDs e remapeia os recibos. Isso difere da sincronização entre telas do mesmo registro.
- O texto da Inbox processada é o histórico original da captura; o registro de destino continua sendo editado pela própria API/tela. `converted_id` é uma referência polimórfica histórica e pode apontar para uma entidade posteriormente excluída.
- Tasks concluídas antes da criação de `completed_at` não recebem datas inventadas. A Revisão Semanal identifica o caso legado separadamente.
- `due_date` é dia civil; `due_at` é um instante. Seus textos podem diferir na virada do dia em UTC. Uma data civil explicitamente enviada não é substituída pela data UTC.

## CORRIGIDO — problemas reais encontrados

1. **Nome de matéria divergente em estudos.** Resolução canônica pelo relacionamento; busca por nome atual; edição preserva a prioridade do ID; renomear atualiza o texto de compatibilidade; desvincular/excluir preserva o último nome legível. Não foi removido o suporte a sessões avulsas.
2. **Busca retornando 500.** Adicionado import ausente de `MediaLibraryItem`. Trocado `DISTINCT` da linha inteira por `DISTINCT ON (Page.id)`, pois PostgreSQL não compara igualdade de colunas JSON.
3. **Today e recibo de agenda ignoravam a resposta do PATCH.** Agora incorporam os valores confirmados pela API após a atualização otimista. Today recebe inclusive `completed_at`.
4. **Prazo com data e horário divergindo após reagendamento.** Alterar apenas `due_date` move o dia de `due_at`, preservando seu horário/fuso; remover a data remove também o timestamp. Um timestamp sem dia explícito fornece o dia inicial.
5. **Exportação incompleta.** Incluídos vínculos acadêmicos, conclusão, metadados de Subject, lembrete legado, Inbox e revisões semanais; o nome de estudo exportado também é canônico.
6. **Cópia explícita de página perdia a matéria da Task.** Preservados `subject_id` e `completed_at`, mantendo novos IDs e remapeamento existentes.
7. **Lembrete de tarefa concluída.** O worker genérico passa a ignorar Tasks concluídas.
8. **Editar evento apagava `ends_at`.** O Calendário preserva a duração ao salvar título/data/horário.
9. **Links da Busca para organização.** Projetos, categorias e matérias agora abrem a seção/contexto correspondente.
10. **Verificações técnicas.** Corrigida a tipagem do elemento já validado como não nulo no post-it da Biblioteca, sem mudança visual. Fixtures de testes foram ajustadas ao nome exibido no painel atual, endpoint de diário usado atualmente e cores já existentes do rodapé.
11. **Receipt omitindo tarefas globais.** O editor consultava `/tasks`, mas descartava registros que não pertenciam às páginas da agenda atual. Agora o seletor/recibo também resolve essas tarefas reais; conclusão e reabertura usam `/tasks/{id}`. O estado adicional é apenas uma projeção em memória, reconstruída no carregamento. O canvas continua guardando exclusivamente os IDs escolhidos, sem copiar texto ou conclusão.

### Arquivos alterados nesta auditoria

| Arquivo | Alteração |
|---|---|
| `backend/app/models.py` | Propriedade de leitura canônica `StudySession.subject_name` |
| `backend/app/schemas.py` | Alias de leitura compatível para o nome do estudo |
| `backend/app/routes/studies.py` | Carregamento do vínculo, prioridade do ID, desvinculação e validação de nulos |
| `backend/app/routes/subjects.py` | Sincronização do texto legado ao renomear/excluir; validação de campos obrigatórios |
| `backend/app/routes/search.py` | Import, deduplicação compatível com JSON e estudo canônico |
| `backend/app/routes/tasks.py` | Consistência do prazo, validação e manutenção das transições de conclusão |
| `backend/app/routes/data_management.py` | Exportação dos campos e registros reais faltantes |
| `backend/app/routes/duplication.py` | Preservação de contexto na cópia explícita |
| `backend/app/routes/notifications.py` | Não lembrar tarefa já concluída |
| `frontend/src/pages/Today/TodayPage.tsx`, `todayData.ts` | Aplicação da resposta real de Task |
| `frontend/src/pages/Agenda/PageEditor.tsx` | Aplicação da resposta real de Task no recibo |
| `frontend/src/pages/Tasks/TasksPage.tsx` | Tipo de resposta incluindo `completed_at` |
| `frontend/src/pages/Calendar/CalendarPage.tsx` | Preservação de término/duração do evento |
| `frontend/src/pages/Search/SearchPage.tsx` | Destinos por tipo e ID |
| `frontend/src/pages/Organization/OrganizationPage.tsx` | Leitura da seção de categorias na URL |
| `frontend/src/pages/Library/LibraryPage.tsx` | Narrowing de HTMLElement para compilar callbacks existentes |
| `backend/test_academic_inbox.py` | Casos reais de integridade, exportação, busca e cópia no PostgreSQL isolado |
| `frontend/tests/integrity-browser.mjs` | Fluxos cruzados reais, navegação e F5 |
| `frontend/tests/academic-browser.mjs` | Integração da bateria cruzada e diagnóstico de diálogos/timeouts |
| `frontend/tests/today-browser.mjs`, `library-browser.mjs` | Fixtures/assertivas alinhadas ao comportamento atual, sem redesign |

## PENDENTE — decisões posteriores

- **Unificar a edição de lembretes:** requer decidir a UX de múltiplos lembretes e migrar clientes antigos. As duas rotinas push podem entregar dois avisos se ambos forem configurados com o mesmo intervalo; isso não ocorreu nos dados inspecionados. Nenhum envio real de push foi disparado pelos testes.
- **Histórico completo de atividade:** projetos usam timestamps atuais e registros vinculados, não um log de todas as alterações passadas. Não foi criado um sistema de eventos históricos nesta auditoria.
- **Atualização em tempo real entre abas:** navegação/recarregamento consultam a API; algumas centrais também recarregam ao recuperar foco. Não há assinatura WebSocket global. Isso não cria uma segunda persistência.
- **Bundle:** build mantém o aviso de chunk maior que 500 kB; não houve alteração de arquitetura de carregamento neste trabalho.

## Validação

O teste `backend/test_academic_inbox.py` cria um schema PostgreSQL temporário, percorre a cadeia desde a primeira migration, insere um dado legado antes do merge, aplica o head e remove somente seu próprio schema ao terminar. O navegador usa a API FastAPI real nesse schema, com identidade de teste injetada; não altera as contas da usuária nem testa o login real.

Comandos principais:

```powershell
cd backend
.venv/Scripts/python.exe test_academic_inbox.py --browser
.venv/Scripts/python.exe -m compileall -q app alembic
.venv/Scripts/python.exe -m alembic heads
.venv/Scripts/python.exe -m alembic current
cd ../frontend
node --test tests/canvasGeometry.test.mjs tests/templateEditing.test.mjs tests/planning.test.mjs
node tests/today-browser.mjs
npm run lint
npm run build
```

Resultados finais: a bateria PostgreSQL + API real + navegador passou, incluindo Tasks ↔ Today ↔ Prazos, Calendar → Today, Studies → Today/Central Acadêmica, mudanças de vínculo, IDs preservados, busca, exportação e F5. A Inbox passou em todas as conversões, repetição e concorrência sem duplicação, isolamento entre usuários, recuperação de erro e layouts responsivos. O schema temporário foi removido ao final.

Também passaram os testes de navegador de Today, Biblioteca e editor; os oito testes unitários de geometria/templates/planejamento; lint, build e compileall. O banco principal está em `a925001 (head)`. O build mantém apenas o aviso de tamanho do bundle mencionado acima. A autenticação real não integra esta validação: a tentativa separada do teste de login foi interrompida sem resultado conclusivo.

Os testes cruzados respeitam as projeções existentes: Today mostra os três próximos eventos e o total diário de estudos. A automação aguarda o carregamento das opções de matéria antes de preencher os seletores.

## Ampliação da auditoria — 27/09/2026

### Rastreabilidade dos consumidores

| Entidade / tabela | Consumidores e caminho de leitura |
|---|---|
| Task / `tasks` | `TasksPage`, `TodayPage`, `CalendarPage` e `PageEditor` consultam `/tasks`; `PlannerWidgets.TaskReceipt` recebe essa projeção e salva só `taskIds`; `AcademicCenter` consulta `/tasks`; `usePlanningData` abastece Prazos/Revisão Semanal com `/tasks`; Search e Data consultam o mesmo modelo pelo usuário. Inbox cria esse modelo; duplicação explícita cria novos IDs e remapeia referências. |
| Event / `events` | `CalendarPage`, `TodayPage`, `AcademicCenter`, `usePlanningData`, `AppShell` e `ReminderWatcher` consultam `/events`; Search, Data e workers de notificações leem `Event`. Reminders guardam o ID do evento, sem cópia persistente do título/data. |
| StudySession / `study_sessions` | `StudiesPage`, `TodayPage`, `AcademicCenter`, `usePlanningData` consultam `/studies`; Search e Data leem `StudySession`. O nome vinculado vem de `Subject`; o texto legado só é compatibilidade. |
| Project / `projects` | `OrganizationPage`, seletor de Tasks, `AcademicCenter` e `usePlanningData` consultam `/projects`; Data e Search consultam `Project`. Task/Event/StudySession mantêm `project_id`; Project mantém `subject_id`. |
| Subject / `subjects` | `OrganizationPage`, `AcademicCenter`, `usePlanningData`, `QuickCapture` e o `SubjectPicker` compartilhado em Tasks/Calendar/Studies/Projects consultam `/subjects`; Search/Data leem `Subject`. Os relacionamentos acadêmicos usam IDs. |
| Habit / `habits` | `todayData`/`TodayPage` consultam `/habits` e `/habit-completions`. Revisão Semanal consulta as conclusões pelo intervalo da semana. Data exporta ambos os modelos com IDs. Não há índice de Habit em Search nem domínio paralelo em Planning. |

Não foram encontradas cópias persistentes automáticas desnecessárias das seis entidades. As projeções React podem ser reconstruídas pela API. Os quadros manuais, o histórico da Inbox e as cópias explicitamente solicitadas pelo usuário foram preservados.

### Testes ampliados

- Task criada em Tasks e concluída em Today aparece concluída em Tasks, no Receipt de uma agenda e na Revisão Semanal.
- Reabrir no Receipt limpa `completed_at` na API e retira a tarefa das conclusões semanais; F5 mantém o estado. O JSON do canvas permanece `{taskIds: [id]}`.
- Evento editado no Calendário aparece em Today, Central Acadêmica, Prazos e Revisão Semanal, inclusive após F5.
- Estudo criado em Studies aparece em Today, Central Acadêmica e Backup V3. Mudanças de relacionamento persistem; renomear Subject/Project aparece nos seletores e visualizações aplicáveis, busca e exportação.
- Habit concluído em Today persiste após F5 e usa o mesmo registro de conclusão no indicador semanal e no backup.

As mudanças desta ampliação estão em `frontend/src/pages/Agenda/PageEditor.tsx`, `frontend/tests/integrity-browser.mjs` e neste relatório. Nenhum segundo domínio nem migration foi criado.

Resultado final desta ampliação: **todos os testes cruzados acima passaram**, incluindo hábitos, Receipt e F5, em navegador com API real e PostgreSQL isolado. Passaram também o teste completo do editor, oito testes unitários, lint, build, compileall e `git diff --check`. A cadeia de migrations foi executada desde o início no schema temporário; o banco principal e o único head continuam em `a925001`. O build conserva o aviso de bundle acima de 500 kB.

Limite funcional adicional encontrado ao mapear Habit: a API de Reminders aceita `habit_id`, mas `generic_reminder_target` atualmente resolve apenas Event/Task. Isso não duplica Habit, porém entrega push para hábitos não está implementada nesse worker. Não foi introduzido envio de notificações nesta auditoria. A sincronização entre telas foi validada por navegação/F5; atualização simultânea entre abas continua sem um mecanismo global, conforme a seção de pendências.
