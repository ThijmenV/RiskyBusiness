# Risky Business

Een gedeeld wereldkaartspel met accounts, groepen, troepen, tiebreakers, logboek en statistieken. Node.js 24, Express en PostgreSQL (hosting) of JSON (lokale ontwikkeling). Geen frontend-build nodig.

**Online:** <https://risky-business-thijmenv.netlify.app>. Bestaande accounts en de gekozen oorspronkelijke spelversie zijn overgenomen. Log in en open **Risky Business — Original**.

## Lokaal starten

```sh
npm ci
npm start
```

Open de app op poort 3000. Een schone checkout start met lege lokale data; herstel een privébackup om het bestaande spel te gebruiken. De oorspronkelijke bronbestanden zijn niet meer onderdeel van de GitHub-code. `npm start` werkt op Linux, macOS en Windows. Met `PORT` kies je een andere poort. Optioneel: `node --env-file=.env server.js`; `.env.example` beschrijft de instellingen. Standaard is geen databaseaccount nodig. JSON-opslag staat in het genegeerde `data/app.json`; draai daarmee één serverproces tegelijk. Lokale sessies verlopen bij een serverherstart. Op productie gebruikt de app PostgreSQL voor zowel spelgegevens als sessies.

**Definitieve speldata:** de gebruiker heeft de teruggevonden oorspronkelijke JSONBin-versie gekozen: zes spelers (Thom, Thijmen, Thijs, Aidan, Jorik, Chris), samen 26 troepen en twee logregels. Die staat in Neon in **Risky Business — Original** onder het bestaande account **ThomJochems**. De eerdere JSON- en SQLite-groepen zijn bewaard. Neon is de actuele productiebron; de lokale kopie is een herstelsnapshot. De ruwe snapshot, normalisatierapportage en volledige actuele database staan privé in het genegeerde `data/` en zijn niet publiek of in Git opgeslagen.

Een nieuwe checkout bevat daarom niet vanzelf de gekozen privédata. Herstel een volledige privébackup, of volg [migratie en herstel](documentation/DATA-EN-HERSTEL.md). `npm run migrate:legacy` alleen herstelt de twee repository-snapshots; het is geen vervanging voor de definitieve spelersbackup. De cloudomgeving heeft de herstelbestanden lokaal beschikbaar.

## Controle

```sh
npm test
npm run test:e2e
```

De browsertest vereist een geïnstalleerde Playwright Chromium (`npx playwright install chromium`) of `CHROMIUM_PATH` naar een bestaande Chromium. De testserver gebruikt een eigen tijdelijke dataset op poort 3100. De PostgreSQL-integratietest gebruikt `TEST_DATABASE_URL`; hij maakt twee tijdelijke schema's en ruimt die op. Zonder deze variabele wordt alleen die test expliciet overgeslagen. CI draait beide plus browsercontroles tegen PostgreSQL 17.

## Gratis online gebruiken

De app draait op **Netlify Free + Neon Free PostgreSQL**. De productievariabelen zijn ingesteld en de data is geïmporteerd; voer de import niet opnieuw uit. Op 21 november 2026 zijn publieke HTTPS, aanmelden/inloggen, sessies, opslaan, conflicten, backups en historieherstel gecontroleerd. Gratis quota gelden; de gecontroleerde Netlify Free-bundel heeft 300 credits per maand. Er is geen betaald plan aangezet.

De code staat op GitHub `main`. De site is via Netlify CLI uitgerold; een push publiceert nog niet automatisch. De [beheerhandleiding](documentation/HOSTING.md) beschrijft volgende releases en het optioneel koppelen van GitHub aan dezelfde site.

```sh
npm run build:netlify
# Optioneel: controleer het echte ZIP met een tijdelijke PostgreSQL-testdatabase.
npm run check:netlify
```

De build maakt `dist/site` (CDN) en `dist/functions/app.zip` (API), zonder privédata. De ZIP-controle vereist `TEST_DATABASE_URL` en Python 3. Productie gebruikt alleen PostgreSQL; voer vóór een nieuwe schemaversie `npm run db:migrate` uit met een veilige databasebinding. HISTORY bewaart automatisch de laatste twintig vorige spelversies, inclusief bescherming bij gelijktijdig herstellen.

## Structuur

- `public/game.html`, `public/css`, `public/js`: één frontend; kaartlibraries worden lokaal uit npm-packages geserveerd.
- `public/js/game-rules.js`: dezelfde deterministische scoreregels in browser en tests.
- `src`: HTTP, accounts, groepsrechten, statevalidatie en JSON/PostgreSQL-opslag.
- `scripts`: read-only bronherstel, gecontroleerde migratie/import en privébackups.
- `test`, `e2e`: regressie-, database- en browsercontroles.
- `documentation`: [oorspronkelijke werking](documentation/HUIDIGE-WERKING.md), [plan](documentation/PLAN-VAN-AANPAK.md), [hosting](documentation/HOSTING.md), [opleverstatus](documentation/OPLEVERING.md).

Alle leden mogen het groepsspel beheren. Opslaan gebruikt versiecontrole: bij een conflict blijft de lokale state beschikbaar om te exporteren, waarna je bewust de serverversie kunt herladen. BACKUP downloadt de huidige groepsstate; RESTORE herstelt uitsluitend een back-up van dezelfde groep. RESET downloadt eerst een back-up en wist troepen, tiebreakers en log na bevestiging. Voor accounts en alle groepen samen gebruik je de beheerdersbackup uit de migratiehandleiding.
