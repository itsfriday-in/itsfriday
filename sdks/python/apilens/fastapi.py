from __future__ import annotations

from .client import ApiLensClient
from .frameworks.fastapi import instrument_fastapi


def instrument_app(app, client: ApiLensClient, *, environment: str | None = None):
    """Compatibility wrapper: prefer apilens.frameworks.fastapi.instrument_fastapi."""
    return instrument_fastapi(app, client, environment=environment)
