# Changelog

## v0.4.0 — 2026-09-24

- Put configured desktop actions in PETEY's Command Center rail when the rail is enabled.
- Restore the existing composer and Visual Mode lightning menus when the rail or its Add-on controls are disabled.
- React immediately to rail preference and desktop/mobile viewport changes without restarting PETEY.
- Prevent repeated clicks from sending the same action more than once while it is running.

## v0.3.0 — 2026-09-23

- Deliver saved commands and tasks through PETEY's hidden add-on event channel.
- Keep button commands out of the visible chat feed while retaining PETEY's reply.
- Request normal reply speech while respecting the client speaker mute setting.
- Let PETEY briefly confirm successful direct Home Assistant actions.

## v0.2.0 — 2026-09-23

- Move desktop actions into a compact composer menu beside the attachment control.
- Place the mobile shortcut inside PETEY's collapsible bottom action dock.
- Keep actions usable in Visual Mode while avoiding overlap with chat controls.

## v0.1.0 — 2026-09-22

- Add four configurable quick-action buttons.
- Place actions above desktop chat and in compact mobile and Visual Mode menus.
- Support PETEY text commands, tasks, and direct Home Assistant service calls.
- Store Home Assistant credentials privately and redact them from API responses.
