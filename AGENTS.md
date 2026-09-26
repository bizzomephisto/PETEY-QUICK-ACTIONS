# Quick Actions coding-agent context

Scope: this repository. Current add-on version: 0.4.0; PETEY add-on API: 1.
Read PETEY Desktop's `ADDONS.md` and `docs/addons.md` before changing host contracts.

## Product boundary

Quick Actions stores up to four explicit buttons. A button either emits a hidden
text/task event to PETEY or performs one configured Home Assistant REST service call
and asks PETEY to confirm it. The saved command never appears as a visible user chat
message. PETEY's resulting reply is persisted normally and requested speech obeys
the client speaker state.

## Architecture and data flow

- `petey-addon.json` declares ID `quick-actions`, API 1, and panel assets.
- `addon.py:QuickActionsAddon` owns defaults, validation, private persistence,
  public redaction, execution, and the Home Assistant request boundary.
- `_load()` and `_save()` use `context.data_dir`; `_default_buttons()` defines the
  fixed maximum and stable IDs.
- `update_buttons()` validates label, icon, enabled state, action type, command/task,
  Home Assistant URL, service, entity, and token before atomic persistence.
- `execute_button()` is a direct user gesture. Text/task actions call
  `context.emit_event(..., user_initiated=True)` for the originating desktop/mobile
  surface. Home Assistant actions call `_execute_home_assistant()` first and emit
  only a bounded result prompt.
- `public_state()` must redact tokens and other private credential material.
- `panel.js` renders configuration and registers/removes Command Center actions via
  `window.peteyInterface`; it falls back to compact composer/mobile controls when
  the rail is unavailable.

## Preserve these contracts

- Maximum four stable button records. Reject unknown action types and malformed
  `domain.service` values; do not accept arbitrary methods, paths, or request bodies.
- Home Assistant URLs must be validated HTTP(S) origins. Tokens stay server-side and
  never enter status JSON, emitted prompts, DOM attributes, or logs.
- Only a clicked button may use `user_initiated=True`. Background timers must not
  inherit this authorization or silently call tools.
- Keep hidden user commands out of chat history while persisting PETEY's visible
  response on the requested surface.
- Register interface controls with `addonId: 'quick-actions'`, use `textContent`, and
  clean up registrations when rerendering/unloading.
- Disabled/unconfigured buttons remain absent from all surfaces.
- Runtime configuration belongs in `addon-data/quick-actions`, not source files.

## Task map

| Task | Primary anchors |
| --- | --- |
| Defaults/persistence | `addon.py:_default_buttons`, `_load`, `_save` |
| Validation/redaction | `update_buttons`, `public_state` |
| Hidden PETEY events | `execute_button` |
| Home Assistant calls | `_execute_home_assistant` |
| API routes | `setup` |
| Rail/mobile controls | `panel.js`; structure in `panel.html` |
| Regression coverage | `tests/test_addon.py` |

## Validation

```bash
PYTHONPATH=/path/to/PETEY-DESKTOP python -m unittest discover -s tests -v
python -m py_compile addon.py
python -m json.tool petey-addon.json >/dev/null
node --check panel.js
```

Tests must mock Home Assistant and events. Add regression coverage for every new
field crossing private storage, public JSON, and emitted-event boundaries.
