# Huidige werking vóór refactor (17 november 2026)

Dit document beschrijft de aangetroffen implementatie, niet een nieuw spelontwerp.

## Structuur en routes

Express (`server.js`, `src/app.js`) serveert het accountdashboard uit `public/index.html` en na sessie- en lidmaatschapscontrole het spel uit `Risky_business-Thoms-Laptop.html`. Die pagina bevat circa 2.000 regels HTML, CSS en globale JavaScript. `public/game.html` is een ongebruikte mockup. `docs/index.html` is een GitHub Pages-landingspagina; de gelinkte game heeft daar geen werkende backend. `npm start` roept een Windows-commandobestand aan. `node_modules` is meegecommit en de lockfile beschrijft andere dependencies dan het manifest.

Accounts: signup, login, logout en huidige gebruiker via `/api/auth`. Aanmelden logt meteen in. Wachtwoorden in de huidige implementatie: PBKDF2-SHA256, 310.000 iteraties met salt. Sessies zitten alleen in procesgeheugen. Groepen: aanmaken met uitnodigingscode, joinen, eigen groepen opvragen, details met leden en state. Alle leden mogen alle spelers en alle spelgegevens bewerken. Alleen de eigen kleur is via de UI instelbaar. Dit gedeelde beheer behouden we.

## Spelmechanieken

- Land-ID's zijn numerieke ISO-codes, opgeslagen als strings zonder voorloopnullen. De kaart gebruikt world-atlas, d3 en topojson van externe CDN's. Selecteren, zoomen, slepen en pinch-zoom zijn beschikbaar.
- Per land en speler: niet-negatieve troepenteller, tiebreakerteller en laatste wijzigingstijd. Handmatig aanpassen kan met ±1 en ±5. Tiebreakers zijn op desktop tellers; mobiel verwijst de UI naar een ontbrekende togglefunctie.
- Een land zonder positieve troepen heeft geen eigenaar. Hoogste troepenaantal wint. Bij gelijkstand: hoogste tiebreakerwaarde; daarna nieuwste `lastUpdated`. Bij exact gelijke tijden blijft de eerste kandidaat (de bestaande numerieke sleutelvolgorde) winnaar.
- Continentcontroller: unieke speler met de meeste gewonnen landen binnen de geconfigureerde lijst, minimaal drie. Dit geeft een badge en andere kaartkleur; er wordt geen numerieke bonus bij troepen opgeteld. De historische lijsten bevatten geografische fouten en dubbelen (o.a. Uruguay dubbel, Denemarken ook Afrika). Deze worden expliciet behouden als compatibiliteitsregel; corrigeren verandert scores en vraagt een afzonderlijk spelregelbesluit.
- Kiss-log: naam, optionele leeftijd, datum, speler en optioneel land. Toevoegen met land telt één troep op; onbekend land telt alleen in het log. `entry.id` (milliseconden) bepaalt de bijgewerkte tijd, niet de gekozen kalenderdatum. Bewerken trekt eerst de oude bijdrage af en voegt de nieuwe toe; verwijderen trekt één bijdrage af, nooit onder nul. Handmatige troepen bestaan naast logbijdragen: herberekenen uit uitsluitend het log zou data veranderen.
- Statistieken: log, tijdlijn, totaal, gemiddelde leeftijd, unieke landen, tellingen per speler/land, leeftijdsbuckets en leaderboard. Rangschikking en territoriumoverzicht volgen de bestaande functies. Desktop en mobiele panelen tonen dezelfde state.
- Iedere wijziging verstuurt de volledige state. Geen polling, versiecontrole of bescherming tegen overschrijven. `saveData` controleert de HTTP-status niet. RESET refereert aan een ontbrekende `STORAGE_KEY`, wist het log niet en bewaart niet betrouwbaar.

## Opslag en migratie-inventaris

JSON is standaard actief; met `DATABASE_URL` gebruikt de app PostgreSQL. De vier collecties/tabellen zijn `users`, `groups`, `group_members`, `game_state`. De state is een JSON-payload met `troops`, `tiebreakers`, `lastUpdated`, `selectedPlayer`, `kissLog`, `playerColors`. Nieuwe velden mogen bestaande velden niet weggooien.

