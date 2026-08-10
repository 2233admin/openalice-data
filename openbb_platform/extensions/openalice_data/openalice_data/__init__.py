"""OpenAlice Data public Python contract."""

from openalice_data.api import create_api_router
from openalice_data.catalog import Catalog
from openalice_data.facade import DataFacade
from openalice_data.hub import DataHub
from openalice_data.models import (
    AccessMode,
    DatasetDefinition,
    DatasetField,
    DatasetQuery,
    QueryMetadata,
    QueryPage,
    SourceStatus,
)
from openalice_data.query import (
    DuckDBDatasetSource,
    ParquetDatasetSource,
    PITContractError,
    QueryService,
)
from openalice_data.runtime import build_default_hub

data = DataFacade(build_default_hub())

__all__ = [
    "AccessMode",
    "Catalog",
    "create_api_router",
    "DataHub",
    "DataFacade",
    "data",
    "DatasetDefinition",
    "DatasetField",
    "DatasetQuery",
    "DuckDBDatasetSource",
    "ParquetDatasetSource",
    "PITContractError",
    "QueryMetadata",
    "QueryPage",
    "QueryService",
    "SourceStatus",
    "build_default_hub",
]
