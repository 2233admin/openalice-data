"""Opt-in smoke test executed inside an ODP-managed OpenBB environment."""

import os
import unittest

from studio_inspector import inspect_environment


@unittest.skipUnless(os.environ.get("OPENBB_STUDIO_REAL_RUNTIME") == "1", "requires managed OpenBB runtime")
class ManagedRuntimeSmokeTest(unittest.TestCase):
    def test_real_runtime_exposes_registry_without_secret_values(self):
        snapshot = inspect_environment()
        self.assertGreater(len(snapshot["providers"]), 0)
        self.assertGreater(len(snapshot["datasets"]), 0)
        def keys(value):
            if isinstance(value, dict):
                return set(value) | set().union(*(keys(item) for item in value.values()))
            if isinstance(value, list):
                return set().union(*(keys(item) for item in value)) if value else set()
            return set()

        self.assertTrue({"value", "credential_value", "api_key_value"}.isdisjoint(keys(snapshot)))


if __name__ == "__main__":
    unittest.main()
