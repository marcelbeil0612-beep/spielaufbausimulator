# Status – Spielaufbau-Simulator

> Laufendes Status-Dokument. Wird nach jedem größeren Arbeitsblock gepflegt.
> Für fachliche Details: `docs/DOMAIN.md`. Für Architektur: `docs/ARCHITECTURE.md`.
> Für Phasen-Plan: `docs/ROADMAP.md`.

**Letzte Aktualisierung:** 2026-04-13 (Track A: Stance/Refactor/IV-hoch/a11y)

---

## Metriken

| | |
|---|---|
| Tests | 105 grün (16 Dateien) |
| Typecheck | grün |
| Lint | grün |
| Production-Build | 158.15 kB / **51.06 kB gzip** |
| Dev-Smoke | `/` + `/src/App.tsx` + `/src/ui/Pitch.tsx` = 200 |

---

## Phasenstand

- **Phase 0 – Fundament**: ✅ abgeschlossen.
- **Phase 1 – Taktikboard**: ✅ abgeschlossen (4-3-3 und 4-4-2 fest verdrahtet).
- **Phase 2 – Erste Interaktion**: ✅ Passauswahl, Reducer, lokale Persistenz (Modul).
- **Phase 3 – Regel-Engine**: ✅ 3 Regeln, 4-stufige Bewertung, Pass-Vorschau
  inkl. UI-Integration (Preview-Ring auf Hover/Focus).
- **Phase 4 – Vergleichsfälle**: 🟢 drei Varianten (`LIV eng` / `LIV breit` /
  `IV-Linie hoch`), `Erster Kontakt`, `Passschärfe`, `Passgenauigkeit`,
  `Körperstellung` wirken auf Evaluate und Preview-Ringe.

---

## Letzter Arbeitsblock

**Track A – a11y-Pass + Picker-Refactor** (2026-04-13)

- Alle fünf Pill-Toggle-Picker (Variant/FirstTouch/PassVelocity/PassAccuracy/
  Stance) teilen sich jetzt eine gemeinsame `RadioPillGroup`-Komponente mit
  ARIA-konformer Tastaturbedienung: Roving tabindex, Pfeiltasten links/oben ↔
  rechts/unten zyklisch, Home/End für Ränder.
- Pitch-Heimspieler bekommen einen dedizierten dashed Focus-Ring
  (`.focusRing`), der nur bei `:focus-visible` erscheint – Tastatur-Nutzer
  unterscheiden Fokus klar vom Hover-Zustand.
- Picker-Dateien sind jetzt ~15-Zeilen-Wrapper um `RadioPillGroup`;
  Duplikation auf ein Fünftel reduziert.
- Status-Doku aktualisiert.

**Vorher: Track A – dritte Startvariante „IV-Linie hoch"** (2026-04-13)

- `StartVariant` um `'high'` erweitert. In dieser Variante rücken **beide**
  Innenverteidiger (LCB + RCB) symmetrisch auf y=30 – aggressive, hohe
  Abwehrlinie mit größerem Abstand zum TW.
- `applyStartVariant` datengetrieben über eine Overrides-Tabelle pro
  IV-Slot; die drei Varianten stehen sauber nebeneinander ohne Branch-Geflecht.
- Persistenz-Schema akzeptiert `'high'`. VariantPicker rendert die dritte
  Option automatisch über `START_VARIANTS`.

**Vorher: Track A – isLossDanger-Detektor extrahiert** (2026-04-13)

- Die fünf Ballverlust-Pfade in `evaluate` leben jetzt in einem kleinen,
  dokumentierten `isLossDanger(signals)` mit fester Priorität
  (≥3 Presser → Nahkontakt+dirty → sharp+dirty →
  sharp+imprecise+Presser → closed+dirty+Presser). Semantik unverändert.
- `evaluate()` bleibt linear lesbar: Signale sammeln → loss-danger prüfen →
  risky/pressure/open herleiten.

