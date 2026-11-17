# Opleverstatus — 17 november 2026

## Uitgevoerd

- Oorspronkelijke werking, regels en datavormen vastgelegd; plan vóór implementatie geschreven en na historische vondst aangevuld.
- Eén spelpagina met losse CSS/JS en gedeelde geteste scoreregels. Historische continentlijsten bewust behouden. Kaart en libraries lokaal geserveerd; geen CDN-scripts of externe fonts meer nodig.
- `npm start` platformonafhankelijk, Node 24 vastgelegd, lockfile hersteld. Meegecommitte dependencies uit Git-tracking verwijderd; voortaan `npm ci`. CI met PostgreSQL en Chromium toegevoegd.
- Atomische JSON-writes, weigeren van corrupte data en ongeldige relaties. PostgreSQL-groepaanmaak in een transactie, certificaatverificatie niet langer uitgezet, persistente sessies en veilige productievereisten.
- HTTP-validatie, rate limiting op auth, sessievernieuwing bij login, veilige cookies achter de hostingproxy, cross-origin writes geweigerd, gebruikersnamen/lognamen ge-escaped en centrale API-fouten.
- Optimistische stateversies, seriële saves, gecontroleerd verversen en zichtbare conflictsituaties met lokale export. Geen stille overschrijving of automatische volledige-state-merge.
- Reset gerepareerd; vooraf downloaden van een groepsbackup, restore met versietoets. Mobiele tiebreakerfunctie hersteld. Desktop en mobiele weergave in Chromium gecontroleerd.
- Twee echte repositorydatabases verliesvrij naar `data/app.json` gemigreerd: twee accounts, twee groepen en vijf logregels. Herhaalrun verandert niets. Bronbestanden bytegelijk gebleven. Beide wachtwoordformaten ondersteund.
- Historische zes spelers in eerste commit gevonden: Thom, Thijmen, Thijs, Aidan, Jorik, Chris. Read-only JSONBin-herstel en import in een aparte groep met een zelfstandig spelersrooster toegevoegd. Geen nepaccounts of verzonnen wachtwoorden.
- Render-configuratie en handleidingen voor hosting, private backups, gecontroleerde PostgreSQL-import en herstel geschreven.

## Uitgevoerde controles

| Controle | Resultaat |
| --- | --- |
| Schone `npm ci` | Geslaagd |
| `npm test` met echte lokale PostgreSQL | **13 geslaagd, 0 mislukt, 0 overgeslagen** |
| `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e` | **1 brede browsertest geslaagd** |
| Browsertest | Signup, groep, kaart, troepen, log toevoegen/bewerken/verwijderen, reload, twee-clientconflict, mobiel, zes-spelersrooster, kleurwijziging, resetdownload en restore |
| PostgreSQL-integratietest | Import van beide bronnen, inhoud/count-verificatie, dubbele import geweigerd, race met één winnaar, rollback van geforceerd mislukte groepaanmaak, sessie bruikbaar vanuit nieuwe appinstantie, backup en restore naar tweede schema |
| Migratie | Iedere payload terugvergeleken via inverse ID-mapping; originele hashes onveranderd; herhaling veilig |
| `npm audit --omit=dev --audit-level=moderate` | **0 bekende kwetsbaarheden** na updates |
| `git diff --check` | Geslaagd |
| `npm start` en lokale HTTP-readiness | Geslaagd met nieuwe app op poort 3000, JSON-opslag |

PostgreSQL is hier lokaal getest met via npm verkregen embedded binaries (PostgreSQL 18); CI is ingericht met PostgreSQL 17 maar is nog niet op GitHub uitgevoerd. Er is geen beheerde desktoptool beschikbaar; de browserchecks zijn met echte headless Chromium uitgevoerd. Tests gebruiken eigen tijdelijke data en geen echte gebruikerswachtwoorden.

## Oorspronkelijke data hersteld en definitief gekozen

Na publicatie van de cloudomgeving is JSONBin read-only met HTTP 200 uitgelezen. De gebruiker heeft het overzicht beoordeeld en de oorspronkelijke zes-spelersversie expliciet gekozen. Die staat nu in **Risky Business — Original** onder het bestaande **ThomJochems**-account. Samen: **26 troepen, 12 gecontroleerde landen en twee logregels**. De twee eerdere groepen, oorspronkelijke bronbestanden en accountgegevens zijn behouden. Er zijn geen ontbrekende logregels verzonnen of handmatige scores herberekend.

De eerste validatie weigerde historische landsleutels. Een geteste normalisatiestap verwijdert voorloopnullen, bewaart de identieke dubbele Australische score eenmaal, gebruikt de nieuwste wijzigingstijd en verwijdert twee lege ongeldige landsleutels uitsluitend uit de bruikbare state. Conflicterende scores of ongeldige sleutels met inhoud worden geweigerd. De volledige ruwe HTTP-response en originele state blijven privé bewaard naast de normalisatierapportage.

