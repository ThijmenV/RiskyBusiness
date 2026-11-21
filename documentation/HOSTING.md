# Gratis hosting en beheer

**Live:** <https://risky-business-thijmenv.netlify.app>

**Gecontroleerd:** 21 november 2026. De website is publiek via HTTPS; het spel en de API vereisen een account en groepslidmaatschap.

## Inrichting

| Onderdeel | Huidige inrichting |
| --- | --- |
| Webhosting | Netlify Free, project `risky-business-thijmenv` |
| Database | Neon Free, project `ancient-mouse-08332993`, Frankfurt, productiebranch |
| Opslag | Accounts, groepen, spelstate, sessies en laatste twintig vorige spelversies in PostgreSQL |
| Runtime | Node 24, statische assets op CDN, Express API in een Netlify Function |
| Productievariabelen | `NODE_ENV=production`, gepoolde `DATABASE_URL` met geverifieerde TLS, stabiele `SESSION_SECRET`; privé ingesteld in Netlify |
| Publicatie | CLI-deploy; GitHub `main` bevat dezelfde appcode maar is nog niet gekoppeld aan automatische Netlify-builds |

Er hoeft geen eigen computer aan te blijven. Log in met het bestaande **ThomJochems**-account en open **Risky Business — Original**. Wachtwoorden zijn behouden. Er zijn geen nieuwe accounts voor de zes historische spelnamen verzonnen.

De eenmalige import naar Neon is voltooid en met de privébron vergeleken. **Importeer de oude lokale snapshot niet opnieuw naar productie.** Neon is voortaan de actuele bron. Twee bestaande accounts en drie groepen zijn behouden, inclusief het gekozen oorspronkelijke spel met zes spelers, bij de controle 26 troepen en twee logregels.

## Gratis blijven

Het gekoppelde Netlify-account is via de API gecontroleerd als **Free** met **300 credits per maand**. Er is geen upgrade uitgevoerd; automatisch betaald overschrijden is niet ingeschakeld. Deploys en gebruik tellen mee; een productiedeploy kost op het gecontroleerde creditplan 15 credits. Vermijd onnodige deploys en controleer het gebruik in het dashboard.

Neon gebruikt het bestaande Free-project. Database en functions kunnen een korte koude start hebben. Quota kunnen veranderen en bij overschrijding kan een dienst pauzeren. Deze gratis route biedt een zelfstandig bereikbaar vast webadres binnen de gratis limieten, zonder onbeperkte uptimegarantie. Een gekocht domein is niet nodig.

Productie is publiek; niet-productiedeploys staan achter Netlify-aanmelding. Geef previews geen toegang tot de productiedatabase.

