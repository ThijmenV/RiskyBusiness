# Databehoud en herstel

**Actuele keuze:** de gebruiker heeft op 17 november 2026 de oorspronkelijke JSONBin-versie met zes spelers als definitief gekozen. Deze is gecontroleerd geïmporteerd in groep `Risky Business — Original` onder `ThomJochems` (lokaal groep 3, eigenaaraccount 2). De andere twee groepen en bronbestanden blijven behouden. De eerdere blokkerende netwerkbeperking is opgelost; ophalen gaf HTTP 200.

Private herstelbestanden: `data/recovered-jsonbin.json` bevat de genormaliseerde state én de originele state; `data/recovered-jsonbin.json.raw.json` is de bytegetrouwe HTTP-response. `data/DATASET-VERGELIJKING.md` geeft alle spelers, landscores en logregels weer. Deze bestanden zijn genegeerd door Git en worden niet door de webserver geserveerd. Voor overdracht naar een nieuwe machine is een privébackup nodig.

## Bronnen en keuze

De twee repositorybestanden blijven onaangeroerd. `test-data.sqlite` is testdata en wordt niet geïmporteerd. `npm run migrate:legacy` leest de echte JSON- en SQLite-bron read-only en maakt `data/app.json`. Accounts en groepen krijgen expliciete ID-mapping; elke game wordt met omgekeerde mapping inhoudelijk vergeleken. Wachtwoordhashes blijven intact. Bcrypt en PBKDF2 worden beide ondersteund. De migratiemetadata bevat bronchecksums en mappings. Opnieuw uitvoeren laat latere spelwijzigingen staan. Een andere migratie naar dezelfde bestemming wordt geweigerd.

De twee repository-snapshots zijn als extra groepen behouden. Historische commit `74c626c` bevat de zes oorspronkelijke spelers; de volledige bijbehorende JSONBin-state is inmiddels teruggelezen en door de gebruiker gekozen. De 26 troepen zijn niet uit de twee logregels herberekend: handmatige scores blijven bestaan.

## Oorspronkelijke JSONBin-data terughalen

1. Sta `api.jsonbin.io` toe in de cloudomgevingsinstellingen. Het concept bevat die aanvulling; een opgeslagen concept verandert niet zelfstandig de huidige netwerkproxy. De eerdere poging kreeg `CONNECT 403`; na publicatie met de toegestane host lukte ophalen met HTTP 200.
2. Vanuit de repository:
   ```sh
   npm run recover:original
   ```
   Het script leest de historische binconfiguratie uit Git zonder oude code uit te voeren, doet uitsluitend GET met TLS-controle, bewaart eerst de ruwe HTTP-response, normaliseert historische landcodes, valideert de state en bewaart een exclusief privébestand `data/recovered-jsonbin.json` (0600). Het publiceert of wijzigt niets bij JSONBin. De key verschijnt niet in uitvoer of de nieuwe frontend. Met `JSONBIN_READ_KEY` kan een nieuwe geldige leessleutel worden gebruikt; zet de waarde veilig in environment settings. Als de bin niet meer bestaat of toegang is ingetrokken, is een gebruikers-export nodig.
3. De teruggevonden snapshot is beoordeeld en gekozen; eigenaar is het bestaande ThomJochems-account. Voor een andere import kies je het eigenaaraccount expliciet. Importeer eerst in een **kopie** van de lokale dataset met de app gestopt:
   ```sh
   npm run import:recovered -- data/recovered-jsonbin.json OWNER_USER_ID /private/kopie-app.json
   ```
   `OWNER_USER_ID` is een bestaand account, geen historisch speler-ID. De twee basisaccounts hebben in de gecombineerde migratie ID 1 en 2; kies bewust. De import maakt een afzonderlijke groep met het oorspronkelijke zes-spelersrooster en ongewijzigde scores/logs. Spelers zijn geen verzonnen inlogaccounts. Groepsleden kunnen gezamenlijk die zes spelers beheren. Er wordt eerst een lokale backup gemaakt. Dezelfde snapshot opnieuw importeren dupliceert geen groep.
