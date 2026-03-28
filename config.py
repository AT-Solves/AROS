# config.py

import os
from dotenv import load_dotenv

load_dotenv()

CONFIG = {
    "openai": {
        "api_key": os.getenv("OPENAI_API_KEY")
    },
    "groq": {
        "api_key": os.getenv("GROQ_API_KEY")    
    },
    "db": {
        "dbname": os.getenv("DB_NAME"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "host": os.getenv("DB_HOST"),
        "port": os.getenv("DB_PORT"),
    },
    "execution": {
        "allow_auto_execution": os.getenv("ALLOW_AUTO_EXECUTION", "false").lower() == "true"
    },
    "mode":"demo",
    "time_windows": {
    "current_minutes": 60,
    "previous_minutes": 60,
    "lookback_days": 7
    }
}