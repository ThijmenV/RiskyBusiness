# Verbeterplan

Doel: dezelfde bruikbare game, eenvoudiger te onderhouden en gratis te hosten voor een kleine vriendengroep. Geen frameworkherschrijving of nieuwe spelregels nodig.

Dit document bewaart het oorspronkelijke plan. De definitieve hostingkeuze is later **Netlify Free + Neon Free** geworden; de publieke uitrol is afgerond op 21 november 2026. Zie [opleverstatus](OPLEVERING.md) en [beheerhandleiding](HOSTING.md) voor de actuele inrichting.

## Uitvoeringsvolgorde en acceptatie

1. **Vastleggen**: bestaande werking en datasets inventariseren in HUIDIGE-WERKING.md. Geen echte data in screenshots, logs of documentatie.
2. **Projectstructuur**: HTML/CSS/JS scheiden; één spelpagina; scorefuncties als gedeelde testbare module. Lokale kaartdependencies via npm. Linux/Windows-start, actuele lockfile, genegeerde dependencies/runtimebestanden en CI. Acceptatie: schone `npm ci`, start en bestaande flows werken.
3. **Databehoud**: reproduceerbare migratie JSON + read-only SQLite naar nieuwe runtimeopslag, met bronvermelding, ID-mapping, tellingen en verificatie; geen log/troepen herberekenen. Bestaande bcrypt-login ondersteunen naast PBKDF2. Dubbelen/conflicten expliciet weigeren. PostgreSQL-import als transactie naar lege bestemming. Acceptatie: beide echte datasets intact, herhaalrun verandert niets, bronchecksums gelijk.
4. **Betrouwbaarheid**: atomair JSON opslaan, corrupte data weigeren, PostgreSQL-transacties, duurzame PostgreSQL-sessies, certificaatvalidatie aan, veilige productieconfiguratie, invoervalidatie en API-fouten. Acceptatie: negatieve tests en herstart met behoud van data.
5. **Multiplayer**: stateversies met atomische compare-and-swap; seriële saves en zichtbare conflicten; automatisch verversen als er geen lokale edits zijn. Geen stille overschrijving. Back-upexport vóór reset/herstel. Acceptatie: twee clients kunnen elkaars wijzigingen niet ongemerkt verwijderen.
6. **Hosting en overdracht**: Render Free webservice + Neon Free PostgreSQL als eenvoudige route, met concrete variabelen, import-/backup-/herstelstappen en beperkingen. JSON is uitsluitend lokale ontwikkeling; nooit op een vluchtige gratis host. Acceptatie lokaal: volledige tests en HTTP-smoke. Externe acceptatie na koppelen accounts: deploy, TLS, import, herstart, twee browsers en backup/restore.

## Grenzen en keuzes

Gratis diensten hebben quota, slaapstand en wijzigbare voorwaarden; geen uptimegarantie. Actuele tariefpagina's moeten vóór activeren worden gecontroleerd. Requests naar render.com/docs/free en neon.com/pricing leverden hier 403 op; actuele exacte quota zijn dus niet onafhankelijk bevestigd. Geen betaalde diensten activeren en geen productiegegevens naar een provider sturen zonder concreet gekozen doel. De implementatie en configuratie kunnen vooraf volledig gereed worden gemaakt.

De wereldkaart, regels, log en groepsmodel blijven leidend. Geografische correcties en een rolmodel waarin alleen eigen scores bewerkbaar zijn, zijn toekomstige productkeuzes. WebSockets, een mobiele app en complexe microservices zijn niet nodig voor deze omvang. Versieconflicten worden zichtbaar afgehandeld; automatisch willekeurig mergen van volledige states zou handmatige troepen en logwijzigingen beschadigen.

## Validatie en oplevering

Tests voor score-/tie-/continentregels, entrybewerkingen, legacywachtwoorden, verliesvrije migratie, corrupte opslag, authenticatie/autorisatie, statevalidatie, gelijktijdige saves, backups en productieconfiguratie. Handmatige controle van kaart en mobiele bediening waar een browser beschikbaar is. Werkelijke resultaten en openstaande externe stappen komen in OPLEVERING.md; een onuitgevoerde productie-deploy wordt niet als voltooid gepresenteerd.

## Aanpassing na gebruikerscontrole

De gebruiker verwacht minimaal drie spelers. Daarom uitgebreid naar alle beschikbare Git-versies en de oorspronkelijke JSONBin-opslag. Zes vaste spelers gevonden in `74c626c`. Herstel van deze bron heeft voorrang op het kiezen tussen de twee onvolledige accountdatabases. Hiervoor zijn read-only herstel en een verliesvrije import in een aparte groep toegevoegd. Een historisch spelersrooster is onderdeel van de game-state en staat los van inlogaccounts: geen verzonnen e-mailadressen of wachtwoorden. Groepsleden kunnen, zoals in het oorspronkelijke spel, samen alle spelers beheren. De gebruiker kiest het eigenaaraccount voor de herstelde groep expliciet. De oude API-key komt nooit in de nieuwe frontend.


## Afgerond herstel na nieuwe publicatie

JSONBin is read-only teruggelezen en de gebruiker heeft deze oorspronkelijke zes-spelersdataset expliciet gekozen. De aparte groep is lokaal actief; de twee eerdere groepen blijven bewaard. De historische landcodes zijn met expliciete conflictcontrole genormaliseerd; ongewijzigde raw-data blijft privé. Ook import van alle drie groepen naar echte lokale PostgreSQL, API-save/backup/herstart op een wegwerpkopie en de volledige regressiesuite zijn geslaagd. Externe hosting stond op dat moment nog open. Inmiddels zijn Neon-import en publieke Netlify-uitrol uitgevoerd en functioneel getest; de gekozen speldata is behouden. GitHub-pushes vereisen voorlopig nog een afzonderlijke CLI-deploy.
