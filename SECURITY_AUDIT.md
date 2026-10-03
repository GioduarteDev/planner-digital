# Auditoria defensiva — Matcha Planner

Data: 02/10/2026. Escopo: código e alterações locais na branch `main`.
Sem commit, push, publicação, acesso a contas reais, push real ou exclusão de
arquivos reais. Testes usam SQLite, schemas PostgreSQL descartáveis, uploads
temporários, fixtures de navegador e DNS/HTTP simulados para Web Push.

## P1 encontrados e corrigidos

1. **Apropriação de agendas órfãs no primeiro cadastro público.**
   `app/routes/auth.py` atribuía todas as agendas com `user_id=NULL` ao primeiro
   inscrito, sem prova de ownership. Uma fixture com agenda órfã confirmou a
   atribuição indevida antes da correção. Foi removida apenas essa adoção automática.
   Os dados permanecem intactos e sem dono; recuperação legada requer procedimento
   administrativo autorizado. A regressão agora passa.
2. **JWT legado sem sessão revogável.** `app/security.py` aceitava tokens assinados
   sem `sid`; `get_current_user` ignorava a consulta de sessão nesse caso. Logout,
   revogação e troca de senha não invalidavam essas cópias até a expiração. A fixture
   confirmou a aceitação anterior. Agora `exp`, `sub` e `sid` são obrigatórios,
   e `sid` deve ser uma string não vazia. Novos logins já possuem esses campos;
   usuários com cookies legados precisam entrar novamente. Ausência de expiração
   também é rejeitada. Não houve mudança no banco nem no algoritmo de assinatura.

## Resultado por área

| Área | Status | Evidência | Severidade | Ação |
|---|---|---|---|---|
| Cadastro | Protegido após correção | Regressão de agenda órfã falhou antes e passou depois | P1 corrigido | Sem adoção pública de dados antigos |
| Senhas/login | Protegido | Argon2id, salts distintos, dummy hash, resposta uniforme e rate limit testados | — | Manter |
| JWT/sessões | Protegido após correção | Tokens inválidos/expirados/sem sid/sem exp rejeitados; revogação e replay HTTP testados | P1 corrigido | Novo login para cookies legados |
| Logout/troca de senha | Protegido | Replay após logout e sessão secundária após troca de senha retornam 401 | — | Sessão atual permanece ativa ao trocar senha |
| Cookies | Protegido no código | HttpOnly do JWT, Secure production, SameSite, Path, expiração e remoção testados | — | Validar comportamento no domínio real |
| CSRF | Protegido | Todos os handlers autenticados dependem de get_current_user; header ausente/incorreto retorna 403 | — | Usar planner_csrf; frontend lê esse nome fixo |
| IDOR/ownership | Protegido na cobertura | A/B em recursos principais, folders, blocks, canvas, library, habits, presets, kits, reminders e reviews | — | Manter regressões |
| Relações/duplicação | Protegido | IDs alheios em Task/Event/Study/Inbox/Reminder/DailyEntry/Canvas/receipt e duplicações rejeitados | — | Manter |
| Upload/download | Protegido com limites de cobertura | Allowlist raster, magic bytes, 10 MB por arquivo, UUID, downloads privados, traversal e SVG/HTML/EXE rejeitados | P2: decoder completo/quotas | Validar limite total do request no host |
| Exclusão física R2 | Protegido | Quatro regressões passam; cover_image_url não autoriza deleção | — | Manter |
| SSRF R3 | Protegido | Sete regressões passam; providers permitidos, todos IPs públicos, conexão fixada, TLS, redirects bloqueados, timeout 10 s | — | DNS depende do resolvedor do sistema |
| CORS | Protegido | Teste ASGI production aceita origem exata e rejeita prefixo malicioso, HTTP e outra origem | — | Configurar allowlist real |
| Headers | API protegida; frontend pendente | HSTS, nosniff, DENY, CSP, Referrer-Policy e Permissions-Policy verificados via ASGI | Deploy | Configurar headers do host estático |
| SQL injection | Protegido na inspeção | SQLAlchemy usa parâmetros; único text() da aplicação é SELECT 1; fixture de busca não provoca erro | — | Sem concatenação de SQL com input encontrada |
| XSS | Protegido na cobertura | Sem dangerouslySetInnerHTML/innerHTML no src; markup inofensivo em Task fica literal no navegador | P3 | Ampliar testes se adicionar rich text |
| Redirects/URLs | Protegido na inspeção | Redirecionamentos de auth são internos; clique de notificação abre /calendar; API não busca URLs de imagens | P3 | URLs externas de imagens podem gerar requests no navegador |
| Mass assignment | Protegido | Schemas excluem campos internos; teste envia user_id/password_hash/session_key e owner não muda | — | Manter schemas explícitos |
| Rate limit/DoS | Parcial; hardening pendente | Login/register limitados por IP/processo; JSON de canvas limitado; outros endpoints sem quotas globais | P2 | Proxy/body limits, quotas, limiter compartilhado |
| Secrets | Nenhum encontrado no estado versionável inspecionado | .env/chaves privadas ignorados; exemplos sem secrets; varredura sem imprimir valores | — | Não equivale a auditoria do histórico Git ou do host |
| Produção/debug | Protegido no código | Secure obrigatório; docs/redoc/openapi/db-health 404 em production; health funciona; debug=False | Deploy | Credenciais externas e HTTPS |
| Privacidade/Backup/Data/Search | Protegido na cobertura | Backup V3 exclui credenciais e sessões; testes A/B de backup, analytics e search passam | — | URLs/nomes de arquivos apenas no contexto autorizado |
| Dependências | Parcialmente validado | Imports/requirements/pip check passam; npm audit: zero vulnerabilidades; pip-audit não instalado | Validação | Checagem de CVEs Python pendente, sem instalar ferramenta |
| Erros | Protegido na inspeção/caminhos testados | HTTPException genéricas; FastAPI debug=False; sem detalhes SQL/path em respostas críticas verificadas | P3 | Validar observabilidade/redação de logs na hospedagem |

