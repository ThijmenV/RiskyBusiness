# Gratis hosting met een vast webadres

**Voorkeursroute: Netlify Free + Neon Free PostgreSQL.** De gebruiker heeft geen gratis Vercelruimte meer beschikbaar en gratis is een vereiste. De statische pagina en kaartbestanden staan op Netlify's CDN; de API en afgeschermde spelpagina draaien als Node-function. Accounts, sessies, spelstate en herstelhistorie staan samen in Neon. De code en het echte Netlify-ZIP zijn lokaal getest, inclusief koude function-instanties en sessiebehoud.

Het resultaat na koppeling is een vaste `https://jouw-project.netlify.app`-URL. Er hoeft geen lokale computer aan te blijven en geen Render-service handmatig wakker gemaakt te worden. API/database kunnen een korte koude start hebben. Gratis quota blijven van toepassing: bij het bereiken van planlimieten kan een dienst pauzeren. Dit is geen onbeperkte uptimegarantie. Gebruik expliciet Free, geen proefabonnement met latere betaling of automatische betaalde uitbreiding.

## Stappen voor aanmaken en koppelen

### 1. Zorg dat de nieuwe code op GitHub staat

Netlify moet de versie kunnen ophalen met `netlify.toml`, de nieuwe scripts en `netlify/functions/app.js`. De releasecode is voorbereid voor de GitHub-branch `main`, inclusief Netlify-configuratie en CI. Gebruik die branch bij het koppelen. Het publiceren van een Codex-cloudomgeving maakt op zichzelf geen GitHub-commit en geen publieke gamewebsite.

De echte spelersdata staat genegeerd in `data/` en hoort niet in die commit. Bewaar de volledige privébackup vóór verdere stappen.

### 2. Maak Neon Free aan

1. Open <https://console.neon.tech> en maak een gratis account, bijvoorbeeld met GitHub.
2. Maak een project `risky-business`. Kies een Europese regio die beschikbaar is, liefst dichtbij de Netlify-functionregio. Selecteer Free.
3. Gebruik de standaard database of maak `risky_business`. Open **Connect** / **Connection details**.
4. Bewaar de PostgreSQL-verbindingsstring met **connection pooling** voor de app. Gebruik TLS met certificaatvalidatie (`sslmode=verify-full` is de duidelijkste keuze). Bewaar daarnaast de directe, niet-gepoolde verbinding voor eenmalige migratie/import.
5. Deel die strings niet in chat, screenshots of de repository; ze bevatten het databasewachtwoord.

### 3. Zet de bestaande spelersdata over

Gebruik de gekozen lokale `data/app.json`: die bevat de oorspronkelijke zes-spelersgroep én de twee bewaarde eerdere groepen. Op de cloudmachine met deze privédata maak je een genegeerd privébestand `.env.hosting` met uitsluitend:

```dotenv
DATABASE_URL=<de directe Neon-verbindingsstring met TLS>
```

Vervang de placeholder alleen in dat privébestand. Op Linux: geef het bestand toegang `0600`. Dit bestand niet committen. Voer vanuit de repository uit:

```sh
node --env-file=.env.hosting scripts/import-postgres.js data/app.json
```

De import maakt/migreert schema en sessietabel, maar weigert een gevulde bestemming. Er worden geen bestaande spelers overschreven. IDs, wachtwoordhashes, state, versies en historie worden gecontroleerd. Oude backups zonder history worden ondersteund. Later, bij een nieuwe appversie, gebruik je alleen:

```sh
node --env-file=.env.hosting scripts/migrate-database.js
```

Een schema-update is iets anders dan opnieuw spelersdata importeren. De runtime doet in productie geen CREATE/ALTER. Bewaar `.env.hosting` alleen zolang het nodig is en maak vóór schemawijzigingen een privébackup. Laat deze variabele niet globaal op de testomgeving staan; tests en previews krijgen een eigen database.

### 4. Maak Netlify Free aan en verbind GitHub

1. Open <https://app.netlify.com> en maak een gratis account, eventueel met GitHub.
2. Kies **Add new project** / **Import an existing project**, selecteer GitHub en geef toegang tot deze repository.
3. Selecteer de branch met de nieuwe code.
4. `netlify.toml` bevat de instellingen. Controleer:
   - build: `npm run build:netlify`
   - publish-directory: `dist/site`
   - functions-directory: `dist/functions`
   - Node: `24`
5. Kies een vrije projectnaam. Netlify geeft daarvoor het vaste `.netlify.app`-adres; er is geen gekocht domein nodig.

Gebruik geen eenvoudige drag-and-drop van alleen `dist/site`: dan ontbreken de Node-function en accounts/API. Via GitHub-import bouwt Netlify de volledige configuratie. Een ontwikkelaar kan ook beide gebouwde directories samen via Netlify CLI uploaden.

### 5. Stel productievariabelen privé in

Open de projectinstellingen bij **Environment variables**. Maak voor de productiecontext deze variabelen, beschikbaar voor Functions:

| Naam | Waarde |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | De gepoolde Neon-verbindingsstring met TLS |
| `SESSION_SECRET` | Een nieuwe willekeurige waarde van minstens 32 tekens |

