"""A-share provider extension for the OpenBB-based quote sidecar."""

from openbb_core.provider.abstract.provider import Provider

from openbb_ashare.models.snapshot import AshareSnapshotFetcher


ashare_provider = Provider(
    name="ashare",
    description="Normalized A-share quote snapshots with source provenance.",
    website="https://git.xart.top:8418/Curry/openbb-ashare",
    fetcher_dict={"AshareSnapshot": AshareSnapshotFetcher},
)

