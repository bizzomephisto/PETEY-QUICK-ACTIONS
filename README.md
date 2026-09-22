# Quick Actions for PETEY

[![PETEY Desktop](https://img.shields.io/badge/PETEY_Desktop-v0.19.0--experimental.1%2B-7f5af0)](https://github.com/bizzomephisto/PETEY-DESKTOP)
[![Release](https://img.shields.io/github/v/release/bizzomephisto/PETEY-QUICK-ACTIONS)](https://github.com/bizzomephisto/PETEY-QUICK-ACTIONS/releases/latest)
[![Tests](https://github.com/bizzomephisto/PETEY-QUICK-ACTIONS/actions/workflows/test.yml/badge.svg)](https://github.com/bizzomephisto/PETEY-QUICK-ACTIONS/actions/workflows/test.yml)

Add up to four customizable buttons above PETEY's desktop chat composer and in compact menus at the top of mobile chat and Visual Mode.

## Features

- Send a saved message directly to PETEY.
- Start a saved task through PETEY's normal chat flow.
- Call a configured Home Assistant service directly.
- Show only configured, enabled buttons.
- Keep mobile controls compact inside a single lightning menu.
- Store configuration privately in PETEY's add-on data folder.
- Never return saved Home Assistant tokens through the add-on API.

## Requirements

- [PETEY Desktop v0.19.0-experimental.1 or newer](https://github.com/bizzomephisto/PETEY-DESKTOP/releases)
- The `requests` package included with PETEY
- A Home Assistant long-lived access token only when using Home Assistant actions

## Install

1. Download `petey-quick-actions-v0.1.0.zip` from the [latest release](https://github.com/bizzomephisto/PETEY-QUICK-ACTIONS/releases/latest).
2. Extract the archive. It contains one folder named `quick-actions`.
3. In PETEY, open **Add-ons** and select **Open add-ons folder**.
4. Copy the complete `quick-actions` folder into that directory.
5. Return to PETEY, enable **Quick Actions**, and restart PETEY.

For a source checkout, copy this repository's contents into a folder named `quick-actions` under PETEY's add-ons directory.

## Configure buttons

Open PETEY's **Quick Actions** add-on screen. Each button supports a label, icon, enabled state, and one of three action types:

- **Text Command** sends the saved message through PETEY's normal composer.
- **Task** sends the saved task through the same chat flow.
- **Home Assistant API Call** calls a service such as `light.turn_on` for an optional entity ID.

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
