"""Public catalog and query contracts for OpenAlice Data."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AccessMode(str, Enum):
    """How a catalog entry obtains data."""

    SOURCE_REQUEST = "source_request"
    DATASET_QUERY = "dataset_query"
    CACHE = "cache"


class DatasetField(BaseModel):
    """One documented dataset field."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    name: str
    type: str
    description: str = ""
    description_zh: str = ""
    nullable: bool = True


class DatasetDefinition(BaseModel):
    """Stable, credential-free description of a dataset or source request."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    dataset_id: str
    name: str
    name_zh: str
    market: str
    asset_type: str
    provider: str
    access_mode: AccessMode
    description: str = ""
    description_zh: str = ""
    parameters: list[DatasetField] = Field(default_factory=list)
    fields: list[DatasetField] = Field(default_factory=list)
    sample: dict[str, Any] | None = None
    freshness: str | None = None
    coverage: str | None = None
    license_id: str
    query_entry: str
    pit: bool = False
    versions: list[str] = Field(default_factory=list)
    event_time_field: str | None = None
    available_at_field: str | None = None
    source_updated_at_field: str | None = None
    lineage: str | None = None
    quality_status: str | None = None
    available_from: datetime | None = None
    available_to: datetime | None = None


class DatasetQuery(BaseModel):
    """Bounded, read-only dataset query."""

    model_config = ConfigDict(extra="forbid")

    dataset_id: str
    version: str | None = None
    as_of: datetime | None = None
    filters: dict[str, Any] = Field(default_factory=dict)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=100)


class QueryMetadata(BaseModel):
    """Quality and provenance summary returned with every page."""

    source: str
    freshness: str | None = None
    coverage_ratio: float = Field(ge=0, le=1)
    missing_items: list[str] = Field(default_factory=list)
    complete: bool
    quality_status: str | None = None
    pit: bool = False
    pit_version: str | None = None
    as_of: datetime | None = None
    lineage: str | None = None


class QueryPage(BaseModel):
    """Context-bounded result shared by Python, REST, and MCP."""

    dataset_id: str
    rows: list[dict[str, Any]]
    page: int
    page_size: int
    next_page: int | None = None
    artifact_uri: str | None = None
    metadata: QueryMetadata


class SourceStatus(BaseModel):
    """Credential-free provider availability summary."""

    provider: str
    status: str
    datasets: list[str]
    message: str


class ProviderPolicy(BaseModel):
    """Human-reviewable software and data-use policy for one provider."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    provider_id: str
    display_name: str
    software_license: str
    data_terms: str
    authentication: str
    commercial_use: str
    source_url: str
    attribution: str
    optional: bool = True
    review_status: str = "required"
