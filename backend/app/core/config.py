import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "PKP TV"
    VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8085
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = False

    # CORS settings (accepts wildcard or specific origins)
    CORS_ORIGINS: List[str] = [
        "*",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3005",
        "http://localhost:5173",
        "https://pottapk.win",
        "https://tv.pottapk.win",
        "https://app.pottapk.win"
    ]

    DATA_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    CACHE_EXPIRY_HOURS: int = 24
    IPTV_ORG_API_BASE: str = "https://iptv-org.github.io/api"
    IPTV_ORG_M3U_BASE: str = "https://iptv-org.github.io/iptv"
    USER_AGENT: str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 PKPTV/1.0"


settings = Settings()
