# Praktijkgids voor kmo's

Deze gids is bedoeld voor de zaakvoerder of boekhouder van een kmo die Exact Online al
gebruikt en er nu via Claude vragen aan wil stellen. Ze veronderstelt geen programmeerkennis.

---

## Wat kun je ermee vragen?

De MCP-server geeft je AI-assistent toegang tot dezelfde gegevens die je in Exact Online ziet.
Enkele vragen die meteen werken:

**Geld dat binnen moet komen**

> "Welke klantenfacturen staan open en hoelang al?"
> "Toon me alle vervallen facturen boven 1.000 euro, oudste eerst."
> "Welke klant heeft het hoogste openstaande saldo?"

**Geld dat buiten gaat**

> "Welke leveranciersfacturen vervallen deze week?"
> "Wat is mijn totale openstaande schuld aan leveranciers?"

**Resultaat en omzet**

> "Wat is mijn omzet dit jaar tot nu toe, vergeleken met vorig jaar?"
> "Toon de proef- en saldibalans voor de eerste zes maanden."
> "Welke grootboekrekeningen hebben de grootste kosten dit kwartaal?"

**Relaties en verkoop**

> "Zoek de klant met btw-nummer BE0123456789 en toon zijn laatste vijf facturen."
> "Maak een offerte voor klant X met drie lijnen advies aan 950 euro per dag."
> "Boek deze factuur en stuur ze door naar de klant."

**Btw**

> "Welke btw-codes gebruik ik en aan welk percentage?"
> "Toon de ingediende btw-aangiften van dit jaar."

---

## Hoe je assistent te werk gaat

Achter elke vraag zitten meestal twee of drie stappen. Bij "welke klant heeft het hoogste
openstaande saldo" bijvoorbeeld:

1. `exact_me` — in welke administratie zitten we?
2. `exact_aging_receivables_list` — het openstaande bedrag per klant, in ouderdomsschijven.
3. Sorteren en samenvatten.

Je hoeft die stappen niet te kennen. Wel handig om te weten: als het antwoord vreemd lijkt,
vraag door met "welke gegevens heb je precies opgehaald?" De assistent kan de ruwe cijfers
tonen.

---

## Belangrijke afspraken bij cijfers

Drie dingen bepalen of een cijfer klopt. Vraag er expliciet naar als het ertoe doet.

**1. Een maand is pas betrouwbaar als ze verwerkt is.** Exact kent voorlopige en verwerkte
boekingen. `exact_journal_status_list` toont per dagboek en periode wat nog openstaat.
Vraag: *"Is maart al volledig verwerkt?"* voor je een maandcijfer als definitief neemt.

**2. Tekens verschillen per bron.** In `exact_transaction_lines_list` volgt Exact de
boekhoudkundige conventie: debet positief, dus kosten positief en opbrengsten negatief. In de
rapporten onder `reports` staan bedragen zoals je ze verwacht. Als een omzetcijfer negatief
oogt, is dat meestal dit.

**3. Eén verbinding kan meerdere vennootschappen zien.** Werkt je boekhouder met meerdere
administraties, dan bepaalt de *divisie* over welke vennootschap je vraag gaat. Vraag
*"welke administraties zie je?"* en daarna *"gebruik divisie 123456 voor de rest van dit
gesprek"*.

---

## Veilig werken

Exact Online bevat je volledige boekhouding. Drie instellingen om dat af te schermen:

| Wat je wilt | Instelling |
|-------------|-----------|
| De assistent mag enkel lezen, nooit boeken of wijzigen | `EXACT_READ_ONLY=true` |
| Enkel één vennootschap zichtbaar, ook al ziet de login er meer | `EXACT_DIVISION=123456` |
| Alleen rapportage, geen verkoop- of aankoopmodule | `EXACT_TOOLS=system,reports,financial` |

`EXACT_READ_ONLY=true` is de aanrader wanneer je vooral wilt bevragen. De schrijf-tools worden
dan niet eens geladen, dus de assistent kán niets aanpassen — ook niet per ongeluk.

Verder geldt altijd: **de assistent vraagt bevestiging voor ze iets boekt of verwijdert.**
Een verwerkte factuur kan niet meer gewijzigd worden, ook niet door Exact zelf.

---

## Aanbevolen profielen

De volledige set is 147 tools. Dat is veel context voor je assistent, en meer dan de meeste
kmo's nodig hebben. Kies een profiel dat bij je gebruik past:

```bash
# Enkel opvolgen van geld: wie moet nog betalen, wat moet ik betalen
EXACT_TOOLS=system,reports
EXACT_READ_ONLY=true

# Klanten en verkoop: relaties, offertes, facturen
EXACT_TOOLS=system,relations,sales,items,vat

# Boekhouding: grootboek, bank, btw, rapporten
EXACT_TOOLS=system,financial,banking,reports,vat

# Alles (standaard)
# EXACT_TOOLS niet instellen
```

---

## Wat er (nog) niet in zit

Deze eerste versie richt zich op de kern van een kmo-boekhouding. Niet als aparte tools
aanwezig: lonen en personeel, productie, voorraadbeheer, projecten, abonnementen en vaste
activa. Je assistent kan die endpoints wel bereiken via `exact_request`, maar zonder de
ingebouwde uitleg en standaardvelden.

Mis je een module? Open een issue met de gewenste resource, dan bekijken we ze voor een
volgende groep.

---

## Hulp nodig?

- Technische opzet: [docs/AUTHENTICATION.md](AUTHENTICATION.md)
- Alle beschikbare resources: [docs/exact-endpoints.md](exact-endpoints.md)
- Liever niet zelf hosten: BoostU biedt een beheerde versie aan, zie de README.
