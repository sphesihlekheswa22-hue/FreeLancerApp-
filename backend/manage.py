import os

from flask.cli import FlaskGroup
from werkzeug.security import generate_password_hash

from app import create_app, db
from app.models import (
    Application,
    Gig,
    Job,
    JobUpdate,
    Message,
    Notification,
    Profile,
    Review,
    User,
)
from app.notify import notify

app = create_app()
cli = FlaskGroup(create_app=create_app)


@cli.command("create-db")
def create_db():
    with app.app_context():
        db.create_all()
        print("Database tables created.")


@cli.command("reset-db")
def reset_db():
    """
    Delete SQLite DB file (if used) and recreate tables.
    """
    with app.app_context():
        uri: str = app.config.get("SQLALCHEMY_DATABASE_URI", "")
        if uri.startswith("sqlite:///"):
            filename = uri.replace("sqlite:///", "", 1)
            # Flask often stores relative sqlite DBs under the instance folder.
            candidates = [
                os.path.abspath(filename),
                os.path.join(app.instance_path, filename),
            ]
            deleted_any = False
            for path in candidates:
                if os.path.exists(path):
                    os.remove(path)
                    print(f"Deleted {path}")
                    deleted_any = True
            if not deleted_any:
                print(f"No sqlite file found for {filename} (checked: {candidates})")
        db.create_all()
        print("Database reset complete.")


