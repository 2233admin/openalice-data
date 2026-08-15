from dataclasses import dataclass
from typing import Literal
import unittest

from studio_inspector import build_snapshot


@dataclass
class FakeField:
    annotation: object = str
    description: str = "A field"
    is_required_value: bool = False

    def is_required(self):
        return self.is_required_value


class FakeProviderInterface:
    available_providers = ["fmp", "yfinance"]
    credentials = {"fmp": ["fmp_api_key"], "yfinance": []}
    map = {
        "EquityHistorical": {
            "openbb": {
                "QueryParams": {"fields": {"symbol": FakeField(is_required_value=True)}},
                "Data": {"fields": {"date": FakeField(), "close": FakeField(annotation=float)}},
            },
            "fmp": {
                "QueryParams": {"fields": {"exchange": FakeField(annotation=Literal["NASDAQ", "NYSE"])}},
                "Data": {"fields": {"change_percent": FakeField(annotation=float)}},
            },
            "yfinance": {"QueryParams": {"fields": {}}, "Data": {"fields": {}}},
        }
    }


class FakeCommandMap:
    commands_model = {"/equity/price/historical": "EquityHistorical"}
    command_coverage = {"/equity/price/historical": ["fmp", "yfinance"]}


class StudioInspectorTest(unittest.TestCase):
    def test_snapshot_uses_registry_and_command_map_without_secret_values(self):
        snapshot = build_snapshot(
            provider_interface=FakeProviderInterface(),
            command_map=FakeCommandMap(),
            configured_credentials={"fmp_api_key": "super-secret-value"},
            package_versions={"openbb-fmp": "1.2.3"},
        )

        self.assertEqual([provider["id"] for provider in snapshot["providers"]], ["fmp", "yfinance"])
        fmp = snapshot["providers"][0]
        self.assertEqual(fmp["credential_fields"], [
            {"name": "fmp_api_key", "required": True, "configured": True, "secret": True}
        ])
        self.assertEqual(fmp["status"], "ready_to_test")
        self.assertEqual(fmp["version"], "1.2.3")

        dataset = snapshot["datasets"][0]
        self.assertEqual(dataset["id"], "equity.price.historical")
        self.assertEqual(dataset["standard_model"], "EquityHistorical")
        self.assertEqual([provider["provider_id"] for provider in dataset["providers"]], ["fmp", "yfinance"])
        self.assertEqual(dataset["common_query_fields"][0]["name"], "symbol")
        self.assertEqual(dataset["provider_specific_query_fields"]["fmp"][0]["choices"], ["NASDAQ", "NYSE"])
        self.assertEqual(dataset["provider_specific_fields"]["fmp"][0]["name"], "change_percent")
        self.assertNotIn("super-secret-value", str(snapshot))

    def test_missing_required_credential_is_actionable(self):
        snapshot = build_snapshot(
            provider_interface=FakeProviderInterface(),
            command_map=FakeCommandMap(),
            configured_credentials={},
            package_versions={},
        )

        fmp = snapshot["providers"][0]
        self.assertEqual(fmp["status"], "credential_required")
        self.assertEqual(snapshot["actions"], [
            {
                "id": "credential:fmp",
                "severity": "warning",
                "title": "Fmp 需要配置凭证",
                "description": "填写所需凭证，然后运行一次测试查询。",
                "entity_type": "credential",
                "entity_id": "fmp",
                "action_label": "配置凭证",
                "action_route": "/data-sources/fmp?tab=credentials",
            }
        ])


if __name__ == "__main__":
    unittest.main()
