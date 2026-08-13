"""Serialize OpenBB's own registry and command map for the Desktop UI.

This module deliberately contains no provider catalogue. OpenBB remains the
single source of truth; Studio only converts its public registry objects into a
JSON-safe, secret-free transport contract.
"""

from __future__ import annotations

import argparse
import importlib.metadata
import json
from datetime import UTC, datetime
from typing import Any, Mapping, get_args


def _display_name(value: str) -> str:
    return value.replace("_", " ").replace("-", " ").title()


def _field_type(field: Any) -> str:
    annotation = getattr(field, "annotation", None)
    if annotation is None:
        return "unknown"
    return getattr(annotation, "__name__", str(annotation).replace("typing.", ""))


def _fields(model_part: Any) -> list[dict[str, Any]]:
    raw_fields = model_part.get("fields", {}) if isinstance(model_part, Mapping) else {}
    result = []
    for name, field in raw_fields.items():
        required = getattr(field, "is_required", None)
        annotation = getattr(field, "annotation", None)
        choices = [value for value in get_args(annotation) if isinstance(value, (str, int, float, bool))]
        item = {
                "name": name,
                "type": _field_type(field),
                "description": getattr(field, "description", None),
                "required": bool(required()) if callable(required) else False,
        }
        if choices:
            item["choices"] = choices
        result.append(item)
    return result


def _package_version(provider_id: str, versions: Mapping[str, str]) -> str | None:
    candidates = (f"openbb-{provider_id}", f"openbb_{provider_id}", provider_id)
    return next((versions[name] for name in candidates if name in versions), None)


def build_snapshot(
    *,
    provider_interface: Any,
    command_map: Any,
    configured_credentials: Mapping[str, Any],
    package_versions: Mapping[str, str],
) -> dict[str, Any]:
    """Build a secret-free Studio snapshot from OpenBB-owned objects."""
    coverage = command_map.command_coverage
    models_by_route = command_map.commands_model
    datasets = []
    provider_capabilities: dict[str, list[str]] = {
        provider: [] for provider in provider_interface.available_providers
    }

    for route, standard_model in sorted(models_by_route.items()):
        provider_ids = sorted(coverage.get(route, []))
        model_map = provider_interface.map.get(standard_model, {})
        common_model = model_map.get("openbb", {})
        dataset_id = route.strip("/").replace("/", ".")
        for provider_id in provider_ids:
            provider_capabilities.setdefault(provider_id, []).append(dataset_id)
        datasets.append(
            {
                "id": dataset_id,
                "display_name": _display_name(route.rsplit("/", 1)[-1]),
                "category": _display_name(route.strip("/").split("/", 1)[0]),
                "python_path": dataset_id,
                "api_path": f"/api/v1{route}",
                "standard_model": standard_model,
                "description": common_model.get("Data", {}).get("description")
                if isinstance(common_model.get("Data", {}), Mapping)
                else None,
                "providers": [
                    {"provider_id": provider_id, "state": "available"}
                    for provider_id in provider_ids
                ],
                "common_query_fields": _fields(
                    common_model.get("QueryParams", {})
                ),
                "common_data_fields": _fields(
                    common_model.get("Data", {})
                ),
                "provider_specific_query_fields": {
                    provider_id: _fields(model_map.get(provider_id, {}).get("QueryParams", {}))
                    for provider_id in provider_ids
                },
                "provider_specific_fields": {
                    provider_id: _fields(model_map.get(provider_id, {}).get("Data", {}))
                    for provider_id in provider_ids
                },
            }
        )

    providers = []
    actions = []
    for provider_id in sorted(provider_interface.available_providers):
        credential_names = provider_interface.credentials.get(provider_id, [])
        credential_fields = [
            {
                "name": name,
                "required": True,
                "configured": bool(configured_credentials.get(name)),
                "secret": True,
            }
            for name in credential_names
        ]
        missing_credentials = any(not field["configured"] for field in credential_fields)
        status = "credential_required" if missing_credentials else "ready_to_test"
        capabilities = provider_capabilities.get(provider_id, [])
        providers.append(
            {
                "id": provider_id,
                "name": provider_id,
                "display_name": _display_name(provider_id),
                "version": _package_version(provider_id, package_versions),
                "status": status if capabilities else "setup_required",
                "capability_count": len(capabilities),
                "capabilities": capabilities,
                "credential_fields": credential_fields,
            }
        )
        if missing_credentials:
            actions.append(
                {
                    "id": f"credential:{provider_id}",
                    "severity": "warning",
                    "title": f"{_display_name(provider_id)} 需要配置凭证",
                    "description": "填写所需凭证，然后运行一次测试查询。",
                    "entity_type": "credential",
                    "entity_id": provider_id,
                    "action_label": "配置凭证",
                    "action_route": f"/data-sources/{provider_id}?tab=credentials",
                }
            )

    return {
        "providers": providers,
        "datasets": datasets,
        "actions": actions,
        "fetched_at": datetime.now(UTC).isoformat(),
    }


def inspect_environment() -> dict[str, Any]:
    """Load the active environment through OpenBB's supported registries."""
    from openbb_core.app.model.user_settings import UserSettings
    from openbb_core.app.provider_interface import ProviderInterface
    from openbb_core.app.router import CommandMap

    credentials = UserSettings().credentials.model_dump(mode="python")
    versions = {
        distribution.metadata["Name"].lower(): distribution.version
        for distribution in importlib.metadata.distributions()
        if distribution.metadata.get("Name")
    }
    return build_snapshot(
        provider_interface=ProviderInterface(),
        command_map=CommandMap(),
        configured_credentials=credentials,
        package_versions=versions,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect an OpenBB environment for Studio")
    parser.add_argument("--json", action="store_true", required=True)
    parser.parse_args()
    print(json.dumps(inspect_environment(), default=str, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