`data/app.json` bevat nu twee accounts, drie groepen, drie lidmaatschappen en drie gamestates. Een afzonderlijke lokale PostgreSQL-import hiervan is inhoudelijk vergeleken met alle lokale payloads en versies. Op een wegwerpkopie van de echte data zijn API laden/opslaan, groepsbackup en storageherstart geverifieerd. De actieve dataset is daarbij niet veranderd. Een tweede herstelimport dupliceert niets.

Private bestanden (genegeerd door Git en niet via HTTP geserveerd):

- `data/recovered-jsonbin.json`: genormaliseerde plus originele game en herkomst/rapportage.
- `data/recovered-jsonbin.json.raw.json`: bytegetrouwe response, zonder toegevoegde sleutel.
- `data/DATASET-VERGELIJKING.md`: spelersoverzicht, landscores en logboek.
- `data/selected-full-backup-2026-11-17.json`: volledige gekozen lokale database inclusief bewaarde eerdere groepen en accounts; bevat wachtwoordhashes, dus privé bewaren.

De officiële Render- en Neon-pagina's zijn inmiddels bereikbaar en gecontroleerd. De hostinghandleiding vermeldt de gevonden gratis quota als momentopname. De omgevingsinstructies worden aangepast voor het behouden/importeren van de gekozen privé-snapshot; deze verandering publiceert de omgeving niet automatisch.

## Nog open: externe hosting

Er is geen productie-deploy uitgevoerd, geen provideraccount gekoppeld en geen code gepusht. Render/Neon zijn een uitgewerkte route, geen gegarandeerde blijvend gratis dienst. Actuele quota, externe TLS, slaapstand, herstart en oorspronkelijke login moeten bij publicatie worden gecontroleerd. De historische client-API-key na herstel intrekken/roteren.

Lokale JSON ondersteunt één serverproces en heeft alleen in-memory sessies; productie vereist PostgreSQL. Conflictoplossing is bewust expliciet export/herladen. Geografische correcties in de historische continentregels en een model met alleen eigen scorebewerkingen zijn afzonderlijke spelregelkeuzes.


## Vervolg: opslag en gratis hosting buiten Vercel

De gebruiker vereist gratis hosting en gebruikt de gratis Vercelruimte al. Daarom is **Netlify Free + Neon Free PostgreSQL** uitgewerkt en bouwbaar gemaakt. HOSTING.md bevat concrete stappen voor accounts, GitHub-koppeling, privé-import van de gekozen data, veilige variabelen en publieke controles. Er is nog geen publiek adres aangemaakt: provideraccounts en productiecredentials zijn niet beschikbaar.

Nieuwe opslagfuncties: twintig automatische vorige spelversies per groep, atomair opgeslagen met versiecontrole; HISTORY-herstel maakt een nieuwe versie. Zowel JSON als PostgreSQL en volledige backups ondersteunen deze historie. Schema's zijn versiebeheerd; productie verifieert ze zonder DDL tijdens verzoeken. De PG-pool is begrensd tot twee verbindingen per instantie met timeouts. Health voert werkelijk een databasequery uit en geeft 503 bij uitval. Productie weigert onveilige TLS-configuratie en lokale JSON.

Netlify: `dist/site` bevat alleen statische publieke bestanden en `dist/functions/app.zip` de Node-function plus afgeschermde gamepagina. Het echte ZIP is gecontroleerd op afwezigheid van privédata en uitgevoerd in aparte koude function-processen met PostgreSQL: health, HTTPS-cookies, sessiebehoud en geauthenticeerde game-HTML werken. Publieke `check:hosting` is beschikbaar maar nog niet tegen een externe deployment uitgevoerd.

Validatie in deze ronde: 15 tests inclusief PostgreSQL geslaagd, de uitgebreide Chromium-test inclusief HISTORY geslaagd, deploy-build en ZIP-runtimecheck geslaagd, productie-audit 0 bekende kwetsbaarheden. De gekozen dataset blijft zes spelers, 26 troepen en twee logregels. Een nieuwe volledige privébackup staat in `data/selected-full-backup-hosting-2026-11-17.json`.

Netlify's website is hier door het netwerkbeleid geblokkeerd, dus actuele exacte gratis credits zijn niet bevestigd. De officiële Netlify-bundler is via npm gelezen en getest. Cloudflare Workers Free CPU-limieten zijn via de officiële GitHub-docs gecontroleerd; overstappen zou extra auth/runtimewerk vragen. Gratis diensten houden quota en kunnen bij overschrijding pauzeren; geen onbeperkte beschikbaarheid claimen.
