from __future__ import annotations

from .client import ApiLensClient
from .frameworks.flask import instrument_flask


def instrument_app(app, client: ApiLensClient, *, environment: str | None = None):
    """Compatibility wrapper: prefer apilens.frameworks.flask.instrument_flask."""
    return instrument_flask(app, client, environment=environment)
