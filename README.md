中文文档: https://github.com/hogmoff/siyuan-plugin-templater/blob/main/README_zh_CN.md
Deutsch: https://github.com/hogmoff/siyuan-plugin-templater/blob/main/README_de_DE.md

# Templater for SiYuan

![Preview](preview.png)

## Overview
Rule-based templating for new documents. Match the target path (and notebook) with a regex, insert a template, optionally move/rename the doc, set an icon, and run helper functions. You can also bind a hotkey per rule to create a new templated document instantly.

## Features
- Rule-based matching: Apply different templates based on notebook + path (regex).
- Hotkey per rule: Press a key combo to create a new doc using the rule.
- Destination path: Create/move docs to a rendered path using Sprig expressions.
- Icons: Pick an emoji or generate a dynamic SVG icon per rule.
- Extended functions: Run helper actions like setting custom attributes.
- Settings UI: Manage rules with a scrollable table and an editor dialog.

## Installation
Install from the SiYuan Marketplace, or clone and build:

```bash
git clone https://github.com/hogmoff/siyuan-plugin-templater.git
cd siyuan-plugin-templater
npm install
npm run build
```

## Quick Start
1) Enable the plugin in SiYuan.
2) Open Templater Settings → Manage Template Rules.
3) Add a rule: Path Pattern (regex), Template, optional Destination Path, Icon, Hotkey.
4) Save. The rules table lists all rules; scroll horizontally to see all columns.

## Template Rules
Each rule has:
- Path Pattern (regex): Matched against “NotebookName/relative/path/of/parent”. Example: `Work/Meetings/.*`.
- Template: Path to a template file relative to workspace, e.g. `data/templates/meeting.md`.
- Description: Free text to document the rule.
- Destination Path (optional): If set, the new doc is created/moved here. If empty, you’ll be prompted for a name and the doc stays in the current folder.
- Icon (optional): Emoji or dynamic SVG.
- Hotkey (optional): A keyboard combo to create a new templated doc at any time.

Notes
- Regex is JavaScript RegExp. A rule matches the first time its regex tests true against the composite path: `<NotebookName>/<HPath-of-parent>`. For new docs created at notebook root, the `<HPath>` is empty.
- If multiple rules define the same hotkey, the last one in the list wins.

## Destination Path (Sprig)
The destination path supports [Sprig](https://masterminds.github.io/sprig/)'s date/time helpers. Non-existing folders are created automatically.

Examples
- `/Meeting/{{now | date "2006/01"}}/Meeting {{now | date "2006-01-02"}}`
  → creates: `/Meeting/20xx/xx/Meeting 20xx-xx-xx` (in the active notebook)
- `MyNotebook/Inbox/{{now | date "2006-01"}}` → restricts to notebook “MyNotebook”.

When Destination Path is empty, you’ll be asked for the document name and it will remain in the current folder.

## Icons
Two options:
- Emoji: Click the icon button to pick an emoji. It’s saved as a codepoint attribute.
- Dynamic: Switch to “Dynamic Icons”, choose color/lang/date/type/content; the plugin generates and assigns SVG.

## Hotkeys
Add an optional hotkey per rule. Pressing it creates a new document using that rule:
- Format: combinations like `Ctrl+Alt+T`, `Shift+Meta+N` (Meta = Cmd on macOS).
- Scope: Targets the currently active notebook (the last focused editor).
- Safety: Hotkeys are ignored while typing in inputs/contentEditable areas.
- Conflicts: If the combo is used by SiYuan or your OS, the action may not trigger.

## Extended Functions
Place functions on a single line in your template between markers:

```
<% function1 function2 %>
```

Available
- Custom attributes: define block attributes using Sprig, for example:
```
<% custom-dailynote-{{now | date "20060102"}}={{now | date "2006-01-02"}} %>
```

## Settings UI
- Manage Template Rules opens a dialog to add/edit rules. It includes:
  - Path Pattern, Template, Description, Destination Path, Icon, Hotkey.
  - An emoji picker and a dynamic icon generator.
  - Click the Hotkey field and press keys to set; Clear to remove.
- The rules table lists all rules with a horizontal scrollbar. Cells align left and show a full grid.

## Troubleshooting
- Template not applied: check Path Pattern regex and Template path.
- Destination Path not created: verify Sprig output and notebook name (if specified).
- Icon not updated: ensure the dynamic icon URL is generated; try again.
- Hotkey not firing: avoid OS/SiYuan-reserved combos; ensure an editor is active.

## Languages
- English, Chinese, German (translations welcome via PR).

## License & Credits
- Icon from Freepik: https://de.freepik.com/icon/wegweiser_3501183
- Inspired by: https://github.com/SilentVoid13/Templater
