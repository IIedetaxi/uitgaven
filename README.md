# Uitgaven & Voorraad

Simpele PWA om de hele dag door uitgaven bij te houden (totalen en gemiddelden per dag, week, maand en jaar) en je sigarettenvoorraad per pakje te volgen.

## Functies

- **Uitgaven**: invoeren met een numpad, categorie, notitie en (optioneel) een andere datum of tijd. Tik op een uitgave om hem te bewerken of te verwijderen.
- **Eigen categorieën** met een optioneel **standaardbedrag**. Categorieën met een bedrag verschijnen als snelknop op *Vandaag* (één tik = geboekt) en vullen het bedrag automatisch in bij *Toevoegen*.
- **Overzicht**: Dag, Week, Maand en Jaar, met terugbladeren, het verschil met de vorige periode (op hetzelfde moment), een staafgrafiek, de verdeling per categorie en gemiddelden: per dag, per week, per maand en een prognose. Gemiddelden tellen vanaf je eerste uitgave.
- **Voorraad**: sloffen met gele pakjes. "Pak er 1" maakt het volgende pakje rood. Tik op een pakje om het om te zetten. Je ziet ook het gemiddelde aantal pakjes per dag (over de laatste 14 dagen) en voor hoeveel dagen je voorraad nog genoeg is.
- **De prijs van een slof wordt automatisch als uitgave geboekt** in de categorie *Sigaretten*. Verwijder je de slof, dan verdwijnt die uitgave mee.
- **PIN-login**: een ondertekende cookie die 1 jaar geldig blijft.
- **Snel en offline**: alle data staat lokaal op je telefoon. Elke actie is meteen zichtbaar en wordt op de achtergrond opgeslagen. Ben je offline, dan gaan je wijzigingen in een wachtrij en worden ze verstuurd zodra je weer verbinding hebt.
- **Meldingen**: na elke actie een melding, met "Ongedaan maken" bij toevoegen, verwijderen en pakjes pakken.
- **PWA**: installeerbaar op je beginscherm.

## Stack

Next.js 16 (App Router, Server Actions) · Tailwind CSS 4 · Neon Postgres (HTTP-driver) · draait op het gratis **Vercel Hobby**-plan met de gratis **Neon**-database.

De tabellen worden bij de eerste request automatisch aangemaakt (en oude versies gemigreerd). Er is geen migratiestap nodig.

De server draait in Frankfurt (`fra1`, ingesteld in `vercel.json`), naast een Neon-database in `eu-central-1`. Kies je een andere Neon-regio, pas dan ook de Vercel-regio aan.

**Architectuur:** de pagina's zijn statisch en client-side. `GET /api/data` laadt alles, en `POST /api/sync` verwerkt een wachtrij met acties. De id's worden door de client gemaakt, zodat optimistische updates en offline werken zonder conflicten.

## Deployen op Vercel (gratis)

1. Ga naar [vercel.com/new](https://vercel.com/new) en importeer deze repo. Het framework wordt automatisch als Next.js herkend.
2. Open in het project **Storage → Create Database → Neon** (Free plan) en koppel de database aan het project. Dat zet `DATABASE_URL` automatisch.
3. Voeg bij **Settings → Environment Variables** toe:
   - `APP_PIN`: je pincode (liefst 6 cijfers of meer)
   - `AUTH_SECRET`: een lange willekeurige string, bijvoorbeeld uit `openssl rand -hex 32`
4. **Redeploy** zodat de variabelen actief worden.
5. Open de URL op je telefoon en kies **Deel → Zet op beginscherm** (iOS) of **Installeer app** (Android).

> Als je je `AUTH_SECRET` of je PIN wijzigt, word je overal uitgelogd.

## Lokaal draaien

```bash
cp .env.example .env.local   # vul DATABASE_URL (Neon), APP_PIN en AUTH_SECRET in
npm install
npm run dev
```

## Structuur

```
src/
  app/
    (app)/            schermen met onderste navigatie: Vandaag, Overzicht, Voorraad, Categorieën
    toevoegen/        uitgave toevoegen of bewerken (numpad)
    login/            PIN-scherm
    actions.ts        alle server actions (schrijven naar de database)
    manifest.ts       PWA-manifest
  components/         UI (voorraad met optimistische updates, pakje-icoon, navigatie)
  lib/
    db.ts             Neon-client + automatische schema-setup
    data.ts           queries en berekeningen (periodes in Europe/Amsterdam)
    auth.ts           cookie-ondertekening (HMAC)
  proxy.ts            beschermt alle pagina's achter de PIN
public/sw.js          service worker
```
