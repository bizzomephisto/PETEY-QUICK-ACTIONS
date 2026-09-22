from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from flask import Flask


MODULE_PATH = Path(__file__).resolve().parents[1] / "addon.py"
SPEC = importlib.util.spec_from_file_location("quick_actions_addon", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class QuickActionsTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.app = Flask(__name__)
        self.context = SimpleNamespace(
            app=self.app,
            addon_id="quick-actions",
            data_dir=Path(self.directory.name),
        )
        self.addon = MODULE.setup(self.context)
        self.client = self.app.test_client()

    def test_defaults_are_safe_and_unconfigured(self):
        response = self.client.get("/api/addons/quick-actions/state")
        self.assertEqual(response.status_code, 200)
        buttons = response.get_json()["buttons"]
        self.assertEqual(len(buttons), 4)
        self.assertTrue(all(button["action_type"] == "text_command" for button in buttons))
        self.assertTrue(all(button["command"] == "" for button in buttons))

    def test_home_assistant_token_is_saved_but_never_returned(self):
        response = self.client.put(
            "/api/addons/quick-actions/config",
            json={"buttons": [{
                "id": "lights",
                "label": "Lights",
                "icon": "💡",
                "enabled": True,
                "action_type": "home_assistant",
                "ha_url": "http://homeassistant.local:8123",
                "ha_token": "secret-token",
                "ha_service": "light.turn_on",
                "ha_entity_id": "light.living_room",
            }]},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["buttons"][0]["ha_token_set"])
        self.assertNotIn("secret-token", response.get_data(as_text=True))
        self.assertIn("secret-token", (Path(self.directory.name) / "config.json").read_text())

    def test_text_command_is_returned_for_the_petey_composer(self):
        self.addon.update_buttons([{
            "id": "status",
            "label": "Status",
            "action_type": "text_command",
            "command": "Give me a house status update.",
            "enabled": True,
        }])
        response = self.client.post(
            "/api/addons/quick-actions/execute",
            json={"button_id": "status"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["command"], "Give me a house status update.")

    @patch.object(MODULE.requests, "post")
    def test_home_assistant_call_uses_saved_token_without_returning_it(self, request_post):
        request_post.return_value = Mock(status_code=200)
        self.addon.update_buttons([{
            "id": "lights",
            "label": "Lights",
            "action_type": "home_assistant",
            "ha_url": "http://homeassistant.local:8123",
            "ha_token": "secret-token",
            "ha_service": "light.turn_on",
            "ha_entity_id": "light.living_room",
            "enabled": True,
        }])
        response = self.client.post(
            "/api/addons/quick-actions/execute",
            json={"button_id": "lights"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("secret-token", response.get_data(as_text=True))
        request_post.assert_called_once()
        self.assertEqual(
            request_post.call_args.kwargs["headers"]["Authorization"],
            "Bearer secret-token",
        )


if __name__ == "__main__":
    unittest.main()
