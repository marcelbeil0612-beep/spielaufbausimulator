# Domain – Spielaufbau-Simulator

> Arbeitsgrundlage für den didaktischen, regelbasierten Fußball-Taktik-Simulator.
> Kein Match-Simulator, kein FIFA – sondern ein **Lehr-Simulator**.

---

## 1. Was wird simuliert?

Ein **Fußball-Spielfeld im 11-gegen-11** mit Fokus auf:

- **Spielaufbau** des eigenen Teams,
- **Pressing-Reaktion** des gegnerischen Teams,
- **Passoptionen** und deren Qualität nach einer Aktion.

Die Simulation ist **regelbasiert**, nicht physikalisch und nicht KI-gestützt.

## 2. Zielnutzer

| Priorität | Nutzergruppe | Nutzung |
|---|---|---|
| primär | Jugend- und Amateurtrainer | taktische Situationen anschaulich erklären |
| später | Spieler | Situationen selbst verstehen / nachvollziehen |

## 3. Didaktische Ziele

Der Nutzer soll sichtbar machen können, …

- wie sich Gegner **nach einem Pass verschieben**,
- welche **Passoptionen** offen oder zugestellt sind,
- wie **Pressing in verschiedenen Höhen** wirkt,
- warum **breite vs. enge Positionen** im Aufbau etwas verändern,
- wie **erster Kontakt / offene Stellung / Druck** die Folgeoptionen beeinflussen.

## 4. Simulationsmodell

- **Diskrete, nachvollziehbare Schritte** (keine Echtzeit-Physik).
- Nach einer **Nutzer-Aktion** wird eine **Gegner-Reaktion** nach festen Regeln ausgelöst.
- Animationen sind **optional und später** – die Logik bleibt regelbasiert.

### Begriffe

- **Szene**: Zustand zu einem Zeitpunkt (Ballträger, Positionen beider Teams, Pressing-Art, Höhe, Phase).
- **Aktion**: Eingriff des Nutzers (z. B. Pass, Mitnahme, Positionswechsel).
- **Reaktion**: regelbasierte Antwort der Gegner-Simulation.
- **Bewertung**: Qualitätsaussage zur neuen Szene (s. u.).

## 5. Bewertungsdimensionen

Nach einer Aktion bewertet das System die Folgeszene vierstufig
(`sim/evaluate.ts`):

| Label | Bedingung |
|---|---|
| `open` | 0 Gegner im `PRESSURE_RADIUS` |
| `pressure` | genau 1 Gegner im `PRESSURE_RADIUS` |
| `risky` | ≥ 2 Gegner im `PRESSURE_RADIUS`, oder `firstTouch='dirty'`, oder `accuracy='imprecise'` |
| `loss-danger` | ≥ 3 Gegner im `PRESSURE_RADIUS`, oder (Gegner im `CLOSE_CONTACT_RADIUS` **und** `firstTouch='dirty'`) |

Priorität: `loss-danger` > `risky` > `pressure` > `open`.

**Spätere Visualisierung**: grün / gelb / rot. Optional kurze Coaching-Hinweise.

### Pass-Attribute (`PassOptions`, Scene.lastPass)

| Feld | Werte | Default |
|---|---|---|
| `velocity` | `'sharp' \| 'normal' \| 'soft'` | `'normal'` |
| `accuracy` | `'precise' \| 'neutral' \| 'imprecise'` | `'neutral'` |

### Empfänger-Attribute (`Reception`, Scene.lastReception)

| Feld | Werte | Default |
|---|---|---|
| `firstTouch` | `'clean' \| 'neutral' \| 'dirty'` | `'neutral'` |
| `stance` | `'open' \| 'closed'` | `'closed'` |

## 6. Persistenz (Stand MVP)

- **Lokal im Browser** über `state/persistence.ts`.
- Aktueller Storage-Key: `spielaufbau:scene:v2`. Schlüssel
  `spielaufbau:scene:v1` wird beim Laden als Fallback gelesen und
  migriert (fehlendes `pressIntensity` → Default `high`).
