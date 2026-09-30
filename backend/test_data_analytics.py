"""Dashboard regression checks using the runner's disposable database schema."""
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import StudySession, Task, User


def verify_data_analytics(engine, request, current):
    previous = current[0]
    today = date.today()
    with Session(engine) as db:
        user = User(email='analytics@test.local', password_hash='unused')
        other = User(email='analytics-other@test.local', password_hash='unused')
        db.add_all([user, other])
        db.flush()
        for owner, minutes in ((user, 30), (user, 15), (other, 999)):
            db.add(StudySession(user_id=owner.id, subject='Math',
                                study_date=today, duration_minutes=minutes))
        for owner, done in ((user, True), (user, False), (other, True)):
            db.add(Task(user_id=owner.id, text='Task', done=done,
                        completed_at=datetime.combine(today, time(12), timezone.utc)))
        db.commit()
        db.refresh(user)
        current[0] = user
        try:
            for period in ('7days', 'current_month', 'previous_month'):
                result = request('GET', f'/data/analytics?period={period}')
                start = date.fromisoformat(result['start_date'])
                end = date.fromisoformat(result['end_date'])
                timeline = result['timeline']
                assert [day['date'] for day in timeline] == [
                    (start + timedelta(days=i)).isoformat()
                    for i in range((end - start).days + 1)
                ]
                assert sum(day['study_minutes'] for day in timeline) == result['studies']['total_minutes']
                assert sum(day['completed_tasks'] for day in timeline) == result['tasks']['completed']
                for day in timeline:
                    active = day['date'] == today.isoformat()
                    assert day['study_minutes'] == (45 if active else 0)
                    assert day['completed_tasks'] == (1 if active else 0)
        finally:
            current[0] = previous
    print('PASS: dashboard timeline, all periods, zero days, totals and user isolation')
