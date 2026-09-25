# Matcha Planner — Backend Support Matrix

Audit date: 2026-09-20

| Feature | Storage / API | Status | Notes |
|---|---|---|---|
| Authentication | `users`, `auth_sessions`, `/auth/*` | SUPPORTED | HttpOnly cookie, CSRF for mutations, revocable sessions and password hashing. |
| Agenda | `agendas`, `/agendas` | SUPPORTED | Ownership, six-agenda limit, five initial pages, PIN and delete cascade. |
| Pages | `pages`, `/agendas/{id}/pages`, `/pages/{id}` | SUPPORTED | 400-page limit, favorites, paper settings, folder assignment and ordering. |
| Canvas | `canvas_elements`, `/canvas/elements` | SUPPORTED | Generic JSON data, geometry, rotation, z-index, lock, duplicate and ownership. |
| Text / post-it / washi / stamp / shape / arrow | `CanvasElement.element_type` + `data` | SUPPORTED | No type-specific table is required. JSON payload is limited to 64 KB. |
| Sticker / photo | `page_media`, `media_library_items`, optional Canvas asset | SUPPORTED | Private ownership, validated image signatures, 10 MB limit and safe generated filenames. |
| Official page templates | Frontend catalog + locked CanvasElement | FRONTEND ONLY | Static product design data; no database table is needed. |
| Page template configuration | `Page.paper_settings` + CanvasElement `template:*` | SUPPORTED | Supports orientation, single/spread metadata and custom visual settings. |
| User templates | `page_templates`, `/templates` | SUPPORTED | Existing snapshot implementation copies blocks, canvas assets and page media. |
| Section templates | `CanvasElement` with `section:*` / `template_section` data | SUPPORTED | Embedded sections remain generic canvas content. |
| Navigation sections | `folders`, `/agendas/{id}/folders` | SUPPORTED | Create, rename, reorder, delete, page assignment and ownership. |
| Page tabs | `Agenda.settings.page_tabs_v1` | SUPPORTED | Targets are validated against pages/folders in the same agenda; deletion prunes stale targets. |
| Task Receipt | CanvasElement referencing real task IDs | SUPPORTED | IDs are ownership-validated; tasks remain the source of truth and are remapped on duplication. |
| Tasks | `tasks`, `/tasks` | SUPPORTED | Page/standalone tasks, ownership, due-date/status filters and calendar visibility. |
| Calendar events | `events`, `/events` | SUPPORTED | Ownership and optional overlapping date-range filters. |
| Mini calendar | Existing events/tasks + CanvasElement layout | SUPPORTED | No second calendar is created. |
| Today current preferences | `User.settings` | SUPPORTED | City and other current preferences use recursive partial merge. Weather itself is not stored. |
| Daily moment history | `daily_entries`, `/daily-entries` | NEW | One row per user/date, GET/list/upsert/PATCH/delete, optional owned library photo. Frontend migration from `today_v2` settings remains pending. |
| Weather | Open-Meteo in frontend; city in settings | FRONTEND ONLY | No weather or precise GPS persistence. |
| Daily quotes | Local frontend catalog | FRONTEND ONLY | No quote table. |
| Habits | CanvasElement section data | PARTIAL | Template trackers persist. There is no product-wide habit domain or statistics API yet. |
| Studies | `study_sessions`, `/studies` | SUPPORTED | Manual sessions and statistics only; no timer or automatic YPT integration. |
| Agenda duplication | `/agendas/{id}/duplicate` | SUPPORTED | New IDs, copied pages/folders/content and remapped tab/task-receipt references. |
| Page duplication | `/pages/{id}/duplicate` | SUPPORTED | Copies paper, blocks, media, canvas, tasks and reminders with new IDs. |
| Profile settings | `User.settings`, `/profile/settings` | SUPPORTED | Recursive object merge; lists/scalars replace and JSON `null` is stored explicitly. |
| Autosave | Idempotent resource PATCH endpoints | SUPPORTED | Server uses last-write-wins. Client serialization remains responsible for response ordering. |
| Export | `/data/export` | SUPPORTED | Includes DailyEntry data as export format version 2. |

## Deliberate non-features

- No weather, quote, shape, color, icon, washi, stamp, post-it-style or official-template tables.
- No version history, CRDT, study timer or automatic habit system.
- No second task, calendar or section domain.

## Follow-up

- Move Today V2 reads and writes from `Profile.settings.today_v2` to `/daily-entries/{date}`. The backend endpoint is ready; the existing settings data is intentionally preserved.
- If global habit analytics become a confirmed product requirement, design a small habit/check-in domain before adding tables.