- Parse- oder Strukturfehler fallen schweigend auf `createInitialScene()` zurück.
- **Keine** Accounts, Cloud, Mehrbenutzer, DB-Pflicht.

## 7. Plattform

- **Mobile-first**, aber **Desktop ebenso wichtig** (Trainer-Arbeitsplatz).
- **Keine Offline-Pflicht** in V1.

## 8. Regelquelle

- **Keine** externe Datenquelle.
- Regeln projektspezifisch, konfigurierbar.
- Erste Version orientiert sich an **allgemeinen Fußballprinzipien** für Aufbau und Pressing.

## 9. MVP-Fall (der erste konkrete Lehrfall)

| Aspekt | Wert |
|---|---|
| eigenes System | 4-3-3 im Aufbau |
| gegnerisches System | 4-4-2 im hohen Pressing |
| Start | Ball beim Torwart |
| erste Aktion | Pass TW → linker Innenverteidiger |

**Sichtbar werden soll nach der Aktion:**

- welcher Gegner presst,
- welche Gegner nachschieben,
- welche Passlinien zugestellt werden,
- welche Anschlussoptionen offen bleiben.

## 10. Vergleichsfälle

Derselbe Lehrfall, variiert über umschaltbare Startvarianten
(`domain/startVariants.ts`, Action `setVariant`):

- **LIV eng** (`narrow`, Default): LIV bei x=36 (Standardposition in der
  4-3-3).
- **LIV breit** (`wide`): LIV bei x=22, näher zur Außenlinie.

Didaktisch sichtbar wird nach dem Pass TW → LIV:

- der ballnahe Stürmer muss für die breite Variante einen deutlich größeren
  Laufweg zurücklegen, bevor er auf `PRESS_DISTANCE` steht,
- die Passlinien ins zentrale Mittelfeld ändern sich (Winkel, Länge),
- das umliegende Raumangebot um LIV unterscheidet sich.

Geplante weitere Varianten:

- erster Kontakt **sauber** ↔ **neutral** ↔ **unsauber**,
- Passschärfe / Genauigkeit pro Aktion.

## 10a. Gegner-Systeme

Auswählbar über `domain/formations/` (Action `setAwayFormation`):

| Muster | Beschreibung | Presser | Zentrum-Cover |
|---|---|---|---|
| `4-4-2` | Doppelspitze, zwei Stürmer auf gleicher Höhe | nächster `ST` | zweiter `ST` |
| `4-2-3-1` | Raute mit Doppelsechs, hängender Zehn | ballnaher `CDM` | `CAM` |
| `5-3-2` | Fünferkette, tiefer Block | nächster `ST` | zweiter `ST` |

Die zugehörige Presshöhe (`Scene.pressIntensity`,
`domain/pressIntensity.ts`) skaliert drei Konstanten gleichzeitig:

| Intensität | `press` (Zielabstand) | `cover` (Schritt) | `line` (Rückzug) |
|---|---|---|---|
| `high` | ×1.0 (Status quo) | ×1.0 | ×1.0 |
| `mid` | ×1.5 (lockerer) | ×0.7 | ×0.7 |
| `low` | ×2.5 (tiefer Block) | ×0.4 | ×0.4 |

Didaktisch sichtbar: in 4-2-3-1 bleiben beide Stürmer vorne, der
Sechser rückt heraus – im 5-3-2 hingegen trägt die Doppelspitze den
Zugriff und die Fünferkette sichert nach hinten.

## 11. Scope-Grenzen (explizit nicht im Start)

- Benutzerkonten, Cloud, Teamverwaltung
- PDF-Export, Mehrbenutzer
- vollständige Simulationsengine für alle Systeme
- freie Zeichenfunktionen
- zu viele Pressing-Arten gleichzeitig

## 12. Start-Scope (explizit drin)

1. Projekt-Fundament (Scaffold, Architektur, Tooling).
2. Taktikboard (Rendering des Feldes).
3. Formationen (Datenmodell + Rendering).
4. Szenen (Zustand zu einem Zeitpunkt).
5. Passauswahl (erste Interaktion).
6. **Ein** regelbasierter Simulationsfall (MVP-Fall aus §9).
