from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://card_app:card_app_secret@localhost:5432/card_manager"
    service_database_url: str = "postgresql://card_service:card_service_secret@localhost:5432/card_manager"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 72
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