**Vorher: Track A – Stance wirkt in `evaluate`** (2026-04-13)

- `Scene.stancePlan: Stance` als didaktischer Vorab-Wert. Reducer-Action
  `setStancePlan`, `reset`/`setVariant` erhalten den Plan, Persistenz-Schema
  erweitert.
- Neue `StancePicker`-Pill-Toggle („offen" / „geschlossen") im App-Header.
- `evaluate`-Regeln:
  - `closed + dirty + ≥ 1 Presser` ⇒ `loss-danger` (Empfänger dreht sich
    blind in den Gegner rein).
  - `open` entschärft analog zu `soft` einen reinen Ungenauigkeitsfehler
    bei ≤ 1 Presser und nicht dirty – offene Stellung gibt Übersicht.

**Vorher: Passschärfe in `evaluate` wirksam** (2026-04-13)

- `sim/evaluate.ts` liest jetzt auch `scene.lastPass?.velocity`.
- Neue Eskalationsregeln (beide direkt auf `loss-danger`):
  - `sharp + dirty` – scharfer Pass plus unsaubere Annahme ist ein klassischer
    Ballverlust-Pfad, unabhängig von Nahkontakt.
  - `sharp + imprecise + ≥ 1 Presser` – unter Pressingzugriff fehlt dem
    Empfänger die Zeit, einen scharfen, ungenauen Pass zu kontrollieren.
- Neue Entschärfungsregel: `soft + imprecise` mit ≤ 1 Presser und nicht dirty
  bleibt auf dem Pressing-Niveau (statt `risky`), weil der Empfänger mehr Zeit
  hat. Bei dirty oder ≥ 2 Pressern greift die Entschärfung bewusst nicht.
- `normal` bleibt neutral, alle bestehenden Testfälle unverändert.
- Keine Änderungen an Reducer/State/UI nötig – der vorhandene Picker wirkt
  durch den erweiterten Reducer-Default plus diese Regel sofort sichtbar.

**Vorher: Pass-Attribute im UI** (2026-04-13)

- `Scene.passPlan: PassOptions` als didaktischer Vorab-Wert neben `variant`
  und `firstTouchPlan`. `createInitialScene(variant?, firstTouchPlan?, passPlan?)`.
- Reducer-Actions `setPassVelocity` und `setPassAccuracy`. `pass` verwendet
  `state.passPlan` als Default; `reset`/`setVariant` erhalten den Plan.
- `simulatePassPreview` fällt auf `scene.passPlan` zurück — Vorschau-Ringe
  reagieren sofort auf Änderungen von Genauigkeit/Schärfe.
- Persistenz-Schema-Check um `passPlan` (Objekt aus `velocity` + `accuracy`)
  erweitert.