4. Vergelijk speler-ID's, kleuren, logaantallen, territoria en troepen met het oude spel. Kies pas daarna de definitieve kopie voor PostgreSQL-import. Bewaar de andere bronnen als privéarchief. Na herstel de blootgestelde historische key intrekken/roteren; ze staat ook in Git-geschiedenis. Niet herschrijven of verwijderen zonder afgesproken geschiedenisbeheer.

Als alleen de oude browser nog data heeft: open diezelfde oude oorsprong/browser, exporteer de JSON van localStorage-sleutel `risky-business-v1` lokaal via ontwikkeltools en bewaar die privé. Wis de browseropslag niet. Een nieuwe cloudbrowser heeft die opslag niet vanzelf. Deze route is niet getest op de oorspronkelijke browser.

## Volledige backup

```sh
npm run backup -- /private/risky-business-backup.json
```

Met `DATABASE_URL` exporteert dit een consistente read-only PostgreSQL-snapshot. Zonder die variabele kopieert het lokale `DB_PATH` (standaard `data/app.json`). Een bestaande output wordt geweigerd. Deze backup bevat e-mails en wachtwoordhashes: niet committen, niet in `public` zetten, versleuteld/buiten de provider bewaren. Sessies worden bewust niet meegenomen in beheerbackups.

Restore: voor PostgreSQL `npm run import:postgres -- /private/backup.json` naar een **lege** database, daarna healthcheck, accountlogin, aantallen en representatieve games controleren. Nooit de actieve database leegmaken om de import te laten slagen. Voor JSON: stop de app, archiveer de huidige `DB_PATH`, zet een gecontroleerde backup op een nieuwe locatie en wijs `DB_PATH` daarnaar. JSON ondersteunt één schrijver; geen parallelle serverprocessen.

BACKUP/RESTORE in de game zijn alleen groepsbackups zonder accounts/wachtwoorden. Ze gelden voor dezelfde groep, behouden de versietoets en vervangen alleen spelstate. RESET maakt eerst een download en wist daarna scores en log; kleuren/rooster blijven behouden. Bij een saveconflict exporteer je de lokale state vóór herladen. Het downloaden van een backup garandeert niet dat de gebruiker het bestand veilig heeft bewaard.


## Gecontroleerde normalisatie van deze snapshot

Voorloopnullen worden verwijderd (`036` → `36`). Bij Australië bestonden beide sleutels met exact dezelfde score van één voor Aidan; ze worden één land zonder scoreverdubbeling. Hun wijzigingstijden verschillen: de nieuwste tijd wordt gebruikt. Twee lege `undefined`-landsleutels worden alleen uit de bruikbare state weggelaten; de ruwe bron blijft compleet. Conflicterende scores voor dezelfde speler/hetzelfde land of ongeldige landsleutels mét spelersdata worden geweigerd en vragen expliciete reconciliatie. Alle overige scores, tiebreakers, kleuren en logregels blijven behouden.

De normalisatie is apart getest. `recover:original -- --input /private/raw-response.json` kan een al bewaarde response verwerken zonder JSONBin opnieuw te benaderen. Kies een nieuwe outputnaam als de bestaande recovery of raw-backup er al staat; het herstel overschrijft die bestanden niet.

## Automatische versies en schema-updates

Iedere geslaagde save bewaart de vorige state atomair in `game_history`. Per groep blijven de laatste twintig versies beschikbaar, ook na een reset of import via de spelpagina. Via HISTORY kan ieder groepslid een oudere versie herstellen: dat maakt een nieuwe versie, met behoud van de vorige en controle op gelijktijdige wijzigingen. Deze historie staat in dezelfde database en vervangt geen backup buiten de provider.

Volledige beheerbackups bevatten voortaan `game_history`; oude backups zonder die collectie worden als lege historie geïmporteerd. In PostgreSQL gebeurt migratie via `npm run db:migrate` of de eenmalige import. Productie verifieert alleen het schemaversienummer en doet geen DDL per nieuwe function-instantie. Pool: maximaal twee verbindingen per instantie, met connectie- en querytimeouts. `/api/health` controleert ook daadwerkelijk een databasequery en geeft bij onbeschikbaarheid HTTP 503.
