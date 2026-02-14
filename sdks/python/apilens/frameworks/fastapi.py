from __future__ import annotations

from ..client import ApiLensClient
from ..client.middleware import ApiLensASGIMiddleware


def instrument_fastapi(app, client: ApiLensClient, *, environment: str | None = None):
    """FastAPI integration via ASGI middleware."""
    app.add_middleware(ApiLensASGIMiddleware, client=client, environment=environment)
    return app


__all__ = ["instrument_fastapi"]
