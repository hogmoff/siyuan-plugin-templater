Englische Doku: https://github.com/hogmoff/siyuan-plugin-templater/blob/main/README.md
Chinesische Doku: https://github.com/hogmoff/siyuan-plugin-templater/blob/main/README_zh_CN.md

# Templater für SiYuan

![Vorschau](preview.png)

## Überblick
Regelbasierte Vorlagen für neue Dokumente. Passe anhand von Notebook + Pfad (Regex) verschiedene Vorlagen an, verschiebe/benenne das Dokument optional um, setze ein Icon und führe Hilfsfunktionen aus. Zusätzlich kannst du pro Regel eine Tastenkombination hinterlegen, um sofort ein neues Dokument mit Vorlage zu erstellen.

## Funktionen
- Regeln: Unterschiedliche Vorlagen abhängig von Notebookname + Pfad (Regex).
- Hotkey je Regel: Kombination drücken und sofort ein neues Dokument erzeugen.
- Speicherpfad: Mit Sprig-Ausdrücken gerendert; fehlende Ordner werden automatisch angelegt.
- Icons: Emoji wählen oder dynamisches SVG-Icon generieren.
- Erweiterte Funktionen: z. B. benutzerdefinierte Attribute setzen.
- Einstellungen: Regeln bequem in einer scrollbaren Tabelle und einem Bearbeitungsdialog verwalten.

## Installation
Über den SiYuan‑Marktplatz installieren oder selbst bauen:

```bash
git clone https://github.com/hogmoff/siyuan-plugin-templater.git
cd siyuan-plugin-templater
npm install
npm run build
```

## Schnellstart
1) Plugin in SiYuan aktivieren.
2) Templater‑Einstellungen → „Regelverwaltung öffnen“.
3) Regel hinzufügen: Pfad‑Regex, Vorlage, optional Speicherpfad, Icon, Hotkey.
4) Speichern. Die Regelübersicht zeigt alle Einträge; mit horizontalem Scrollen sind alle Spalten sichtbar.

## Vorlagenregeln
Eine Regel enthält:
- Pfad‑Regex *: Abgleich gegen „NotebookName/relativer/Elternpfad“.
  - Wichtig: Um Dokumente INNERHALB eines Ordners zu matchen, nutze `.*` direkt nach dem Ordnernamen (ohne abschließenden Slash).
  - ✅ Richtig: `Workspace/Manager.*` matcht Dokumente in `/Workspace/Manager/`
  - ❌ Falsch: `Workspace/Manager/.*` matcht nicht (extra Slash bricht das Pattern)
- Vorlage *: Voller Pfad zur Vorlagendatei inklusive `.md` Endung, relativ zum Workspace-Root. Beispiel: `data/templates/meeting.md`.
- Beschreibung *: Freitext zur Regel.
- Speicherpfad (optional): Wenn gesetzt, wird das neue Dokument hier erstellt/verschoben. Wenn leer, wirst du nach dem Namen gefragt und das Dokument bleibt im aktuellen Verzeichnis.
- Icon (optional): Emoji oder dynamisches SVG.
- Hotkey (optional): Tastenkombination zum sofortigen Erstellen eines neuen Dokuments nach dieser Regel.

Hinweise
- Mit * markierte Felder sind Pflichtfelder.
- Regex entspricht JavaScript RegExp. Der Abgleich erfolgt gegen den zusammengesetzten Pfad `<NotebookName>/<menschlicher Elternpfad>`.
- Verwenden mehrere Regeln dieselbe Tastenkombination, gilt die zuletzt gelistete.

## Speicherpfad (Sprig)
Der Speicherpfad unterstützt [Sprig](https://masterminds.github.io/sprig/)-Funktionen (z. B. Datum/Zeit). Nicht vorhandene Ordner werden automatisch angelegt.

Beispiele
- `/Meeting/{{now | date "2006/01"}}/Meeting {{now | date "2006-01-02"}}`
  → erzeugt: `/Meeting/20xx/xx/Meeting 20xx-xx-xx` (im aktiven Notebook)
- `MeinNotizbuch/Inbox/{{now | date "2006-01"}}` → beschränkt auf Notebook „MeinNotizbuch“.

Ist der Speicherpfad leer, wirst du nach einem Dokumentnamen gefragt, und das Dokument bleibt im aktuellen Ordner.

## Icons
Zwei Varianten:
- Emoji: Im Dialog ein Emoji wählen; wird als Codepoint gespeichert.
- Dynamisch: Zum Tab „Dynamische Icons“ wechseln, Farbe/Sprache/Datum/Typ/Inhalt wählen; das Plugin generiert und setzt ein SVG.

## Hotkeys
Pro Regel optional eine Tastenkombination. Beim Drücken wird sofort ein neues Dokument nach dieser Regel erstellt:
- Format: z. B. `Ctrl+Alt+T`, `Shift+Meta+N` (Meta = Cmd auf macOS).
- Gültigkeit: Bezieht sich auf das aktuell aktive Notebook (zuletzt fokussierter Editor).
- Schutz: In Eingabefeldern oder ContentEditable‑Bereichen werden Hotkeys ignoriert.
- Konflikte: System-/SiYuan‑Shortcuts können die Ausführung verhindern – ggf. andere Kombination wählen.

## Erweiterte Funktionen
Funktionen werden in der Vorlage auf einer separaten Zeile zwischen Markern notiert:

```
<% function1 function2 %>
```

Derzeit verfügbar
- Benutzerdefinierte Attribute: Mit Sprig kombinierbar, z. B.:
```
<% custom-dailynote-{{now | date "20060102"}}={{now | date "2006-01-02"}} %>
```

## Einstellungsoberfläche
- „Regelverwaltung öffnen“ zeigt den Bearbeitungsdialog mit:
  - Pfad‑Regex, Vorlage, Beschreibung, Speicherpfad, Icon, Hotkey.
  - Emoji‑Picker und Generator für dynamische Icons.
  - Hotkey: Feld anklicken und Tasten drücken; mit „Clear“ löschen.
- Die Regel‑Tabelle besitzt eine horizontale Scrollleiste, linke Ausrichtung und sichtbare Gitterlinien.

## Fehlerbehebung
- Vorlage greift nicht: Regex und Vorlagenpfad prüfen.
- Speicherpfad fehlt: Sprig‑Ausgabe und ggf. Notebook‑Name prüfen.
- Icon wird nicht gesetzt: Dynamische Icon‑URL erzeugen und erneut testen.
- Hotkey reagiert nicht: OS/SiYuan‑Reservierungen meiden; sicherstellen, dass ein Editor aktiv ist.

## Sprachen
- Deutsch, Englisch, Chinesisch (Verbesserungen per PR willkommen).

## Lizenz & Danksagungen
- Icon von Freepik: https://de.freepik.com/icon/wegweiser_3501183
- Inspiriert von: https://github.com/SilentVoid13/Templater