@cli.command("seed")
def seed():
    """
    Seed the database with demo data (idempotent-ish).
    """
    with app.app_context():
        db.create_all()

        def ensure_notification(*, user_id: int, type: str, message: str, link: str | None = None) -> None:
            """
            Seed-safe wrapper around notify(): avoid duplicating identical notifications
            when seed is run multiple times.
            """
            msg = (message or "")[:300]
            existing = db.session.execute(
                db.select(Notification).where(
                    Notification.user_id == user_id,
                    Notification.type == type,
                    Notification.message == msg,
                    Notification.link == link,
                )
            ).scalar_one_or_none()
            if existing:
                return
            notify(user_id=user_id, type=type, message=msg, link=link)

        def get_or_create_user(
            *,
            name: str,
            email: str,
            password: str,
            role: str = "student",
            bio: str = "",
            skills: str = "",
            rating: int = 0,
            completed_jobs: int = 0,
            portfolio_url: str | None = None,
            hourly_rate: int | None = None,
            pricing_type: str = "fixed",
        ) -> User:
            email_norm = email.strip().lower()
            user = db.session.execute(
                db.select(User).where(User.email == email_norm)
            ).scalar_one_or_none()
            if user:
                # Keep existing user, but ensure profile exists & has sensible demo fields
                prof = db.session.get(Profile, user.id)
                if not prof:
                    prof = Profile(user_id=user.id)
                    db.session.add(prof)
                prof.bio = prof.bio or bio
                prof.skills = prof.skills or skills
                prof.rating = prof.rating or rating
                prof.completed_jobs = prof.completed_jobs or completed_jobs
                prof.portfolio_url = prof.portfolio_url or portfolio_url
                prof.hourly_rate = prof.hourly_rate or hourly_rate
                prof.pricing_type = prof.pricing_type or pricing_type
                if user.role != role:
                    user.role = role
                return user
            user = User(
                name=name.strip(),
                email=email_norm,
                password_hash=generate_password_hash(password),
                role=role,
            )
            db.session.add(user)
            db.session.flush()
            db.session.add(
                Profile(
                    user_id=user.id,
                    bio=bio,
                    skills=skills,
                    rating=rating,
                    completed_jobs=completed_jobs,
                    portfolio_url=portfolio_url,
                    hourly_rate=hourly_rate,
                    pricing_type=pricing_type,
                )
            )
            return user

        # --- Users (mix of freelancers + clients + admin) ---
        alice = get_or_create_user(
            name="Alice Designer",
            email="alice@campus.test",
            password="Password123!",
            role="student",
            bio="Branding & poster design for student events. Fast turnarounds, clean layouts.",
            skills="logo design, posters, figma, canva, brand identity",
            rating=5,
            completed_jobs=7,
            portfolio_url="https://example.com/alice-portfolio",
            hourly_rate=25,
            pricing_type="fixed",
        )
        bob = get_or_create_user(
            name="Bob Developer",
            email="bob@campus.test",
            password="Password123!",
            role="student",
            bio="Frontend + API dev. I build reliable apps and clean dashboards.",
            skills="react, typescript, flask, sqlite, ui, api",
            rating=5,
            completed_jobs=5,
            portfolio_url="https://example.com/bob-projects",
            hourly_rate=35,
            pricing_type="hourly",
        )
        chloe = get_or_create_user(
            name="Chloe Writer",
            email="chloe@campus.test",
            password="Password123!",
            role="student",
            bio="Academic writing support: proofreading, structure, clarity, citations.",
            skills="proofreading, editing, research, summarizing, cv writing",
            rating=4,
            completed_jobs=9,
            portfolio_url="https://example.com/chloe-writing",
            hourly_rate=20,
            pricing_type="fixed",
        )
        dylan = get_or_create_user(
            name="Dylan Tutor",
            email="dylan@campus.test",
            password="Password123!",
            role="student",
            bio="Patient CS tutor. Python, data structures, exam prep.",
            skills="python, tutoring, algorithms, debugging",
            rating=5,
            completed_jobs=12,
            portfolio_url=None,
            hourly_rate=18,
            pricing_type="hourly",
        )
        emma = get_or_create_user(
            name="Emma Client",
            email="emma@campus.test",
            password="Password123!",
            role="student",
            bio="I post gigs for my club and coursework deadlines.",
            skills="",
        )
        admin = get_or_create_user(
            name="Admin",
            email="admin@campus.test",
            password="Password123!",
            role="admin",
            bio="Platform admin account.",
            skills="",
        )

        # Additional realistic accounts (more variety for lists / search / messaging)
        fatima = get_or_create_user(
            name="Fatima Data Analyst",
            email="fatima@campus.test",
            password="Password123!",
            role="student",
            bio="Data cleanup + dashboards for student projects. Excel, Python, basic BI.",
            skills="excel, python, pandas, data cleaning, dashboards, power bi",
            rating=5,
            completed_jobs=6,
            portfolio_url="https://example.com/fatima-data",
            hourly_rate=22,
            pricing_type="hourly",
        )
        noah = get_or_create_user(
            name="Noah Video Editor",
            email="noah@campus.test",
            password="Password123!",
            role="student",
            bio="Short-form video edits for clubs and events. Clean cuts, captions, and music sync.",
            skills="capcut, premiere, after effects, captions, reels, tiktok",
            rating=4,
            completed_jobs=10,
            portfolio_url="https://example.com/noah-edits",
            hourly_rate=20,
            pricing_type="fixed",
        )
        priya = get_or_create_user(
            name="Priya UX Researcher",
            email="priya@campus.test",
            password="Password123!",
            role="student",
            bio="UX audits, quick user testing, and UI improvements for web/mobile apps.",
            skills="ux research, ui, figma, usability testing, wireframes",
            rating=5,
            completed_jobs=4,
            portfolio_url="https://example.com/priya-ux",
            hourly_rate=30,
            pricing_type="hourly",
        )
        zanele = get_or_create_user(
            name="Zanele Photographer",
            email="zanele@campus.test",
            password="Password123!",
            role="student",
            bio="Event + portrait photography. Natural edits and fast delivery.",
            skills="photography, lightroom, portraits, events, editing",
            rating=5,
            completed_jobs=13,
            portfolio_url="https://example.com/zanele-photos",
            hourly_rate=40,
            pricing_type="fixed",
        )
        liam = get_or_create_user(
            name="Liam Client",
            email="liam@campus.test",
            password="Password123!",
            role="student",
            bio="I run a student startup booth. I often need quick design and web tasks.",
            skills="",
        )
        sara = get_or_create_user(
            name="Sara Club President",
            email="sara@campus.test",
            password="Password123!",
            role="student",
            bio="Organizing campus events — I post jobs for flyers, photos, and social media.",
            skills="",
        )

        def ensure_gig(user: User, *, title: str, category: str, price: int, description: str):
            existing = db.session.execute(
                db.select(Gig).where(Gig.user_id == user.id, Gig.title == title)
            ).scalar_one_or_none()
            if existing:
                return existing
            g = Gig(
                title=title,
                description=description,
                category=category,
                price=price,
                user_id=user.id,
            )
            db.session.add(g)
            return g

        # --- Gigs (freelancer services) ---
        gig_logo = ensure_gig(
            alice,
            title="I will design a modern logo",
            category="Design",
            price=150,
            description="Clean, modern logo concepts with revisions included.",
        )
        gig_web = ensure_gig(
            bob,
            title="I will build a simple website",
            category="Development",
            price=500,
            description="Responsive website (React) for a student club or portfolio.",
        )
        gig_proof = ensure_gig(
            chloe,
            title="I will proofread your essay",
            category="Writing",
            price=80,
            description="Grammar + clarity improvements within 24 hours.",
        )
        ensure_gig(
            dylan,
            title="I will tutor you in Python (1 hour)",
            category="Tutoring",
            price=25,
            description="One hour tutoring session: fundamentals, debugging, or assignments. Online call.",
        )
        ensure_gig(
            alice,
            title="I will design a flyer/poster for your event",
            category="Graphic Design",
            price=120,
            description="A4/A3 poster design for club events. Includes print-ready PDF + social media sizes.",
        )
        ensure_gig(
            fatima,
            title="I will clean and analyze your dataset",
            category="Data",
            price=180,
            description="Cleaning, summary stats, and charts. Includes a short insights report.",
        )
        ensure_gig(
            fatima,
            title="I will build an Excel dashboard",
            category="Data",
            price=160,
            description="Interactive Excel dashboard with pivot tables and clear visuals.",
        )
        ensure_gig(
            noah,
            title="I will edit a 30–60s reel with captions",
            category="Video",
            price=90,
            description="Fast-paced edit with captions, music sync, and color tweaks. 1 revision included.",
        )
        ensure_gig(
            priya,
            title="I will do a UX audit of your app",
            category="UX",
            price=220,
            description="Heuristic review + actionable improvements. Includes annotated screenshots.",
        )
        ensure_gig(
            zanele,
            title="I will shoot event photos (2 hours)",
            category="Photography",
            price=300,
            description="Coverage + edited gallery delivered in 48 hours. Great for club events.",
        )

        def ensure_job(user: User, *, title: str, budget: int, description: str, deadline: str | None, category: str):
            existing = db.session.execute(
                db.select(Job).where(Job.user_id == user.id, Job.title == title)
            ).scalar_one_or_none()
            if existing:
                return existing
            j = Job(
                title=title,
                description=description,
                budget=budget,
                deadline=deadline,
                category=category,
                status="open",
                progress=0,
                in_progress_notes="",
                user_id=user.id,
            )
            db.session.add(j)
            return j

        # --- Jobs (clients requesting work) ---
        job_poster = ensure_job(
            emma,
            title="Need a poster for a campus event",
            budget=200,
            description="A4 poster, bold typography, include event date/time and venue.",
            deadline="Friday",
            category="Graphic Design",
        )
        job_tutor = ensure_job(
            emma,
            title="Looking for Python tutoring",
            budget=250,
            description="Help me understand functions, lists, and file reading.",
            deadline="Next week",
            category="Tutoring",
        )
        job_portfolio = ensure_job(
            emma,
            title="Build a personal portfolio website (React)",
            budget=600,
            description="A modern one-page portfolio with projects section + contact form. Deployed.",
            deadline="2 weeks",
            category="Web Development",
        )
        job_social_reels = ensure_job(
            sara,
            title="Edit 3 Instagram reels for our club",
            budget=300,
            description="We have raw clips from an event. Need 3 short reels with captions and music.",
            deadline="This weekend",
            category="Video",
        )
        job_event_photos = ensure_job(
            sara,
            title="Photographer needed for campus event (2 hours)",
            budget=350,
            description="Evening event photos: candid + group shots. Please share sample work.",
            deadline="Next Friday",
            category="Photography",
        )
        job_excel_dashboard = ensure_job(
            liam,
            title="Create an Excel budget tracker dashboard",
            budget=200,
            description="Track monthly expenses and show charts. Needs to be easy for non-technical users.",
            deadline="5 days",
            category="Data",
        )
        job_ux_audit = ensure_job(
            liam,
            title="UX audit for our landing page",
            budget=250,
            description="Quick UX audit: improve clarity, call-to-action, and layout. Suggestions are enough.",
            deadline="1 week",
            category="UX",
        )
        job_cv = ensure_job(
            emma,
            title="Proofread my CV and cover letter",
            budget=120,
            description="Need proofreading + better phrasing. Please keep it professional and concise.",
            deadline="3 days",
            category="Writing",
        )

        # Give the DB ids if new
        db.session.flush()

        def ensure_application(
            *,
            job: Job,
            freelancer: User,
            proposal: str,
            expected_price: int,
            estimated_time: str,
            status: str = "pending",
        ) -> Application:
            existing = db.session.execute(
                db.select(Application).where(
                    Application.job_id == job.id,
                    Application.freelancer_id == freelancer.id,
                )
            ).scalar_one_or_none()
            if existing:
                existing.proposal = existing.proposal or proposal
                existing.expected_price = existing.expected_price or expected_price
                existing.estimated_time = existing.estimated_time or estimated_time
                existing.status = existing.status or status
                return existing
            a = Application(
                job_id=job.id,
                freelancer_id=freelancer.id,
                proposal=proposal,
                expected_price=expected_price,
                estimated_time=estimated_time,
                status=status,
            )
            db.session.add(a)
            ensure_notification(
                user_id=job.user_id,
                type="application_received",
                message=f"New proposal received for '{job.title}'.",
                link="/applications",
            )
            return a

        # --- Applications (to make Applications/Messages/Notifications pages feel real) ---
        app1 = ensure_application(
            job=job_poster,
            freelancer=alice,
            proposal="I can deliver 2 poster concepts today + final print-ready file. Includes social sizes.",
            expected_price=180,
            estimated_time="2 days",
            status="shortlisted",
        )
        app2 = ensure_application(
            job=job_poster,
            freelancer=chloe,
            proposal="I can help with the copy and layout notes. If you already have a designer, I’ll refine text.",
            expected_price=90,
            estimated_time="1 day",
            status="pending",
        )
        app3 = ensure_application(
            job=job_tutor,
            freelancer=dylan,
            proposal="Happy to tutor you. We’ll do exercises + homework walkthrough. I’ll share notes after.",
            expected_price=220,
            estimated_time="3 sessions",
            status="accepted",
        )
        app4 = ensure_application(
            job=job_portfolio,
            freelancer=bob,
            proposal="I’ll build a clean React portfolio (projects, skills, contact) and deploy it for you.",
            expected_price=550,
            estimated_time="7-10 days",
            status="accepted",
        )
        ensure_application(
            job=job_cv,
            freelancer=chloe,
            proposal="I’ll proofread and rewrite key sections to sound confident and professional. Track changes included.",
            expected_price=110,
            estimated_time="1-2 days",
            status="accepted",
        )
        ensure_application(
            job=job_excel_dashboard,
            freelancer=fatima,
            proposal="I’ll build a simple tracker + dashboard with categories, filters, and monthly summaries.",
            expected_price=190,
            estimated_time="3-4 days",
            status="accepted",
        )
        ensure_application(
            job=job_ux_audit,
            freelancer=priya,
            proposal="I’ll do a heuristic review and provide prioritized fixes + copy suggestions for the hero.",
            expected_price=240,
            estimated_time="2 days",
            status="shortlisted",
        )
        ensure_application(
            job=job_event_photos,
            freelancer=zanele,
            proposal="I can cover the event and deliver an edited gallery. I’ll also capture 10 portrait shots.",
            expected_price=340,
            estimated_time="2 hours + edits",
            status="accepted",
        )
        ensure_application(
            job=job_social_reels,
            freelancer=noah,
            proposal="I’ll cut 3 reels with captions and music. You’ll get drafts first, then final exports.",
            expected_price=290,
            estimated_time="2-3 days",
            status="accepted",
        )

        # Reflect realistic job progress for accepted jobs
        job_tutor.status = "in_progress"
        job_tutor.progress = max(job_tutor.progress, 35)
        job_tutor.in_progress_notes = job_tutor.in_progress_notes or "Session 1 done. Next: lists + file I/O."

        job_portfolio.status = "in_progress"
        job_portfolio.progress = max(job_portfolio.progress, 55)
        job_portfolio.in_progress_notes = (
            job_portfolio.in_progress_notes
            or "Homepage + projects section built. Next: contact form + deploy."
        )
        job_excel_dashboard.status = "in_progress"
        job_excel_dashboard.progress = max(job_excel_dashboard.progress, 40)
        job_excel_dashboard.in_progress_notes = (
            job_excel_dashboard.in_progress_notes
            or "Built tracker sheet; next: charts + category breakdown."
        )
        job_social_reels.status = "in_progress"
        job_social_reels.progress = max(job_social_reels.progress, 25)
        job_social_reels.in_progress_notes = job_social_reels.in_progress_notes or "Drafted first reel with captions."
        job_event_photos.status = "open"  # still upcoming event
        job_cv.status = "completed"
        job_cv.progress = max(job_cv.progress, 100)

        def ensure_job_update(job: Job, *, note: str, progress: int) -> JobUpdate:
            existing = db.session.execute(
                db.select(JobUpdate).where(JobUpdate.job_id == job.id, JobUpdate.note == note)
            ).scalar_one_or_none()
            if existing:
                return existing
            u = JobUpdate(job_id=job.id, note=note, progress=progress)
            db.session.add(u)
            ensure_notification(
                user_id=job.user_id,
                type="job_update",
                message=f"Update on '{job.title}': {note}",
                link=f"/jobs/{job.id}",
            )
            return u

        ensure_job_update(job_tutor, note="Booked first tutoring session and shared starter exercises.", progress=15)
        ensure_job_update(job_tutor, note="Covered functions + lists. Homework assigned for file reading.", progress=35)
        ensure_job_update(job_portfolio, note="Wireframe approved; started building components.", progress=25)
        ensure_job_update(job_portfolio, note="Projects section done; added responsive layout.", progress=55)
        ensure_job_update(job_excel_dashboard, note="Collected example expense categories and drafted template.", progress=15)
        ensure_job_update(job_excel_dashboard, note="Added pivot tables and a monthly summary dashboard.", progress=40)
        ensure_job_update(job_social_reels, note="Picked music and caption style; created a draft reel.", progress=25)

        def ensure_message(*, sender: User, receiver: User, text: str):
            existing = db.session.execute(
                db.select(Message).where(
                    Message.sender_id == sender.id,
                    Message.receiver_id == receiver.id,
                    Message.message_text == text,
                )
            ).scalar_one_or_none()
            if existing:
                return existing
            m = Message(sender_id=sender.id, receiver_id=receiver.id, message_text=text)
            db.session.add(m)
            ensure_notification(
                user_id=receiver.id,
                type="message",
                message=f"New message from {sender.name}.",
                link="/messages",
            )
            return m

        # --- Messages (so inbox/chat is not empty) ---
        ensure_message(sender=emma, receiver=bob, text="Hi Bob — can you deploy the portfolio on Netlify or Vercel?")
        ensure_message(sender=bob, receiver=emma, text="Yes, I can deploy on Vercel and share the link + repo.")
        ensure_message(sender=emma, receiver=dylan, text="Can we do tutoring sessions after 6pm on weekdays?")
        ensure_message(sender=dylan, receiver=emma, text="Sure. Let’s do Tue/Thu 6:30pm. I’ll send exercises before.")
        ensure_message(sender=sara, receiver=noah, text="We need 3 reels. Can you match our club colors for captions?")
        ensure_message(sender=noah, receiver=sara, text="Yes. Send brand colors/logos and I’ll keep the style consistent.")
        ensure_message(sender=liam, receiver=fatima, text="Can the Excel tracker auto-categorize transactions by keyword?")
        ensure_message(sender=fatima, receiver=liam, text="Yes, we can use a keyword table + formulas. I’ll keep it simple.")
        ensure_message(sender=liam, receiver=priya, text="Do you prefer a Figma link or screenshots for the UX audit?")
        ensure_message(sender=priya, receiver=liam, text="Either works. Figma is best, but screenshots are fine too.")

        def ensure_review(*, reviewer: User, reviewed: User, rating: int, comment: str):
            existing = db.session.execute(
                db.select(Review).where(
                    Review.reviewer_id == reviewer.id,
                    Review.reviewed_user_id == reviewed.id,
                    Review.comment == comment,
                )
            ).scalar_one_or_none()
            if existing:
                return existing
            r = Review(
                reviewer_id=reviewer.id,
                reviewed_user_id=reviewed.id,
                rating=rating,
                comment=comment,
            )
            db.session.add(r)
            return r

        # --- Reviews (so public profiles have credibility) ---
        ensure_review(
            reviewer=emma,
            reviewed=alice,
            rating=5,
            comment="Great poster concepts and super fast changes. Event materials looked professional.",
        )
        ensure_review(
            reviewer=emma,
            reviewed=chloe,
            rating=4,
            comment="Very helpful edits — my writing was clearer and more confident after proofreading.",
        )
        ensure_review(
            reviewer=liam,
            reviewed=fatima,
            rating=5,
            comment="Awesome dashboard and clear formulas. Made budgeting much easier for our team.",
        )
        ensure_review(
            reviewer=sara,
            reviewed=noah,
            rating=5,
            comment="Reels were on-brand and engaging. Captions were perfect and turnaround was quick.",
        )

        # --- Extra notifications (bell dropdown shows activity) ---
        ensure_notification(
            user_id=alice.id, type="system", message="Welcome back! Your profile looks great.", link="/profile"
        )
        ensure_notification(
            user_id=bob.id, type="system", message="Tip: Add more projects to your portfolio link.", link="/profile"
        )
        ensure_notification(
            user_id=emma.id,
            type="system",
            message="You can post jobs and track progress in Job Details.",
            link="/jobs",
        )
        ensure_notification(
            user_id=sara.id,
            type="system",
            message="New: Browse Top Rated freelancers to find trusted talent.",
            link="/top-freelancers",
        )
        ensure_notification(
            user_id=liam.id,
            type="system",
            message="Tip: Use job categories to attract the right applicants.",
            link="/jobs",
        )

        db.session.commit()
        print("Seed complete.")
        print("Demo logins:")
        print("- alice@campus.test / Password123!")
        print("- bob@campus.test / Password123!")
        print("- chloe@campus.test / Password123!")
        print("- dylan@campus.test / Password123!")
        print("- emma@campus.test / Password123!")
        print("- fatima@campus.test / Password123!")
        print("- noah@campus.test / Password123!")
        print("- priya@campus.test / Password123!")
        print("- zanele@campus.test / Password123!")
        print("- liam@campus.test / Password123!")
        print("- sara@campus.test / Password123!")
        print("- admin@campus.test / Password123! (admin)")


if __name__ == "__main__":
    os.environ.setdefault("FLASK_APP", "manage.py")
    cli()