Gecontroleerd zonder persoonsgegevens of hashes in dit document te kopiëren:

| Bron | Accounts | Groepen | Lidmaatschappen | State |
| --- | ---: | ---: | ---: | --- |
| `risky-business-data.json` | 1 | 1 | 1 | 4 landsleutels (waarvan lege), 1 logregel |
| `risky-business.sqlite` | 1 | 1 | 1 | 1 land, 4 logregels |
| `test-data.sqlite` | 2 | 1 | 2 | lege teststate |

De eerste twee bronnen bevatten verschillende accounts, groepsnamen en codes, maar botsende numerieke ID's. Beide zijn echte migratiebronnen; samenvoegen op ID zou data verliezen. SQLite gebruikt bcrypt-hashes. De testdatabase wordt niet als spelersdata geïmporteerd. De bronbestanden blijven ongewijzigd bewaard. Eventuele data in een externe productieomgeving of uitsluitend in een browser is hiermee niet bewezen gevonden: die moet aanvullend worden geëxporteerd en gecontroleerd.

## Vastgestelde risico's

Ongeldige JSON wordt stil vervangen door een lege dataset. Bestandswrites zijn niet atomair. PostgreSQL-groepaanmaak is geen transactie. TLS-certificaatvalidatie staat in productie uit. Er is geen productiecontrole op database of sessiegeheim. Ingevoerde namen worden via `innerHTML` gerenderd. API-validatie en centrale foutafhandeling ontbreken. Eén integratietest dekt het account-/groepspad, maar geen scores, migratie of gelijktijdige writes.

## Aanvulling na controle van de Git-geschiedenis
+
+De werkboom en databasebestanden bleken niet het hele oorspronkelijke spel te beschrijven. Alle zeven beschikbare commits en de remote heads zijn gecontroleerd (remote: alleen `main`). In eerste commit `74c626c` staan zes vaste spelers: Thom (1), Thijmen (2), Thijs (3), Aidan (4), Jorik (5), Chris (6). Hun oorspronkelijke kleuren staan in die versie. Daar werkte SAVE via JSONBin én `localStorage` onder sleutel `risky-business-v1`; laden probeerde eerst JSONBin en daarna localStorage. Latere commits vervingen deze vaste spelers door groepsaccounts, zonder de oude externe dataset mee te nemen.
+
+Oudere SQLite-revisies bevatten nul of één account en leveren de ontbrekende zes spelersdata niet. De oorspronkelijke spelstate staat mogelijk nog in JSONBin. De read-only herstelpoging is geblokkeerd door de netwerkproxy (`CONNECT 403`). De key stond in de oude clientbroncode; die hoort niet opnieuw in clientcode of documentatie. Na herstel intrekken/roteren. De zes definities bewijzen de namen/kleuren, niet de actuele scores of logregels. De eerder beschreven JSON- en SQLite-snapshots zijn daarom **geen bevestigde definitieve versie**. Ze blijven ongewijzigd en apart bewaard totdat de oorspronkelijke bron is uitgelezen en de gebruiker een keuze heeft gemaakt.


### Herstelresultaat na publicatie van de cloudomgeving

Op 17 november 2026 is JSONBin met HTTP 200 read-only uitgelezen. De zes spelers hebben samen 26 troepen; de bron bevat twee logregels. De gebruiker koos deze dataset expliciet als definitief. De import staat in een aparte groep onder het bestaande ThomJochems-account; de twee eerdere groepen blijven bewaard. Voorloopnullen, één identieke dubbele landscoresleutel en lege ongeldige landsleutels zijn gecontroleerd genormaliseerd. De ongewijzigde HTTP-response en originele game zijn privé bewaard naast het normalisatierapport. Zie DATA-EN-HERSTEL.md en OPLEVERING.md voor de actuele toestand; de bovenstaande blokkade beschrijft de eerdere fase.
