from .client import ApiLensClient, ApiLensConfig
from .client import RequestRecord
from .django import ApiLensDjangoMiddleware
from .litestar import ApiLensPlugin

__version__ = "0.1.0"


def install_apilens_exporter(*args, **kwargs):
    # Lazy import keeps core middleware usable without OTel dependency.
    from .client.otel import install_apilens_exporter as _install_apilens_exporter

    return _install_apilens_exporter(*args, **kwargs)

__all__ = [
    "ApiLensClient",
    "ApiLensConfig",
    "RequestRecord",
    "install_apilens_exporter",
    "ApiLensDjangoMiddleware",
    "ApiLensPlugin",
]
