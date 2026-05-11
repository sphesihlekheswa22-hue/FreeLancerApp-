import os

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app() -> Flask:
    load_dotenv()
    app = Flask(__name__)

    db_url = os.getenv("DATABASE_URL", "sqlite:///campus_gigs.sqlite").strip()
    # Prefer psycopg v3 driver when using Postgres.
    # Render/managed environments may preinstall psycopg2, which can cause SQLAlchemy
    # to pick the psycopg2 dialect unless explicitly specified.
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
    app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024

    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=False)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    from .routes.auth import auth_bp
    from .routes.applications import applications_bp
    from .routes.gigs import gigs_bp
    from .routes.jobs import jobs_bp
    from .routes.messages import messages_bp
    from .routes.profile import profile_bp
    from .routes.reviews import reviews_bp
    from .routes.users import users_bp
    from .routes.admin import admin_bp
    from .routes.notifications import notifications_bp
    from .routes.ranking import ranking_bp
    from .routes.ai import ai_bp

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(applications_bp, url_prefix="/api")
    app.register_blueprint(gigs_bp, url_prefix="/api")
    app.register_blueprint(jobs_bp, url_prefix="/api")
    app.register_blueprint(messages_bp, url_prefix="/api")
    app.register_blueprint(profile_bp, url_prefix="/api")
    app.register_blueprint(reviews_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api")
    app.register_blueprint(notifications_bp, url_prefix="/api")
    app.register_blueprint(ranking_bp, url_prefix="/api")
    app.register_blueprint(ai_bp, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return {"ok": True}

    return app

