"""OpenBB core-extension entry point for the `/data` route tree."""

from openbb_core.app.router import Router

from openalice_data.api import create_api_router
from openalice_data.runtime import build_default_hub

router = Router.from_fastapi(create_api_router(build_default_hub()))
