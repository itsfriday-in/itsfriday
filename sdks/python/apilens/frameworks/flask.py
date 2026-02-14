from __future__ import annotations

from ..client import ApiLensClient
from ..client.middleware import ApiLensWSGIMiddleware


def instrument_flask(app, client: ApiLensClient, *, environment: str | None = None):
    """Flask integration via WSGI wrapper."""
    app.wsgi_app = ApiLensWSGIMiddleware(  # type: ignore[assignment]
        app.wsgi_app,
        client=client,
        environment=environment,
    )
    return app


__all__ = ["instrument_flask"]
