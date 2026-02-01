"""
Django settings package for apilens project.

Usage:
    - Development: DJANGO_SETTINGS_MODULE=config.settings.development
    - Production:  DJANGO_SETTINGS_MODULE=config.settings.production

Default is development settings.
"""

import os

environment = os.environ.get("DJANGO_ENV", "development").lower()

if environment == "production":
    from .production import *  # noqa: F401, F403
else:
    from .development import *  # noqa: F401, F403
