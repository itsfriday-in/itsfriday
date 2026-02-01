"""
Django development settings for apilens project.
"""

from .base import *  # noqa: F401, F403

# =============================================================================
# Development Overrides
# =============================================================================

DEBUG = True

ALLOWED_HOSTS = ["*"]

# =============================================================================
# CORS (Allow all origins in development)
# =============================================================================

CORS_ALLOW_ALL_ORIGINS = True

# =============================================================================
# Email Configuration (Console backend for development)
# =============================================================================

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# =============================================================================
# Cache Configuration (Use local memory cache in development)
# =============================================================================

# Optionally use simple cache for development without Redis
# CACHES = {
#     "default": {
#         "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
#         "LOCATION": "unique-snowflake",
#     }
# }
