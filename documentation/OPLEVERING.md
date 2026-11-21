# Opleverstatus — 21 november 2026

**De app is online:** <https://risky-business-thijmenv.netlify.app>. Netlify Free serveert website en API; Neon Free bewaart accounts, sessies, speldata en herstelhistorie. Bestaande accounts en de oorspronkelijke spelversie zijn overgenomen. De code staat op GitHub `main`.

## Uitgevoerd

- [Oorspronkelijke werking](HUIDIGE-WERKING.md) en [plan van aanpak](PLAN-VAN-AANPAK.md) vastgelegd vóór de verbeteringen.
- Eén frontend met losse CSS/JS en gedeelde, geteste scoreregels. Mechanics en historische continentlijsten behouden; kaart en libraries lokaal geserveerd.
- Node 24, reproduceerbare installatie, CI met PostgreSQL/Chromium, Netlify-configuratie en afgeschermd deploypakket toegevoegd.
- Atomische lokale JSON-opslag en transactionele PostgreSQL-opslag. Productie vereist PostgreSQL, geverifieerde TLS, expliciete schemamigraties en een stabiele sessiesleutel. Persistente sessies, begrensde verbindingspool en echte database-healthcheck.
- Accounts/groepsrechten, invoervalidatie, auth-rate-limits, veilige cookies en weigering van cross-origin writes. Netlify-client-IP-verwerking gecorrigeerd na een echte publieke aanmeldtest.
- Opslaan met verplichte versiecontrole via `X-Game-Version`, getest via de publieke hostingroute. Conflicten worden geweigerd; lokale export en bewust herladen blijven beschikbaar.
- Twintig vorige spelversies per groep, HISTORY-herstel met versiecontrole, groepsbackup/import en volledige beheerbackups. Reset downloadt eerst een backup; mobiele tiebreakerfunctie hersteld.
- Beide repositorydatabases zonder verlies samengevoegd en beide wachtwoordformaten behouden. Zes historische spelers gevonden in de eerste commit, JSONBin-state teruggevonden en op uitdrukkelijke keuze van de gebruiker definitief gebruikt.
- Neon gekoppeld; import eerst in een geïsoleerd testschema gecontroleerd, daarna naar de lege productiebranch uitgevoerd. Netlify-site aangemaakt, runtimevariabelen privé ingesteld en productie publiek via HTTPS gedeployd. Free-plan gecontroleerd, geen betaalde upgrade uitgevoerd.

## Behouden data

**Risky Business — Original**, onder het bestaande **ThomJochems**-account, bevat Thom, Thijmen, Thijs, Aidan, Jorik en Chris. Bij de publieke controle: **26 troepen, 12 gecontroleerde landen en twee logregels**. Twee eerdere groepen en beide bestaande accounts zijn behouden; wachtwoordhashes zijn onveranderd. Geen nepaccounts, ontbrekende logregels of herberekende handmatige scores toegevoegd.

Historische landsleutels zijn gecontroleerd genormaliseerd: voorloopnullen verwijderd, de identieke dubbele Australische score eenmaal bewaard en de nieuwste wijzigingstijd behouden. Twee lege ongeldige sleutels zijn alleen uit de bruikbare state verwijderd. Conflicterende inhoud wordt geweigerd. Ruwe data en normalisatierapportage blijven privé beschikbaar.

Neon is de actuele productiebron; lokale bestanden zijn herstelsnapshots. Importeer die niet opnieuw over een lopend spel. Volledige privébackup na de livecontrole: `data/neon-production-backup-2026-11-21.json`. Historische bronnen, ruwe JSONBin-response en eerdere backups blijven in het genegeerde `data/`. Een gewone Git-clone bevat de privédata niet.

## Verificatie

| Controle | Resultaat op 21 november 2026 |
| --- | --- |
| `npm test` met echte lokale PostgreSQL | 17 geslaagd, 0 mislukt, 0 overgeslagen |
| Chromium E2E | 1 brede test geslaagd: desktop/mobiel, kaart, troepen, logbewerkingen, reload, conflicten, zes-spelersrooster, reset, backup en HISTORY |
| Netlify-build en echte ZIP-runtime | Geslaagd: geen privébestanden, koude function-processen, HTTPS-cookies, PostgreSQL-sessies en afgeschermde spelpagina |
| Publieke read-only hostingcheck | Geslaagd: HTTPS-dashboard, database, assets, anonieme toegang geweigerd en privébestanden niet gepubliceerd |
| Publieke functionele API-controle | Geslaagd: signup/login, sessie, groepaanmaak, opslaan/teruglezen, stale-save 409, backup, historieherstel, gamepagina en logout |
| Oorspronkelijke groep via publieke API | Zes spelers, 26 troepen en twee logregels bevestigd; alleen uitgelezen |
| Testdata opruimen | Tijdelijk account, groep, lidmaatschappen, historie en sessies verwijderd; productie houdt 2 accounts en 3 groepen |

Oorspronkelijke gebruikerswachtwoorden zijn niet gebruikt of gewijzigd. Publieke authenticatie is getest met een tijdelijk account. De brede UI-test draaide in headless Chromium tegen een geïsoleerde lokale testserver; de livecontrole testte de echte publieke API/HTML. CI is ingericht; deze tabel beschrijft de hier uitgevoerde checks en claimt geen afzonderlijk gecontroleerde GitHub Actions-run.

## Beheer en resterende aandachtspunten

De site is via Netlify CLI uitgerold. **GitHub-pushes deployen nog niet automatisch.** De eigenaar kan de repository aan hetzelfde project koppelen; de [hostinghandleiding](HOSTING.md) beschrijft dat en de huidige CLI-route. De live appcode komt overeen met commit `48f9178`.

Het gecontroleerde Netlify Free-plan heeft 300 credits per maand; deploys en gebruik tellen mee. Neon en functions kunnen koud starten en bij gratis limieten kan de dienst pauzeren. Geen betaald abonnement of automatische betaalde uitbreiding geactiveerd.

Bewaar daarnaast een volledige backup buiten de cloudomgeving/providers. Trek de oude JSONBin-key apart in; die kan nog in historische Git-commits staan. Verbindingsstrings en nieuwe sessiesleutels blijven privé en buiten Git.

Lokale JSON is geschikt voor één ontwikkelproces; productie gebruikt PostgreSQL. Wijzigingen in historische continentregels of het beperken van leden tot alleen eigen scorebewerkingen blijven afzonderlijke spelregelkeuzes.