## Evidências executadas

- `python -m unittest test_auth_hardening test_push_security -v`: 10 testes PASS.
- `test_account_upload_ownership.py`: quatro testes PASS, SQLite e arquivos temporários.
- `test_release_security.py`: PASS com auth real, CSRF, brute-force controlado,
  revogação, replay, senha, isolamento ampliado, relações, traversal, MIME,
  mass assignment e schemas/migrations descartáveis.
- `test_academic_inbox.py`: PASS incluindo backup V3, analytics, ownership,
  conversões idempotentes e preservação de dados legados.
- `today-browser.mjs`: PASS incluindo texto HTML inofensivo renderizado literalmente.
- ASGI production sem lifespan/DB/network: PASS para CORS, headers, cookies,
  configuração e rotas desativadas.
- `compileall app`, imports, `pip check`, `npm audit` e `git diff --check`: PASS.
- Lint: zero erros e quatro warnings preexistentes de hooks em Tasks.
- Build: PASS com aviso preexistente de bundle maior que 500 KB.

## Limites e hardening P2/P3

- A validação de upload checa MIME/magic bytes, não decodifica a imagem inteira
  nem certifica ausência de conteúdo adicional/poliglotas. Raster/nosniff/CSP
  reduzem execução ativa; não houve evidência de execução de scripts nesses uploads.
- O limite de 10 MB é aplicado no handler após parsing multipart. Limites de body
  no ingress, armazenamento e concorrência precisam ser configurados; não foram
  feitos testes de exaustão. Quotas/rate limit de upload e notifications/test,
  paginação de listas e export são melhorias P2.
- O limiter é por processo/IP. Confiança em proxy, múltiplas instâncias e limites
  compartilhados dependem da topologia real. O cadastro informa e-mail já existente
  (enumeração de cadastro, P2); login usa mensagem uniforme e dummy hash.
- A proteção não impede uso de um cookie válido roubado antes de revogação. Ela
  impede reutilização depois de logout/revogação e invalida sessões secundárias
  na troca de senha; não foi demonstrada defesa formal contra todo timing side-channel.
- O timeout HTTP é de conexão/leitura, não um deadline total para DNS ou upload.
- Não foi executado scanner CVE Python nem auditoria histórica de secrets.
  Não se afirma que toda dependência está livre de CVEs.
- Os testes não substituem validação de HTTPS, cookies entre sites, CSP do frontend,
  storage privado, logs, backups e limites na plataforma definitiva.

## Conclusão

Não encontrei vulnerabilidade P0/P1 conhecida restante no código auditado após
as duas correções com regressão. Configuração e validação reais de deploy continuam
pendentes. Isso não significa prova de ausência de toda vulnerabilidade.
