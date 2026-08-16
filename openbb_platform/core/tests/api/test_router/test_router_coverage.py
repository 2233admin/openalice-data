"""Test coverage for the router module."""

import asyncio
from types import SimpleNamespace
from typing import Literal
from unittest.mock import Mock, patch

from openbb_core.api.router.coverage import (
    get_command_coverage,
    get_commands_model_map,
    get_provider_coverage,
    get_provider_metadata,
)
from pydantic import Field, create_model


@patch("openbb_core.api.router.coverage.CommandMap")
def test_get_provider_coverage(mock_command_map):
    """Test get provider coverage."""
    mock_command_map.return_value.provider_coverage = {
        "provider1": ["coverage1", "coverage2"]
    }

    response = get_provider_coverage(mock_command_map)

    assert response


@patch("openbb_core.api.router.coverage.CommandMap")
def test_get_command_coverage(mock_command_map):
    """Test get command coverage."""
    mock_command_map.return_value.command_coverage = {
        "command1": ["coverage1", "coverage2"]
    }

    response = get_command_coverage(mock_command_map)
    assert response


def test_get_provider_metadata_redacts_secret_values():
    """Test registry credential metadata only exposes names and configured state."""
    provider_interface = Mock()
    provider_interface.credentials = {"fmp": ["fmp_api_key", "missing_key"]}

    class SecretValue:
        def __init__(self, value):
            self.value = value

        def get_secret_value(self):
            return self.value

    settings = SimpleNamespace(
        credentials=SimpleNamespace(
            fmp_api_key=SecretValue("do-not-return"),
            missing_key=SecretValue(""),
        )
    )
    with patch("openbb_core.api.router.coverage.UserService") as user_service:
        user_service.read_from_file.return_value = settings
        response = asyncio.run(get_provider_metadata(provider_interface))

    assert response == {
        "fmp": [
            {"name": "fmp_api_key", "required": True, "configured": True},
            {"name": "missing_key", "required": True, "configured": False},
        ]
    }
    assert "do-not-return" not in str(response)
def test_get_command_model_serializes_json_safe_field_metadata():
    """Expose types, required flags, and enums without leaking FieldInfo internals."""
    query_fields = create_model(
        "QueryParams",
        symbol=(str, Field(description="Symbol")),
        exchange=(Literal["NASDAQ", "NYSE"], Field(default=None, description="Exchange")),
    ).model_fields
    data_fields = create_model(
        "Data",
        close=(float, Field(description="Close")),
    ).model_fields
    command_map = Mock()
    command_map.commands_model = {"command1": "model1"}
    provider_interface = Mock()
    provider_interface.map = {
        "model1": {
            "openbb": {
                "QueryParams": {"docstring": "", "fields": query_fields},
                "Data": {"docstring": "", "fields": data_fields},
            },
            "fmp": {
                "QueryParams": {"docstring": "", "fields": {}},
                "Data": {"docstring": "", "fields": {}},
            },
        }
    }
    provider_interface.return_annotations = {"model1": None}

    response = asyncio.run(get_commands_model_map(command_map, provider_interface))
    fields = response["command1"]["fmp"]["QueryParams"]["fields"]

    assert response["command1"]["response_schema_name"] is None
    assert fields["symbol"]["required"] is True
    assert fields["exchange"]["required"] is False
    assert fields["exchange"]["enum"] == ["NASDAQ", "NYSE"]
    assert query_fields["symbol"]._attributes_set["annotation"] is str
