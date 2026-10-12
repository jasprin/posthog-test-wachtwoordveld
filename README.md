# A/B-test: wachtwoord tonen

Statisch prototype van het PGO-inlogscherm voor een A/B-test met PostHog (EU Cloud).
Er is geen build-stap: de bestanden kunnen zo op GitHub Pages.

Het ontwerp komt uit Claude Design ("Inlogscherm PGO", varianten 1a en 1b). Eén
bewuste afwijking: de velden staan op `autocomplete="off"` in plaats van
`username`/`current-password`, zodat wachtwoordmanagers geen echte wachtwoorden
invullen.

| Bestand | Inhoud |
| --- | --- |
| `index.html` | Inlogscherm |
| `ingelogd.html` | "Je bent ingelogd (dit is een prototype)"; hier kan de survey verschijnen |
| `config.js` | **De enige plek met instellingen**: project-key, host en flag-naam |
| `posthog.js` | Laadt posthog-js en zet session replay aan met gemaskeerde invoer |
| `app.js` | Kiest de variant, regelt het oog en verstuurt de events |
| `style.css` | Opmaak |

## Doel van de test

We willen weten of een oog-knop om het wachtwoord zichtbaar te maken het inloggen
makkelijker maakt.

- **control**: wachtwoordveld zonder oog
- **test**: wachtwoordveld met oog

## Hypothese

Als we in het wachtwoordveld een oog tonen waarmee mensen hun wachtwoord kunnen
bekijken, dan klikken ze sneller en met meer vertrouwen op Inloggen
(lagere `seconden_tot_klik`), omdat ze zelf kunnen controleren wat ze getypt hebben.

## Beslisregel

_In te vullen voordat de test start:_

- Primaire metric: …
- Minimaal verschil dat ertoe doet: …
- Minimaal aantal deelnemers per variant / looptijd: …
- We kiezen voor **test** als: …
- We kiezen voor **control** als: …

## Wat er gemeten wordt

Events bevatten **nooit** de inhoud van de velden.

| Event | Wanneer | Properties |
| --- | --- | --- |
| `$feature_flag_called` | Automatisch, zodra het formulier op basis van de flag getoond wordt (exposure) | standaard van PostHog |
| `wachtwoord_getoond` | Elke klik op het oog (bestaat alleen in variant test) | `zichtbaar` (true = wachtwoord nu zichtbaar) |
| `inloggen_geklikt` | Klik op Inloggen (of Enter) | `seconden_tot_klik`: seconden sinds het formulier zichtbaar werd |

Beide eigen events krijgen ook `getoonde_variant` (wat de bezoeker echt zag) en
`terugval` (true als PostHog niet op tijd laadde en we control hebben getoond).

Er wordt niets gevalideerd: elke invoer is goed en je gaat altijd door naar
`ingelogd.html`.

### Hoe de variant gekozen wordt

1. Het formulier is verborgen tot de feature flags geladen zijn (`onFeatureFlags`),
   zodat het oog niet ineens verschijnt of verdwijnt.
2. Flag `wachtwoord-tonen` = `test` → met oog. Elke andere waarde → control.
3. Laden de flags niet binnen 3 seconden (instelbaar in `config.js`), geeft PostHog
   een fout, wordt PostHog geblokkeerd, of staat er nog geen project-key in
   `config.js`? Dan tonen we **control**. In dat geval wordt er geen exposure
   geregistreerd, zodat deze bezoekers het experiment niet vertekenen.

## Privacy

- Het formulier heeft geen `action` en de velden hebben geen `name`; er wordt niets
  naar een server verstuurd. Na de klik worden de velden leeggemaakt.
- Session replay staat aan met `maskAllInputs: true`. Dat maskeert alle invoervelden,
  ook als het wachtwoordveld door het oog `type="text"` wordt.
- Extra zekerheid: het wachtwoordveld heeft `class="ph-no-capture"`. Daardoor slaat
  de replay dit veld helemaal over (je ziet een leeg blok) en neemt autocapture het
  niet op.
- Onder de knop staat: "Prototype – vul geen echt wachtwoord in."

**Controleer dit zelf in één replay** voordat de test start: typ iets, klik op het oog,
en kijk in PostHog → Session replay of je de tekst nergens ziet.

## Instellen in PostHog

1. Zet je project-key in `config.js` (Settings → Project → Project API key).
2. Maak een **Experiment** aan met feature flag key `wachtwoord-tonen` en de varianten
   `control` en `test` (bijv. 50/50). Gebruik bijv. `inloggen_geklikt` als metric.
3. Zet **Session replay** aan (Settings → Session replay).
4. Maak de **survey** aan (Surveys → New survey, type popover) met als weergave-
   voorwaarde dat de URL `ingelogd.html` bevat. Surveys staan in de code aan.

## Lokaal testen

Open de bestanden niet via `file://` (dan werkt PostHog niet goed), maar start een
lokale webserver in deze map:

```sh
python -m http.server 8000
# of: npx serve .
```

Ga naar <http://localhost:8000>. Zonder project-key zie je altijd control en geeft de
console een waarschuwing.

Tip: je eigen testbezoeken tellen mee in de resultaten. Filter ze eruit, bijvoorbeeld
met de instelling "Filter out internal and test users" in PostHog.

## Een variant forceren

**Via de URL** (ingebouwd in dit prototype):

- `index.html?variant=test` → met oog
- `index.html?variant=control` → zonder oog
- `index.html?variant=wis` → override weghalen

**Via de browserconsole** met `overrideFeatureFlags`, op `index.html`:

```js
posthog.featureFlags.overrideFeatureFlags({ flags: { 'wachtwoord-tonen': 'test' } })
// herlaad de pagina

posthog.featureFlags.overrideFeatureFlags(false)   // override weghalen
```

De override blijft in deze browser bewaard tot je hem weghaalt. Gebruik het alleen om
te testen: bezoeken met een geforceerde variant komen ook als exposure in het
experiment terecht.

## Publiceren op GitHub Pages

Repository → Settings → Pages → Deploy from a branch → `main` / root.
