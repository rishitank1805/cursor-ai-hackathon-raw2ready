"""Application configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """App settings from environment variables."""

    openai_api_key: str | None = None
    google_api_key: str | None = None

    class Config:
        env_file = ".env"
        extra = "ignore"
