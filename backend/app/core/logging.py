"""
FinSight — Structured JSON Logger
Produces machine-readable logs for audit trails.
In fintech, every significant action must be logged.
"""

import logging
import sys
from pythonjsonlogger import jsonlogger


def setup_logger(name: str = "finsight") -> logging.Logger:
    """
    Create a structured JSON logger.
    Output format: {"timestamp": "...", "level": "INFO", "message": "...", ...}
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Prevent duplicate handlers if called multiple times
    if logger.handlers:
        return logger

    handler = logging.StreamHandler(sys.stdout)

    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger


# Single shared logger instance — import this everywhere
logger = setup_logger()