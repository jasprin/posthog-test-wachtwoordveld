// Logica van het inlogscherm: variant kiezen, oog-knop en events.
// Er wordt niets gevalideerd en niets naar een server gestuurd behalve de
// PostHog-events hieronder, en die bevatten nooit de inhoud van de velden.
(function () {
  const cfg = window.PROTOTYPE_CONFIG;
  const laden = document.getElementById('laden');
  const form = document.getElementById('inlogformulier');
  const gebruikersnaam = document.getElementById('gebruikersnaam');
  const wachtwoord = document.getElementById('wachtwoord');
  const oog = document.getElementById('toon-wachtwoord');

  let ph = null; // posthog-instantie, alleen gezet als de library geladen is
  let variant = null; // 'control' of 'test', zodra het formulier zichtbaar is
  let terugval = false; // true als we op control zijn teruggevallen
  let zichtbaarSinds = 0;

  function capture(event, props, opties) {
    if (!ph) return;
    ph.capture(event, { ...props, getoonde_variant: variant, terugval }, opties);
  }

  function toonFormulier(gekozen, isTerugval) {
    if (variant) return; // Eén keer kiezen; daarna nooit meer wisselen.
    variant = gekozen;
    terugval = isTerugval;
    oog.hidden = variant !== 'test';
    laden.hidden = true;
    form.hidden = false;
    zichtbaarSinds = performance.now();
    gebruikersnaam.focus();
  }

  // ?variant=test | control forceert een variant, ?variant=wis haalt dat weer weg.
  function pasUrlOverrideToe(posthog) {
    const gevraagd = new URLSearchParams(location.search).get('variant');
    if (!gevraagd) return;
    const ff = posthog.featureFlags;
    if (gevraagd === 'wis') {
      ff.overrideFeatureFlags ? ff.overrideFeatureFlags(false) : ff.override(false);
    } else if (gevraagd === 'test' || gevraagd === 'control') {
      const flags = { [cfg.flagKey]: gevraagd };
      ff.overrideFeatureFlags ? ff.overrideFeatureFlags({ flags }) : ff.override(flags);
    }
  }

  const timer = setTimeout(() => toonFormulier('control', true), cfg.flagTimeoutMs);

  const gestart = startPostHog((posthog) => {
    ph = posthog;
    pasUrlOverrideToe(posthog);
    posthog.onFeatureFlags((_flags, _varianten, context) => {
      if (variant) return; // Terugval al getoond: geen exposure meer registreren.
      clearTimeout(timer);
      if (context && context.errorsLoading) return toonFormulier('control', true);
      // getFeatureFlag registreert ook de exposure ($feature_flag_called) voor het experiment.
      const waarde = posthog.getFeatureFlag(cfg.flagKey);
      toonFormulier(waarde === 'test' ? 'test' : 'control', false);
    });
  });
  if (!gestart) {
    clearTimeout(timer);
    toonFormulier('control', true);
  }

  oog.addEventListener('click', () => {
    const tonen = wachtwoord.type === 'password';
    wachtwoord.type = tonen ? 'text' : 'password';
    oog.setAttribute('aria-pressed', String(tonen));
    const label = tonen ? 'Wachtwoord verbergen' : 'Wachtwoord tonen';
    oog.setAttribute('aria-label', label);
    oog.title = label;
    capture('wachtwoord_getoond', { zichtbaar: tonen });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const seconden = Math.round((performance.now() - zichtbaarSinds) / 100) / 10;
    // sendBeacon zodat het event ook aankomt als we direct van pagina wisselen.
    capture('inloggen_geklikt', { seconden_tot_klik: seconden }, { send_instantly: true, transport: 'sendBeacon' });
    form.reset(); // Laat geen ingevulde waarden achter in de back/forward-cache.
    location.href = 'ingelogd.html';
  });
})();
