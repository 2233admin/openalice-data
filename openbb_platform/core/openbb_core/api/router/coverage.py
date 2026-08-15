"""Coverage API router."""

from typing import Annotated, Any, Literal, get_args, get_origin

from fastapi import APIRouter, Depends
from openbb_core.api.dependency.coverage import get_command_map, get_provider_interface
from openbb_core.app.provider_interface import ProviderInterface
from openbb_core.app.router import CommandMap
from openbb_core.app.service.user_service import UserService

router = APIRouter(prefix="/coverage", tags=["Coverage"])


def _literal_values(annotation: Any) -> list[Any]:
    """Return JSON-safe Literal values nested in a type annotation."""
    if get_origin(annotation) is Literal:
        return list(get_args(annotation))
    for argument in get_args(annotation):
        values = _literal_values(argument)
        if values:
            return values
    return []


def _field_metadata(field_info: Any) -> dict[str, Any]:
    """Serialize only stable, JSON-safe field metadata for Studio clients."""
    annotation = getattr(field_info, "annotation", None)
    metadata: dict[str, Any] = {
        "annotation": str(annotation) if annotation is not None else "Any",
        "description": getattr(field_info, "description", None),
        "required": bool(field_info.is_required()),
    }
    choices = _literal_values(annotation)
    if choices:
        metadata["enum"] = choices
    return metadata


@router.get("/command_model", openapi_extra={"widget_config": {"exclude": True}})
async def get_commands_model_map(
    command_map: Annotated[CommandMap, Depends(get_command_map)],
    provider_interface: Annotated[ProviderInterface, Depends(get_provider_interface)],
):
    """Get the command to provider model mapping."""

    commands_map: dict = {}

    for command in command_map.commands_model:
        model = command_map.commands_model[command]
        pi_command = provider_interface.map[model]
        schema = provider_interface.return_annotations[model]
        providers = list(pi_command)
        new_command: dict = {}
        new_command["response_schema_name"] = schema.__name__ if schema else None
        for provider in providers:
            new_command[provider] = {
                "QueryParams": {"docstring": "", "fields": {}},
                "Data": {"docstring": "", "fields": {}},
            }
            p = pi_command[provider]
            query = p.get("QueryParams", {})
            query_fields = query.get("fields", {})
            data = p.get("Data", {})
            data_fields = data.get("fields", {})

            for field, field_info in query_fields.items():
                new_command[provider]["QueryParams"]["fields"][field] = _field_metadata(field_info)

            new_command[provider]["QueryParams"]["docstring"] = query.get("docstring")

            for field, field_info in data_fields.items():
                new_command[provider]["Data"]["fields"][field] = _field_metadata(field_info)

            new_command[provider]["Data"]["docstring"] = data.get("docstring")

            if openbb_info := new_command.get("openbb", {}):
                for key in list(new_command):
                    if key == "response_schema_name":
                        continue

                    if obb_params := openbb_info.get("QueryParams", {}).get(
                        "fields", {}
                    ):
                        old_fields = new_command[key]["QueryParams"].get("fields", {})
                        new_command[key]["QueryParams"]["fields"] = {
                            **obb_params,
                            **old_fields,
                        }
                    if obb_data := openbb_info.get("Data", {}).get("fields", {}):
                        old_fields = new_command[key]["Data"].get("fields", {})
                        new_command[key]["Data"]["fields"] = {**obb_data, **old_fields}
        common_fields = new_command.pop("openbb", None)
        if common_fields is not None:
            new_command["common"] = common_fields
        commands_map[command] = new_command

    return commands_map


def _credential_is_configured(value: Any) -> bool:
    """Return configured state without serializing credential contents."""
    if value is None:
        return False
    get_secret_value = getattr(value, "get_secret_value", None)
    if callable(get_secret_value):
        return bool(get_secret_value())
    return bool(value)


@router.get("/provider_metadata", openapi_extra={"widget_config": {"exclude": True}})
async def get_provider_metadata(
    provider_interface: Annotated[ProviderInterface, Depends(get_provider_interface)],
) -> dict[str, list[dict[str, Any]]]:
    """Expose registry credential names and configured flags, never values."""
    credentials = UserService().default_user_settings.credentials
    return {
        provider: [
            {
                "name": credential_name,
                "required": True,
                "configured": _credential_is_configured(
                    getattr(credentials, credential_name, None)
                ),
            }
            for credential_name in credential_names
        ]
        for provider, credential_names in provider_interface.credentials.items()
    }



@router.get("/providers", openapi_extra={"widget_config": {"exclude": True}})
async def get_provider_coverage(
    command_map: Annotated[CommandMap, Depends(get_command_map)],
):
    """Get command coverage by provider."""
    return command_map.provider_coverage


@router.get("/commands", openapi_extra={"widget_config": {"exclude": True}})
async def get_command_coverage(
    command_map: Annotated[CommandMap, Depends(get_command_map)],
):
    """Get provider coverage by command."""
    return command_map.command_coverage
