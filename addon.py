"""PETEY Desktop add-on: four customizable quick-action buttons above chat input."""

from __future__ import annotations

import json
import os
import threading
from pathlib import Path

from flask import jsonify, request

import requests


MAX_BUTTONS = 4
MAX_LABEL_LENGTH = 32
MAX_COMMAND_LENGTH = 500
MAX_URL_LENGTH = 2048
MAX_TOKEN_LENGTH = 4096
VALID_ACTION_TYPES = ("text_command", "task", "home_assistant")
VALID_SURFACES = ("petey_desktop", "mobile_petey")


class QuickActionsError(ValueError):
    """A safe error suitable for the PETEY UI."""


def _validate_button(data: object, index: int) -> dict:
    """Validate and normalize a single button configuration."""
    if not isinstance(data, dict):
        raise QuickActionsError(f"Button {index + 1} must be a JSON object.")

    action_type = data.get("action_type", "text_command")
    if action_type not in VALID_ACTION_TYPES:
        raise QuickActionsError(
            f"Button {index + 1} action_type must be one of: {', '.join(VALID_ACTION_TYPES)}"
        )

    label = str(data.get("label", f"Button {index + 1}")).strip()
    if not label:
        label = f"Button {index + 1}"
    if len(label) > MAX_LABEL_LENGTH:
        label = label[:MAX_LABEL_LENGTH]

    icon = str(data.get("icon", "⚡")).strip()
    if not icon:
        icon = "⚡"

    config = {
        "id": data.get("id", f"button_{index + 1}"),
        "label": label,
        "icon": icon,
        "action_type": action_type,
        "enabled": data.get("enabled", True),
    }

    if action_type == "text_command":
        command = str(data.get("command", "")).strip()
        if len(command) > MAX_COMMAND_LENGTH:
            raise QuickActionsError(
                f"Button {index + 1} command exceeds maximum length of {MAX_COMMAND_LENGTH}."
            )
        config["command"] = command

    elif action_type == "task":
        command = str(data.get("command", "")).strip()
        if len(command) > MAX_COMMAND_LENGTH:
            raise QuickActionsError(
                f"Button {index + 1} task command exceeds maximum length of {MAX_COMMAND_LENGTH}."
            )
        config["command"] = command

    elif action_type == "home_assistant":
        url = str(data.get("ha_url", "")).strip()
        token = str(data.get("ha_token", "")).strip()
        service = str(data.get("ha_service", "")).strip()
        entity_id = str(data.get("ha_entity_id", "")).strip()

        if not url:
            raise QuickActionsError(f"Button {index + 1} requires a Home Assistant URL.")
        if len(url) > MAX_URL_LENGTH:
            raise QuickActionsError(f"Button {index + 1} URL is too long.")
        if not token:
            raise QuickActionsError(f"Button {index + 1} requires a Home Assistant token.")
        if len(token) > MAX_TOKEN_LENGTH:
            raise QuickActionsError(f"Button {index + 1} token is too long.")
        if not service:
            raise QuickActionsError(f"Button {index + 1} requires a Home Assistant service.")

        config["ha_url"] = url
        config["ha_token"] = token
        config["ha_service"] = service
        config["ha_entity_id"] = entity_id
        config["ha_data"] = data.get("ha_data", {})

    return config


class QuickActionsAddon:
    """Manages four customizable quick-action buttons."""

    def __init__(self, context):
        self._data_dir = Path(context.data_dir)
        self._config_path = self._data_dir / "config.json"
        self._emit_event = context.emit_event
        self._lock = threading.RLock()
        self._buttons = self._load()

    def _load(self) -> list[dict]:
        """Load button configuration from disk."""
        try:
            data = json.loads(self._config_path.read_text(encoding="utf-8"))
            buttons = data.get("buttons", [])
            if isinstance(buttons, list) and 1 <= len(buttons) <= MAX_BUTTONS:
                return [_validate_button(b, i) for i, b in enumerate(buttons)]
        except (FileNotFoundError, json.JSONDecodeError, QuickActionsError):
            pass
        return self._default_buttons()

    def _save(self) -> None:
        """Atomically write button configuration to disk."""
        self._data_dir.mkdir(parents=True, exist_ok=True)
        temporary = self._config_path.with_suffix(".tmp")
        temporary.write_text(
            json.dumps({"buttons": self._buttons}, indent=2),
            encoding="utf-8",
        )
        os.chmod(temporary, 0o600)
        temporary.replace(self._config_path)

    def _default_buttons(self) -> list[dict]:
        """Return default button configuration."""
        return [
            {
                "id": "button_1",
                "label": "Button 1",
                "icon": "⚡",
                "action_type": "text_command",
                "command": "",
                "enabled": True,
            },
            {
                "id": "button_2",
                "label": "Button 2",
                "icon": "⚡",
                "action_type": "text_command",
                "command": "",
                "enabled": True,
            },
            {
                "id": "button_3",
                "label": "Button 3",
                "icon": "⚡",
                "action_type": "text_command",
                "command": "",
                "enabled": True,
            },
            {
                "id": "button_4",
                "label": "Button 4",
                "icon": "⚡",
                "action_type": "text_command",
                "command": "",
                "enabled": True,
            },
        ]

    def public_state(self) -> dict:
        """Return sanitized button configuration for the UI."""
        with self._lock:
            sanitized = []
            for btn in self._buttons:
                item = {
                    "id": btn["id"],
                    "label": btn["label"],
                    "icon": btn["icon"],
                    "action_type": btn["action_type"],
                    "enabled": btn["enabled"],
                }
                if btn["action_type"] == "home_assistant":
                    item["ha_url"] = btn.get("ha_url", "")
                    item["ha_entity_id"] = btn.get("ha_entity_id", "")
                    item["ha_service"] = btn.get("ha_service", "")
                    item["ha_token_set"] = bool(btn.get("ha_token", ""))
                else:
                    item["command"] = btn.get("command", "")
                sanitized.append(item)
            return {"buttons": sanitized}

    def update_buttons(self, buttons_data: list) -> dict:
        """Update all button configurations."""
        with self._lock:
            if not isinstance(buttons_data, list):
                raise QuickActionsError("Expected a list of button configurations.")
            if len(buttons_data) > MAX_BUTTONS:
                raise QuickActionsError(f"Maximum {MAX_BUTTONS} buttons allowed.")
            normalized = []
            for index, button in enumerate(buttons_data):
                if isinstance(button, dict) and button.get("action_type") == "home_assistant":
                    previous = next(
                        (item for item in self._buttons if item["id"] == button.get("id")),
                        None,
                    )
                    if previous and previous["action_type"] == "home_assistant" and not button.get("ha_token"):
                        button = {**button, "ha_token": previous.get("ha_token", "")}
                normalized.append(_validate_button(button, index))
            self._buttons = normalized
            self._save()
            return self.public_state()

    def execute_button(self, button_id: str, *, surface: str = "petey_desktop") -> dict:
        """Execute a button without exposing its command as a user chat message."""
        if surface not in VALID_SURFACES:
            raise QuickActionsError("Quick Actions received an invalid PETEY surface.")

        with self._lock:
            button = next((b for b in self._buttons if b["id"] == button_id), None)
            if not button:
                raise QuickActionsError(f"Button '{button_id}' not found.")
            if not button.get("enabled", True):
                raise QuickActionsError(f"Button '{button['label']}' is disabled.")

            action_type = button["action_type"]

            if action_type == "text_command":
                if not button.get("command"):
                    raise QuickActionsError(f"Set a message for '{button['label']}' first.")
                prompt = button["command"]

            elif action_type == "task":
                if not button.get("command"):
                    raise QuickActionsError(f"Set a task for '{button['label']}' first.")
                prompt = button["command"]

            elif action_type == "home_assistant":
                result = self._execute_home_assistant(button)
                prompt = (
                    f"Quick Action '{button['label']}' completed successfully. "
                    f"{result['message']} Briefly confirm the result to the user."
                )

            else:
                raise QuickActionsError(f"Unknown action type: {action_type}")

            try:
                self._emit_event(
                    prompt,
                    surface=surface,
                    speak=True,
                    metadata={
                        "quick_action_id": str(button["id"]),
                        "quick_action_label": str(button["label"]),
                        "quick_action_type": str(action_type),
                    },
                    user_initiated=action_type in {"text_command", "task"},
                )
            except Exception as exc:
                if action_type == "home_assistant":
                    raise QuickActionsError(
                        "The Home Assistant action completed, but PETEY could not queue its confirmation."
                    ) from exc
                raise QuickActionsError("Could not send this Quick Action to PETEY.") from exc
            return {
                "status": "queued",
                "message": f"{button['label']} sent to PETEY.",
            }

    def _execute_home_assistant(self, button: dict) -> dict:
        """Execute a Home Assistant API call."""
        ha_url = button.get("ha_url", "").rstrip("/")
        ha_token = button.get("ha_token", "")
        ha_service = button.get("ha_service", "")
        ha_entity_id = button.get("ha_entity_id", "")
        ha_data = button.get("ha_data", {})

        if not ha_url or not ha_token or not ha_service:
            raise QuickActionsError(
                f"Button '{button['label']}' is missing Home Assistant configuration."
            )

        service_parts = ha_service.split(".", 1)
        if len(service_parts) != 2:
            raise QuickActionsError(
                f"Invalid Home Assistant service format: {ha_service}"
            )

        domain, service = service_parts
        payload = {"entity_id": ha_entity_id}
        if ha_data and isinstance(ha_data, dict):
            payload.update(ha_data)

        url = f"{ha_url}/api/services/{domain}/{service}"
        headers = {
            "Authorization": f"Bearer {ha_token}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=10,
                allow_redirects=False,
            )
            if response.status_code == 401:
                raise QuickActionsError("Home Assistant rejected the access token.")
            if response.status_code == 404:
                raise QuickActionsError(
                    f"Service '{ha_service}' not found in Home Assistant."
                )
            if response.status_code >= 400:
                raise QuickActionsError(
                    f"Home Assistant returned HTTP {response.status_code}."
                )
            return {
                "status": "success",
                "message": f"Home Assistant {ha_service} executed for {ha_entity_id or 'service'}.",
            }
        except requests.RequestException as exc:
            raise QuickActionsError(
                "Could not reach Home Assistant. Check the address and network."
            ) from exc


def setup(context):
    """Set up the Quick Actions add-on."""
    addon = QuickActionsAddon(context)
    prefix = f"/api/addons/{context.addon_id}"
    endpoint_prefix = f"addon_{context.addon_id.replace('-', '_')}"

    def safely(operation):
        try:
            return jsonify(operation())
        except QuickActionsError as exc:
            return jsonify({"error": str(exc)}), 400

    def get_state():
        return jsonify(addon.public_state())

    def update_config():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict) or "buttons" not in payload:
            return jsonify({"error": "Expected a JSON object with a 'buttons' array."}), 400
        return safely(lambda: addon.update_buttons(payload["buttons"]))

    def execute():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict) or "button_id" not in payload:
            return jsonify({"error": "Expected a JSON object with a 'button_id' field."}), 400
        surface = payload.get("surface", "petey_desktop")
        return safely(lambda: addon.execute_button(payload["button_id"], surface=surface))

    routes = (
        ("/state", "state", ["GET"], get_state),
        ("/config", "config", ["PUT"], update_config),
        ("/execute", "execute", ["POST"], execute),
    )

    for path, name, methods, handler in routes:
        context.app.add_url_rule(
            f"{prefix}/{path}",
            endpoint=f"{endpoint_prefix}_{name}",
            view_func=handler,
            methods=methods,
        )

    return addon
