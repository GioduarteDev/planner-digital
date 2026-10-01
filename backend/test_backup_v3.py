"""Backup V3 integration checks, called inside the isolated PostgreSQL runner."""
import json
from datetime import date, datetime, time, timezone

from sqlalchemy.orm import Session
from app import models as m


def verify_backup_v3(engine, request, current):
    previous = current[0]
    now = datetime.now(timezone.utc)
    today = date.today()
    snapshots = []
    for suffix in ('A', 'B'):
        with Session(engine) as db:
            def save(model, **values):
                row = model(**values)
                db.add(row)
                db.flush()
                return row

            user = save(m.User, email=f'backup-{suffix}@test.local', name=f'João {suffix} 🌿', password_hash='SECRET_PASSWORD', settings={'theme': 'matcha'})
            uid = user.id
            agenda = save(m.Agenda, user_id=uid, title='Revisão acadêmica', lock_pin_hash='SECRET_PIN')
            folder = save(m.Folder, agenda_id=agenda.id, title='Anotações')
            page = save(m.Page, agenda_id=agenda.id, folder_id=folder.id, title='Página 日本語', content='Café ☕')
            save(m.PageBlock, page_id=page.id, data={'text': 'Equações e ação'})
            media = save(m.MediaLibraryItem, user_id=uid, name='Foto São Paulo', stored_name=f'{suffix}.png', mime_type='image/png', size_bytes=42, file_url=f'/uploads/{suffix}.png')
            save(m.PageMedia, page_id=page.id, original_name='Foto.png', stored_name=f'page-{suffix}.png', mime_type='image/png', size_bytes=42, file_url=f'/uploads/page-{suffix}.png')
            save(m.CanvasElement, user_id=uid, page_id=page.id, surface_type='page', element_type='image', asset_url=media.file_url, data={'media_id': media.id})
            save(m.PageTemplate, user_id=uid, name='Modelo', template_data={'media': [{'file_url': media.file_url}]})
            subject = save(m.Subject, user_id=uid, name='Álgebra', professor='Márcia', semester='2026.2')
            project = save(m.Project, user_id=uid, subject_id=subject.id, title='Pesquisa')
            category = save(m.Category, user_id=uid, name='Educação')
            task = save(m.Task, user_id=uid, page_id=page.id, subject_id=subject.id, project_id=project.id, category_id=category.id, text='Conclusão', done=True, completed_at=now)
            event = save(m.Event, user_id=uid, subject_id=subject.id, project_id=project.id, category_id=category.id, title='Avaliação', starts_at=now, reminder_minutes=15)
            save(m.StudySession, user_id=uid, subject_id=subject.id, project_id=project.id, subject='Álgebra', study_date=today, duration_minutes=45)
            save(m.DailyEntry, user_id=uid, entry_date=today, quick_note='Ótimo!', water_ml=1250, photo_media_id=media.id)
            habit = save(m.Habit, user_id=uid, name='Ler', days_of_week=[0, 2], time_of_day=time(9, 30))
            save(m.HabitCompletion, habit_id=habit.id, completion_date=today)
            save(m.InboxItem, user_id=uid, text='Capturação', subject_id=subject.id, status='processed', processed_at=now, converted_type='task', converted_id=task.id)
            save(m.WeeklyReview, user_id=uid, week_start=today, priorities=['Ação', '', ''])
            save(m.Reminder, user_id=uid, habit_id=habit.id, minutes_before=10)
            save(m.Reminder, user_id=uid, event_id=event.id, minutes_before=15)
            preset = save(m.UserPreset, user_id=uid, preset_type='color', name='Verde', data={'color': '#abc'})
            save(m.StationeryKit, user_id=uid, name='Coleção', data={'media_item_ids': [media.id], 'preset_ids': [preset.id]})
            save(m.AuthSession, user_id=uid, session_key=f'SECRET_SESSION_{suffix}')
            db.commit()
            db.refresh(user)
            current[0] = user
            payload = request('GET', '/data/export')
            encoded = json.dumps(payload, ensure_ascii=False)
            assert json.loads(encoded) == payload
            assert payload['version'] == 3
            assert datetime.fromisoformat(payload['exported_at']).utcoffset() is not None
            assert payload['user']['name'] == f'João {suffix} 🌿'
            assert payload['pages'][0]['content'] == 'Café ☕'
            assert payload['user']['settings'] == {'theme': 'matcha'}
            for secret in ('SECRET_', 'password_hash', 'lock_pin_hash', 'session_key', 'auth_sessions', 'access_token', 'refresh_token'):
                assert secret not in encoded, secret
            collections = set(payload) - {'version', 'exported_at', 'user'}
            assert len(collections) == 22, collections
            assert all(payload[key] for key in collections)
            models = {
                'user': m.User, 'agendas': m.Agenda, 'folders': m.Folder,
                'pages': m.Page, 'page_blocks': m.PageBlock, 'page_media': m.PageMedia,
                'media_library': m.MediaLibraryItem, 'canvas_elements': m.CanvasElement,
                'page_templates': m.PageTemplate, 'tasks': m.Task, 'events': m.Event,
                'projects': m.Project, 'categories': m.Category, 'subjects': m.Subject,
                'study_sessions': m.StudySession, 'daily_entries': m.DailyEntry,
                'habits': m.Habit, 'habit_completions': m.HabitCompletion,
                'inbox_items': m.InboxItem, 'weekly_reviews': m.WeeklyReview,
                'reminders': m.Reminder, 'presets': m.UserPreset, 'stationery_kits': m.StationeryKit,
            }
            for key, model in models.items():
                row = payload[key] if key == 'user' else payload[key][0]
                expected = set(model.__table__.columns.keys()) - {'password_hash', 'lock_pin_hash'}
                assert expected <= row.keys(), (key, expected - row.keys())
            for key in collections:
                for row in payload[key]:
                    assert 'id' in row
                    if 'user_id' in row:
                        assert row['user_id'] == uid
            assert payload['pages'][0]['folder_id'] == payload['folders'][0]['id']
            assert payload['page_blocks'][0]['page_id'] == page.id
            assert payload['page_media'][0]['page_id'] == page.id
            assert payload['habit_completions'][0]['habit_id'] == habit.id
            assert payload['habits'][0]['time_of_day'] == '09:30:00'
            for key in ('tasks', 'events'):
                row = payload[key][0]
                assert (row['subject_id'], row['project_id'], row['category_id']) == (subject.id, project.id, category.id)
            assert payload['tasks'][0]['completed_at']
            assert payload['events'][0]['reminder_minutes'] == 15
            assert payload['projects'][0]['subject_id'] == subject.id
            assert payload['subjects'][0]['professor'] == 'Márcia'
            assert payload['inbox_items'][0]['converted_id'] == task.id
            assert payload['inbox_items'][0]['processed_at']
            assert any(r['habit_id'] == habit.id for r in payload['reminders'])
            assert payload['daily_entries'][0]['photo_media_id'] == media.id
            assert payload['daily_entries'][0]['water_ml'] == 1250
            assert payload['media_library'][0]['file_url'] == media.file_url
            snapshots.append(payload)
    for key in collections:
        assert {r['id'] for r in snapshots[0][key]}.isdisjoint(r['id'] for r in snapshots[1][key]), key
    current[0] = previous
    print('PASS: Backup V3 JSON, Unicode, 22 collections, relationships, file metadata, credential exclusion and two-user isolation')