Maak het sessiegeheim lokaal met bijvoorbeeld:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Plak de uitkomst rechtstreeks in Netlify; niet in Git of chat. Behoud dezelfde waarde bij volgende deploys om sessies bruikbaar te houden. Deploy-previews krijgen niet automatisch de echte productiedatabase: gebruik daarvoor aparte testcredentials of laat previews ongeconfigureerd.

Na wijzigen van variabelen: start een nieuwe deploy. De productie-app weigert JSON-opslag, ontbrekende schema's en onveilige TLS-instellingen. Een healthcheck met 503 wijst op databasebereikbaarheid of nog uit te voeren migraties.

### 6. Controleer de publieke site

Open eerst het vaste HTTPS-adres en daarna `/api/health`. Verwacht HTTP 200 en:

```json
{"ok":true,"storage":"postgres"}
```

Vanuit de repository kan de alleen-lezen publieke controle worden uitgevoerd:

```sh
npm run check:hosting -- https://jouw-project.netlify.app
```

Dit controleert dashboard, assets, database-health en afscherming van privébestanden. Het is nog niet uitgevoerd tegen een echte publieke URL.

Log vervolgens in met het bestaande ThomJochems-account. Controleer **Risky Business — Original**: zes spelers, de opgeslagen troepen en het logboek. Op het moment van overzet waren dat 26 troepen en twee logregels. Test opslaan vanuit twee vensters, sluit/heropen de pagina en controleer HISTORY. Publieke bereikbaarheid en de oorspronkelijke login worden pas hier tegen de echte provider gecontroleerd.

### 7. Bewaar ook een backup buiten de providers

Met het privé-envbestand:

```sh
node --env-file=.env.hosting scripts/backup.js /private/risky-business-backup.json
```

De volledige backup bevat accounts en wachtwoordhashes: bewaar die privé buiten Netlify/Neon, bijvoorbeeld versleuteld op je eigen computer. Een hersteltest doe je in een aparte lege Neon-database met het importscript. De automatische laatste twintig spelversies helpen bij foutieve wijzigingen, maar vervangen deze onafhankelijke backup niet. Sessies worden niet in beheerbackups opgenomen; na databaseherstel loggen gebruikers opnieuw in.

## Vergeleken gratis opties

| Optie | Geschiktheid voor deze app |
| --- | --- |
| Netlify Free + Neon Free | Voorkeur: behoud van Node-code en logins, statische CDN-pagina en vaste URL. Gratis credits/quota vooraf controleren. |
| Render Free + Neon Free | Bestaande `render.yaml` blijft bruikbaar. Render noemt slaapstand na 15 minuten zonder verzoeken; merkbare koude start. |
| Cloudflare Workers Free + D1 | Goede geïntegreerde opslagoptie voor een daarop ontworpen app. Officiële Workers-docs noemen 100.000 verzoeken/dag en 10 ms CPU/invocation; de bestaande bcrypt-login en Node-runtime vragen verdere aanpassing. Geen snelle omzetting ten koste van accountcompatibiliteit. |
| GitHub Pages alleen | Alleen statische bestanden; onvoldoende voor afgeschermde accounts en gedeelde opslag. |
| Vercel Free | Valt af omdat de gebruiker de gratis mogelijkheden al gebruikt. |

Bronnen: [Netlify pricing](https://www.netlify.com/pricing/), [Netlify Functions](https://docs.netlify.com/functions/overview/), [officiële Netlify-bundler](https://github.com/netlify/zip-it-and-ship-it), [Neon pricing](https://neon.com/pricing), [Render Free](https://render.com/docs/free), [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

De Netlify-webpagina's zijn hier door het netwerkbeleid geblokkeerd (HTTP 403). De officiële bundler is wel rechtstreeks via npm gelezen, gebruikt en getest. Exacte actuele Netlify-kredieten worden daarom niet als geverifieerd gepresenteerd: controleer het Free-plan bij aanmelden. Neon en Render zijn eerder op 17 november 2026 officieel gecontroleerd; de Workers-prijzen zijn via de officiële Cloudflare GitHub-bron gecontroleerd. Alle quota kunnen veranderen.

## Huidige uitrolstatus

Het productie-ZIP is gebouwd en lokaal als losse function-processen tegen PostgreSQL uitgevoerd. Statische bestanden bevatten geen speldata. Het ZIP bevat geen privédata, historische databases of Git-geschiedenis. De echte provideraccounts zijn niet gekoppeld, er zijn geen productiewaarden ontvangen en er is geen publieke deployment gedaan. Alleen de lokale app is actief. De bovenstaande account- en koppelingstappen zijn dus nog nodig om het vaste publieke adres werkelijk te activeren.


## Publicatierelease

Lokale oorspronkelijke JSON/SQLite-bestanden worden niet meer in de nieuwe Git-tree opgenomen; ze blijven hier privé bewaard. CI gebruikt synthetische migratiebronnen en haalt de volledige Git-geschiedenis op voor de geteste herstelmetadata. Het verwijderen uit de actuele Git-tree verwijdert oude gegevens of sleutels niet uit bestaande Git-geschiedenis. De eerder aangetroffen historische JSONBin-key moet apart worden ingetrokken/geroteerd.

Het invullen van Netlify-variabelen importeert niet vanzelf de gekozen spelersdata. De eenmalige privé-import naar Neon uit stap 3 blijft nodig. De gekozen `data/app.json` staat alleen in deze cloudwerkmap en de privébackups, en wordt nooit in de Netlify-build of GitHub opgenomen.
