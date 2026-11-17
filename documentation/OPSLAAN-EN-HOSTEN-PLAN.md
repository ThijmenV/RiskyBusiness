# Opslag en hosting: vervolg

De gebruiker vereist gratis hosting; de gratis Vercel-mogelijkheden zijn al in gebruik. Voorkeursroute: Netlify Free voor een vast HTTPS-adres met een statische frontend en een Node-function voor de API, plus Neon Free PostgreSQL voor spelstate, accounts en sessies. Render Free blijft een alternatief met langere slaapstand. Cloudflare Workers Free + D1 is aantrekkelijk voor een nieuwe app, maar de bestaande bcrypt-login en Node-app vragen een andere runtime; de officiële Workers-documentatie noemt 10 ms CPU per gratis invocation. Die herbouw is voor deze kleine app niet de eerste keuze.

Gratis quota blijven van toepassing; een vast adres is geen onbeperkte capaciteit of uptimegarantie. De Netlify-prijspagina is vanuit deze omgeving geblokkeerd door het netwerkbeleid; actuele kredieten en runtimebeschikbaarheid moeten vóór externe activatie worden gecontroleerd. De officiële Netlify-bundler is via npm beschikbaar, zodat het daadwerkelijke deploypakket lokaal kan worden gebouwd en getest. Er zijn geen hostingaccounts of productiecredentials beschikbaar. Geen publieke upload van spelersdata, deployment of publicatie zonder werkende accountkoppeling.

Uitvoering:

1. PostgreSQL-schema via versiebeheer en expliciete migratie; productieverzoeken doen geen CREATE/ALTER. Sessietabel wordt mee gemigreerd. Begrensde pool, connectie-/querytimeouts en betrouwbare healthcheck.
2. Automatische historie van de laatste twintig spelversies, atomair met opslaan, zowel lokaal als in PostgreSQL. Herstellen maakt een nieuwe versie en bewaart de huidige. Versiecontrole blijft gelden.
3. Volledige backups/imports bevatten ook de herstelhistorie. Oude backups zonder historie blijven importeerbaar. Geen wijziging aan de gekozen zes-spelersdata.
4. Netlify-package met statische bestanden op CDN en alleen API/groepspagina via Node-function. Private data, bron-databases, Git-geschiedenis en sleutels worden niet mee verpakt. De verpakte function wordt lokaal uitgevoerd met echte PostgreSQL.
5. Dataoverzet en uitrol voorbereiden: privébackup, import in lege database, schema-/datacontrole, HTTPS-cookiecontrole, echte externe smokecheck en vaste URL. Externe stappen blijven aantoonbaar open zolang accounts en veilige bindings ontbreken.

Acceptatie: migraties herhaalbaar; bestaande logins en mechanics blijven werken; stale saves/herstel geven een conflict; history scoped per groep; backup/restore behoudt historie; deploypakket bevat geen private spelerdata; cold function-instanties delen database/sessies; productie weigert JSON. De bestaande browserregressie blijft slagen. Externe bereikbaarheid wordt pas geclaimd na een werkelijke deploy en HTTP-controle.
