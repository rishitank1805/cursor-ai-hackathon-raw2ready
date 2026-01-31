"""Application configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """App settings from environment variables."""

    openai_api_key: str | None = None
    google_api_key: str | None = None

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }
