"""Application configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """App settings from environment variables."""

    openai_api_key: str | None = None
    google_api_key: str | None = None
    manus_api_key: str | None = None
    minimax_api_key: str | None = None
    # Temperature for LLM calls (0.0–1.0). Lower = more factual/accurate. Optimal for research: 0.2
    temperature: float = 0.2

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }
