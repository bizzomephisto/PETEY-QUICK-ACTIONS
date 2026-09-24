# Quick Actions for PETEY

[![PETEY Desktop](https://img.shields.io/badge/PETEY_Desktop-v0.19.0--experimental.1%2B-7f5af0)](https://github.com/bizzomephisto/PETEY-DESKTOP)
[![Release](https://img.shields.io/github/v/release/bizzomephisto/PETEY-QUICK-ACTIONS)](https://github.com/bizzomephisto/PETEY-QUICK-ACTIONS/releases/latest)
[![Tests](https://github.com/bizzomephisto/PETEY-QUICK-ACTIONS/actions/workflows/test.yml/badge.svg)](https://github.com/bizzomephisto/PETEY-QUICK-ACTIONS/actions/workflows/test.yml)

Add up to four customizable buttons beside PETEY's desktop chat composer and in compact mobile and Visual Mode menus. Button commands stay hidden while PETEY's response appears in chat and follows the normal speaker mute setting.

## Features

- Send a saved message silently to PETEY and show only the response.
- Start a saved task without adding the command to the chat feed.
- Call a configured Home Assistant service directly, then have PETEY confirm it.
- Speak PETEY's response when the current client is not muted.
- Show only configured, enabled buttons.
- Keep mobile controls compact inside a single lightning menu.
- Store configuration privately in PETEY's add-on data folder.
- Never return saved Home Assistant tokens through the add-on API.

## Requirements

- [PETEY Desktop v0.19.0-experimental.1 or newer](https://github.com/bizzomephisto/PETEY-DESKTOP/releases)
- The `requests` package included with PETEY
- A Home Assistant long-lived access token only when using Home Assistant actions

## Install

1. Download `petey-quick-actions-v0.3.0.zip` from the [latest release](https://github.com/bizzomephisto/PETEY-QUICK-ACTIONS/releases/latest).
2. Extract the archive. It contains one folder named `quick-actions`.
3. In PETEY, open **Add-ons** and select **Open add-ons folder**.
4. Copy the complete `quick-actions` folder into that directory.
5. Return to PETEY, enable **Quick Actions**, and restart PETEY.

For a source checkout, copy this repository's contents into a folder named `quick-actions` under PETEY's add-ons directory.

## Configure buttons

Open PETEY's **Quick Actions** add-on screen. Each button supports a label, icon, enabled state, and one of three action types:

- **Text Command** privately sends the saved message to PETEY.
- **Task** privately sends the saved task to PETEY.
- **Home Assistant API Call** calls a service such as `light.turn_on` for an optional entity ID, then asks PETEY to confirm the result.

Quick Actions never insert their saved command into the visible feed. PETEY's response is saved in the active conversation and appears on connected clients. Automatic speech uses the same speaker mute control as an ordinary chat response.

Save each button after editing it. A configured button appears above the desktop composer. On mobile chat and Visual Mode, select the lightning button to open the compact action menu.

## Home Assistant actions

For a Home Assistant button, enter:

- The Home Assistant address, such as `http://homeassistant.local:8123`.
- A long-lived access token.
- A service in `domain.service` form, such as `light.turn_on`.
- An optional entity ID, such as `light.living_room`.

Quick Actions sends the configured request directly from the PETEY computer. The browser never receives the saved token. Configuration is written with owner-only permissions where the platform supports them.

Use the dedicated [PETEY Home Assistant add-on](https://github.com/bizzomephisto/PETEY-HOME-ASSISTANT) when you want conversational entity discovery, live status, proposals, and model-controlled device actions.

## Development

The manifest targets PETEY add-on API version `1`. To run the tests beside a PETEY Desktop checkout:

```bash
PYTHONPATH=/path/to/PETEY-DESKTOP python -m unittest discover -s tests -v
```

See PETEY's [add-on authoring contract](https://github.com/bizzomephisto/PETEY-DESKTOP/blob/main/docs/addons.md) for host behavior and security requirements.
