import contextvars
import json
import logging
import sys
import time
from typing import Any, Dict

request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class StructuredFormatter(logging.Formatter):
    """
    Format logs as human-readable colorized strings for terminal dev,
    or JSON for production container logs (e.g., Dozzle / CloudWatch / Promtail).
    """

    COLORS = {
        logging.DEBUG: "\033[36m",    # Cyan
        logging.INFO: "\033[32m",     # Green
        logging.WARNING: "\033[33m",  # Yellow
        logging.ERROR: "\033[31m",    # Red
        logging.CRITICAL: "\033[35m", # Magenta
    }
    RESET = "\033[0m"

    def __init__(self, json_format: bool = False):
        super().__init__()
        self.json_format = json_format

    def format(self, record: logging.LogRecord) -> str:
        req_id = request_id_ctx.get()
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(record.created))

        if self.json_format:
            log_data: Dict[str, Any] = {
                "timestamp": timestamp,
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
                "request_id": req_id,
                "module": record.module,
                "lineno": record.lineno,
            }
            if record.exc_info:
                log_data["exception"] = self.formatException(record.exc_info)
            return json.dumps(log_data)

        # Colorized human-readable format
        color = self.COLORS.get(record.levelno, self.RESET)
        req_str = f" [{req_id}]" if req_id != "-" else ""
        base = f"{color}[{timestamp}] [{record.levelname:<7}]{self.RESET}{req_str} {record.name}: {record.getMessage()}"
        if record.exc_info:
            base += f"\n{self.formatException(record.exc_info)}"
        return base


def setup_logging(level: str = "INFO", json_format: bool = False) -> None:
    """Configures root logger and uvicorn loggers with the structured formatter."""
    log_level = getattr(logging, level.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers to avoid duplicates
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter(json_format=json_format))
    root_logger.addHandler(handler)

    # Quiet external verbose loggers
    logging.getLogger("uvicorn.access").handlers = [handler]
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
