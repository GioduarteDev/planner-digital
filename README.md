# Matcha Planner

Planner com React, TypeScript e Vite; API FastAPI, SQLAlchemy e PostgreSQL.

## Desenvolvimento

Pré-requisitos: Python 3.13, Node.js 22.18+ (ou 24+) e PostgreSQL. Crie um
banco e usuário PostgreSQL locais antes de aplicar migrations.

Na pasta `backend`:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Preencha as credenciais do banco e gere um `JWT_SECRET` aleatório próprio.
O backend lê `backend/.env`; variáveis do ambiente também são aceitas.
Depois:

```powershell
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m uvicorn app.main:app --reload
```

Na pasta `frontend`:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

`VITE_API_URL` é incorporada ao build. Variáveis `VITE_*` são públicas e nunca
devem conter secrets. Em Linux/macOS, use `.venv/bin/python` e `cp`.

## Validação

Frontend: `npm run lint`, `npm run build` e
`node --test tests/planning.test.mjs tests/templateEditing.test.mjs tests/canvasGeometry.test.mjs`.

Backend (na pasta `backend`):

```powershell
.venv/Scripts/python.exe -m compileall app
.venv/Scripts/python.exe -m pip check
.venv/Scripts/python.exe -B -m unittest test_account_upload_ownership test_push_security test_auth_hardening
.venv/Scripts/python.exe -B test_academic_inbox.py
.venv/Scripts/python.exe -B test_release_security.py
```

Os dois últimos runners criam schemas PostgreSQL descartáveis, removendo apenas
o próprio schema. Exigem permissão de criação de schema. O runner acadêmico
inclui backup V3, analytics e migrations; `--browser` adiciona testes acadêmicos
e de integridade em Chrome headless. Os demais testes antigos com URL fixa não
devem ser executados contra um banco com dados reais.

## Produção

A hospedagem ainda precisa ser definida. Configure banco e credenciais externos,
`JWT_SECRET` forte, `APP_ENV=production`, `COOKIE_SECURE=true`, origens HTTPS
explícitas em `CORS_ORIGINS` e `VITE_API_URL` antes do build. Use os nomes padrão
de cookies; o cliente espera `planner_csrf`. Se frontend e API estiverem em sites
diferentes, revise `COOKIE_SAMESITE=none` e a política de cookies do navegador.

Execute `alembic upgrade head` **antes** de iniciar a API. Use um processo gerenciado
de Uvicorn sem `--reload`. O worker de lembretes inicia com a API; inicialmente use
uma única instância/worker para evitar entregas concorrentes duplicadas.

Configure HTTPS, fallback de rotas SPA e security headers no host do frontend.
A API disponibiliza `/health`; docs e `/db-health` ficam desativados em produção.

Persista `backend/uploads` em armazenamento durável e mantenha backup do banco
e dos arquivos. Uploads devem ser servidos pelas rotas autenticadas da API,
nunca por um diretório público do host.

Para Web Push, gere chaves com `backend/generate_vapid_keys.py`, configure as
variáveis VAPID e preserve a chave privada fora do Git em armazenamento seguro.
Sem essas chaves, o planner funciona, mas notificações push ficam indisponíveis.
Não versione `.env`, chaves privadas ou credenciais.

JWTs antigos sem `sid` são rejeitados; esses usuários devem entrar novamente.
O cadastro público não assume agendas antigas sem dono. Se houver dados legados
órfãos, a atribuição exige uma migração administrativa com ownership comprovado.
