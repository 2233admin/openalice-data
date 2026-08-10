"""Load packaged, credential-free catalog and compliance manifests."""

from __future__ import annotations

import json
from importlib.resources import files

from openalice_data.catalog import Catalog
from openalice_data.models import DatasetDefinition, ProviderPolicy


def _load_json(name: str) -> list[dict]:
    path = files("openalice_data").joinpath("catalog", name)
    return json.loads(path.read_text(encoding="utf-8"))


def load_builtin_catalog() -> Catalog:
    """Load the phase-one dataset directory shipped with the extension."""
    return Catalog(DatasetDefinition(**item) for item in _load_json("datasets.json"))


def load_provider_policies() -> list[ProviderPolicy]:
    """Load provider policy records; these never contain credential values."""
    return [ProviderPolicy(**item) for item in _load_json("providers.json")]