Bronnen: [Netlify pricing](https://www.netlify.com/pricing/), [Netlify Functions](https://docs.netlify.com/functions/overview/), [Neon pricing](https://neon.com/pricing). De concrete Free-bundel is gecontroleerd in het gekoppelde account; controleer quota opnieuw bij wijzigingen.

## Controle en volgende releases

Deze publieke controle schrijft geen data:

```sh
npm run check:hosting -- https://risky-business-thijmenv.netlify.app
```

Verwacht op `/api/health` HTTP 200 met `{"ok":true,"storage":"postgres"}`. De controle test ook assets, anonieme toegang en afscherming van privébestanden.

Voor een release vanuit een checkout met Node 24:

```sh
npm ci
npm test
npm run test:e2e
npm run build:netlify
```

Gebruik voor volledige databasecontroles een **aparte testdatabase** via `TEST_DATABASE_URL`. Zonder deze variabele wordt de PostgreSQL-test overgeslagen. `npm run check:netlify` vereist dezelfde testdatabase en Python 3 en test het echte ZIP in koude function-processen. Chromium is nodig voor de browsertest.

Met Netlify CLI en veilige accountauthenticatie, vanuit de repository:

```sh
netlify deploy --site risky-business-thijmenv --prod --dir dist/site --functions dist/functions --no-build
npm run check:hosting -- https://risky-business-thijmenv.netlify.app
```

Installeer de CLI zo nodig apart; het is geen app-runtimevereiste. Gebruik het bestaande project. Upload beide directories samen: alleen `dist/site` mist accounts, opslag en API. Behoud dezelfde `SESSION_SECRET`, zodat bestaande sessies geldig blijven.

Voor automatische deploys kan de eigenaar in **dit bestaande Netlify-project** bij **Build & deploy → Continuous deployment → Link repository** GitHub-toegang geven tot `ThijmenV/RiskyBusiness`, branch `main`. De instellingen staan in `netlify.toml`: build `npm run build:netlify`, publicatie `dist/site`, functions `dist/functions`, Node 24. Maak geen tweede site. Tot die koppeling is gemaakt, moet een appwijziging apart via CLI worden gedeployd. Een Codex-omgevingspublicatie deployt de game niet.

## Databasebeheer en backups

Productie voert geen schemawijzigingen tijdens verzoeken uit. Gebruik bij een nieuwe schemaversie een directe Neon-verbinding met geverifieerde TLS, privé gebonden in bijvoorbeeld een genegeerd `.env.hosting`:

```dotenv
DATABASE_URL=<directe Neon-verbindingsstring met sslmode=verify-full>
```

Bewaar dit bestand privé (op Linux modus `0600`), nooit in Git of chat. Maak vóór schemawijzigingen een volledige backup:

```sh
node --env-file=.env.hosting scripts/backup.js /private/risky-business-backup.json
node --env-file=.env.hosting scripts/migrate-database.js
```

Een volledige backup bevat accounts en wachtwoordhashes. Bewaar ook een kopie buiten de providers, bijvoorbeeld versleuteld op je eigen computer. Test herstel in een **lege afzonderlijke database** met `scripts/import-postgres.js`; het importscript weigert een gevulde bestemming. Sessies zijn niet in beheerbackups opgenomen: na databaseherstel loggen gebruikers opnieuw in. Zie [data en herstel](DATA-EN-HERSTEL.md).

BACKUP in het spel exporteert één groep. HISTORY bewaart de laatste twintig vorige spelversies en herstelt met versiecontrole. Dit vervangt de onafhankelijke volledige backup niet. API-clients sturen bij opslaan/herstellen de gelezen versie als `X-Game-Version`; ontbrekende versies krijgen 428 en verouderde versies 409. `If-Match` blijft ondersteund voor oudere clients.

## Deze cloudwerkmap

De cloudomgeving heeft alleen proxytoegang; native PostgreSQL TCP/DNS werkt hier niet. Beheertaken gebruiken Neons ondersteunde WSS-transport via de bestaande HTTPS-proxy, met TLS-controle. De lokale bridge in `/workspace/.risky-business/neon-transport/` verandert de gewone Netlify-runtime en `pg`-driver niet.

Private bestanden, genegeerd door Git:

- `.env.local`: gepoolde/directe verbinding en stabiele sessiesleutel.
- `.env.netlify`: de drie runtimevelden; die staan inmiddels ook in Netlify.
- `data/neon-production-backup-2026-11-21.json`: volledige productiebackup na de publieke functionele controle.
- `data/recovered-jsonbin.json` en de ruwe snapshot: historisch herstelmateriaal.

De publieke functionele controle gebruikte een tijdelijk willekeurig account en een aparte testgroep. Signup/login, sessies, opslaan/teruglezen, conflictweigering, backup, historieherstel en afgeschermde spelpagina zijn getest. De oorspronkelijke groep is alleen uitgelezen. Testaccount, groep, lidmaatschappen, historie en sessies zijn verwijderd; productie behield twee accounts en drie groepen.

Privédata en sleutels staan niet in de huidige Git-tree of het deploypakket. Dat verwijdert historische gegevens niet uit bestaande Git-geschiedenis. De oude JSONBin-sleutel moet apart ingetrokken/geroteerd worden; de app gebruikt JSONBin niet meer.

## Andere gratis routes

Vercel viel af omdat de gratis mogelijkheden al gebruikt worden. Render Free met Neon blijft technisch bruikbaar via `render.yaml`, maar heeft een merkbare slaapstand. Cloudflare Workers met D1 vraagt verdere aanpassing van opslag en authenticatie. GitHub Pages alleen ondersteunt de benodigde gedeelde opslag en afgeschermde accounts niet. Netlify met Neon behoudt de bestaande Node-app en accountcompatibiliteit.
