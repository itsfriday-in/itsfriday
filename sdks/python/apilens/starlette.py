from __future__ import annotations

from .client import ApiLensClient
from .client.middleware import ApiLensASGIMiddleware


def instrument_app(app, client: ApiLensClient, *, environment: str | None = None):
    """Starlette integration via ASGI middleware."""
    app.add_middleware(ApiLensASGIMiddleware, client=client, environment=environment)
    return app
