import logging
import os
from typing import Optional

try:
    import sentry_sdk
except Exception:
    sentry_sdk = None

try:
    from prometheus_client import start_http_server
except Exception:
    start_http_server = None


def get_logger(name: str = __name__) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        fmt = "%(asctime)s %(levelname)s %(name)s - %(message)s"
        handler.setFormatter(logging.Formatter(fmt))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    # initialize Sentry if configured
    dsn = os.environ.get("SENTRY_DSN")
    if dsn and sentry_sdk is not None:
        try:
            sentry_sdk.init(dsn)
        except Exception:
            logger.warning("Failed to initialize Sentry")
    return logger


def start_metrics(port: Optional[int] = None):
    """Start a Prometheus HTTP metrics endpoint if prometheus_client is available.

    Returns True if started, False otherwise.
    """
    if start_http_server is None:
        return False
    if port is None:
        try:
            port = int(os.environ.get("METRICS_PORT", "8000"))
        except Exception:
            port = 8000
    try:
        start_http_server(port)
        return True
    except Exception:
        return False