- `domain/pass.ts`: `PASS_VELOCITIES`, `PASS_ACCURACIES` und Label-Maps für UI.
- UI: zwei neue Pill-Toggles `PassVelocityPicker` („weich / normal / scharf")
  und `PassAccuracyPicker` („präzise / neutral / ungenau") im Header, gleiches
  Styling wie `VariantPicker`/`FirstTouchPicker`, reflowen auf Mobile.

Didaktische Wirksamkeit: Genauigkeit ist bereits in `evaluate` integriert
(`imprecise` → mindestens `risky`) und verändert die Preview-Ringe sofort.
Passschärfe (`velocity`) wird zwar persistiert und in `lastPass` geführt,
fließt bisher **nicht** in die Bewertung ein — ist unten als Restpunkt
markiert.

**Vorher: Vergleichsfall „Erster Kontakt sauber ↔ unsauber"** (2026-04-13)

- `Scene.firstTouchPlan: FirstTouch` als didaktischer Vorab-Wert neben
  `variant`. `createInitialScene(variant?, firstTouchPlan?)` berücksichtigt ihn.
- Reducer-Action `setFirstTouchPlan`. `pass` benutzt ihn als Default für die
  `lastReception.firstTouch`, sofern die Action selbst nichts angibt.
  `reset` / `setVariant` erhalten den Plan.
- `simulatePassPreview` fällt auf `scene.firstTouchPlan` zurück, sodass der
  Preview-Hover-Ring die Wirkung des gewählten Kontakts sofort visualisiert.
- `domain/reception.ts`: Label-Map `FIRST_TOUCH_LABELS` und
  `FIRST_TOUCHES`-Liste; UI-unabhängig.
- UI: neuer `FirstTouchPicker` (Radio-Pill-Toggle, gleiches Styling wie
  `VariantPicker`) im App-Header neben der Varianten-Auswahl.
- Persistenz-Schema-Check um `firstTouchPlan` erweitert.
- `evaluate` war bereits 4-stufig vorbereitet (dirty → risky, dirty + close
  contact → loss-danger), es musste keine Sim-Logik ergänzt werden.

Didaktik: Wechsel zwischen „sauber", „neutral" und „unsauber" hebt die
Preview-Ringe der Mitspieler sichtbar in höhere Stufen – insbesondere Pässe
in enge Räume kippen bei „unsauber" direkt auf `risky` bzw. `loss-danger`,
ohne Magic-Numbers zu verändern.

**Vorher: Persistenz an `useScene` angeschlossen** (2026-04-13)

- `state/useScene.ts`: Lazy-Init per `loadScene()` statt `createInitialScene`,
  `useEffect` speichert jede Szenen-Änderung via `saveScene(scene)`.
- Kein neues API, keine neuen Deps. Persistenz-Modul war bereits vollständig
  getestet (Round-Trip, kaputter JSON, Schema-Fehlschlag, fehlendes Storage),
  Hook ist 3-Zeilen-Wrapper darum – Verhalten kombiniert vorhandene Tests.
- Fehlerpfade unverändert: Parse-/Schema-Fehler, Quota, Private-Mode → stille
  Rückfall-Strategie auf `createInitialScene()`.

**Vorher: Preview-Hover-UI** (2026-04-13)

- `App.tsx`: berechnet `previewRatings: Record<string, Rating>` per
  `simulatePassPreview` für alle Heimspieler außer Ballträger und reicht sie
  an `Pitch` durch.
- `ui/Pitch.tsx`: neue Prop `previewRatings`, `HomeMarker` rendert im
  Nicht-Holder-Zweig einen farbigen `previewRing` (Klassen `previewRingOpen/
  Pressure/Risky/Loss`) und erweitert das `aria-label` um die vorab sichtbare
  Bewertung („Pass an LIV – Vorschau: offen").
- `ui/Pitch.module.css`: `.previewRing` defaultmäßig `opacity: 0`, wird per
  `:hover` / `:focus-visible` auf `0.9` geblendet (120 ms Fade, `pointer-events:
  none`). Farbvarianten nutzen die bestehenden Rating-Tokens.

Dadurch wird der Vergleich „eng ↔ breit" spürbar: hoverend über denselben
LIV in beiden Varianten zeigt der Ring bereits vor dem Klick, welche Passoption
unter Druck steht und welche offener ist – ohne Rating-Differenzen künstlich
zu konstruieren.

**Vorher: Vergleichsfall „LIV breit vs eng"** (2026-04-13)

- `domain/startVariants.ts`: `StartVariant` (`narrow` | `wide`),
  `applyStartVariant`.
- `Scene.variant` wird geführt; `createInitialScene(variant?)` berücksichtigt
  sie.
- Reducer-Action `setVariant`; `reset` behält die aktuelle Variante.
- UI: `VariantPicker` im App-Header, Hinweistext angepasst.
- Persistenz-Schema-Check um `variant` ergänzt.

---

## Was ist drin

**Domain (`src/domain`)**
- Typen, `Scene`, `Player`, `Team`, `RoleCode` (`types.ts`).
- Formationen 4-3-3 / 4-4-2 (`formations.ts`).
- Team-Spiegelung für Auswärtsteam (`team.ts`).
- Geometrie-Helpers `distance`, `pressPosition` (`geometry.ts`).
- Linien-Modell `getLines(team)` (`lines.ts`).
- Pass- und Empfänger-Attribute: `PassOptions`, `Reception`, jeweilige Defaults.
- Start-Varianten: `StartVariant`, `applyStartVariant`, Label-Map.

**Simulation (`src/sim`)**
- Regel-Split in `sim/rules/`:
  - `pressBallHolder` (`PRESS_DISTANCE=8`)
  - `coverCenter` (`COVER_CENTER_SHIFT=4`)
  - `compactLine` (`LINE_RECOVERY_OFFSET=4`)
- `reactTo` ist reine Komposition der drei Regeln.
- `evaluate` vier-stufig (`open` / `pressure` / `risky` / `loss-danger`) mit
  `PRESSURE_RADIUS=12`, `CLOSE_CONTACT_RADIUS=5`.
- `linesBroken(fromY, toY, opp, side)` zählt 0..3 überspielte Linien.
- `simulatePassPreview(scene, targetId, options?)`: pure Vorschau ohne
  State-Änderung.

**State (`src/state`)**
- `sceneReducer` mit Actions `pass` (inkl. velocity/accuracy/firstTouch/stance),
  `reset`, `setVariant`, `setFirstTouchPlan`, `setPassVelocity`,
  `setPassAccuracy`, `setStancePlan`.
- `useScene` (React `useReducer`, Lazy-Init).
- `persistence.ts`: `localStorage` unter Key `spielaufbau:scene:v1` mit
  Schema-Check (inkl. `variant`) und Fallback auf `createInitialScene()`.
- `useScene` lädt initial per Lazy-Init aus `localStorage` und speichert nach
  jeder Zustandsänderung automatisch.

**UI (`src/ui`)**
- SVG-Pitch (68×105, mobile-first, responsiv bis 540 px Desktop).
- Pass per Klick/Tastatur auf Heimspieler.
- Ring um Ballträger in allen vier Rating-Farben (`tokens.css`).
- `RatingBadge` mit allen vier Varianten.
- `VariantPicker`: Pill-Toggle „LIV eng" / „LIV breit" / „IV-Linie hoch".
- `FirstTouchPicker`: Pill-Toggle „sauber" / „neutral" / „unsauber".
- `PassVelocityPicker` / `PassAccuracyPicker`: Pill-Toggles für Passschärfe
  und -genauigkeit, wirken auf `scene.passPlan` und damit auf Preview/Pass.
- `StancePicker`: Pill-Toggle „offen" / „geschlossen".
- Alle fünf Picker teilen `RadioPillGroup` mit ARIA-radiogroup +
  Pfeiltasten-Navigation (Roving tabindex).

---

## Was fehlt (nach Priorität)

1. **Formations- und Pressing-Höhen-Wahl**: weitere Systeme, andere Presshöhen.
2. **Nebeneinanderstellung von Szenen**: zwei Varianten gleichzeitig rendern
   für direkten visuellen Vergleich.
3. **Animationen** für Gegner-Verschiebung (bewusst spät).

---

## Konventionen & Leitplanken (Kurzfassung)

- 4-Schicht-Import-Regel: `ui → state → sim → domain`, nie aufwärts.
- Keine neuen Laufzeit-Abhängigkeiten ohne Grund.
- Mobile-first, CSS Modules + CSS Custom Properties, kein UI-Framework.
- Welt-Koordinaten x,y ∈ [0, 100]; Heim-Tor bei y=0; SVG-Mapping in
  `ui/pitchGeometry.ts`.
- Regeln sind reine `Scene → Scene`-Funktionen.
- Tests liegen neben dem Code (`*.test.ts`), ein Testziel pro Block.
- Start-Varianten: zentral in `domain/startVariants.ts`, keine per-Call-Magic.
