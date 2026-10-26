# Constrained UI framework – V0

V0 je funkční implementace návrhu z bakalářské práce. Framework používá pouze
standardní ES moduly a Web API, nemá běhové závislosti a ke spuštění aplikace
nevyžaduje build. Produkční build slouží pouze k vytvoření menší distribuce.

## Zápis komponent

HTML elementy představují funkce a jejich nastavení se řetězí. Potomci se
předávají přímo funkci elementu, takže se nikde neopakuje `nodeName`,
`className`, `children` ani ruční `append`.

```js
import {
  Component,
  button,
  div,
  mount,
  strong,
} from './src/index.js';

class Counter extends Component {
  constructor() {
    super();
    this.count = this.signal(0);
  }

  template() {
    return div(
      button(
        'Počet kliknutí: ',
        strong(this.count),
      )
        .class('counter')
        .class('is-positive', this.count.map((count) => count > 0))
        .prop('type', 'button')
        .on('click', () => this.count.update((count) => count + 1)),
    ).class('counter-wrapper');
  }
}

mount(new Counter(), document.querySelector('#app'));
```

Builder elementu podporuje:

- `.class('card', 'card--wide')` pro statické CSS třídy (řetězce);
- `.class('is-active', podmínka)` pro přepínanou třídu, kde podmínka je
  signál, `signal.map(...)` nebo boolean; pořadí volání nehraje roli;
- `.attr(name, value)`, `.aria(name, value)` a `.data(name, value)`;
- `.prop(name, value)` pro DOM vlastnosti, například `disabled` nebo `value`;
- `.style(name, value)` pro statické i reaktivní styly;
- `.on(type, handler, options)` pro události svázané s životním cyklem;
- `.use(extension, ...arguments)` pro vlastní znovupoužitelnou operaci řetězce;
- `.ref(name)` pro uložení skutečného uzlu do `this.refs`;
- `.text(value)`, `.child(value)` a `.children(...values)` pro obsah.

Každá hodnota přijímaná textem, atributem, vlastností, třídou nebo stylem může
být statická, přímo signál, nebo odvozená vazba `signal.map(transformace)`.
Funkce `value(zdroj, transformace)` dělá totéž a přijímá i statickou hodnotu,
takže komponenta může stejný vstup dostat jako konstantu i jako signál.
Signál se vytváří funkcí `signal()` nebo v komponentě metodou `this.signal()`.
Odvozenou hodnotu vytváří `this.computed(zdroje, výpočet)`; její odběry
komponenta při zničení sama uvolní.

Dynamickou strukturu řídí tři konstrukce:

- `show(zdroj, render)` vloží podstrom, dokud je hodnota pravdivá; `render`
  smí vrátit `null` a pak nevloží nic;
- `match(zdroj, { klíč: () => ... })` přepíná mezi variantami podle hodnoty,
  například mezi obrazovkami aplikace;
- `each(zdroj, { key, render })` udržuje seznam se stabilními klíči; `render`
  dostává položku jako signál, takže se změna dat promítne do existujícího
  řádku bez jeho nahrazení.

Reference `.ref(name)` uvnitř `show`, `match` nebo `each` se uloží do
`this.refs` komponenty, která šablonu vrátila.

Metoda `afterMount()` se volá až ve chvíli, kdy je kořen komponenty i celý
strom, do kterého patří, vložen do cílového uzlu. Vnořené komponenty ji
dostávají dříve než rodič. `beforeDestroy()` se volá před uvolněním odběrů
a událostí.

Pro neobvyklé HTML elementy lze místo pojmenované funkce použít
`tag('custom-element', ...children)`. Opakované nastavení lze zapouzdřit do
vlastní funkce a připojit pomocí `.use()`:

```js
const tooltip = (element, text) => {
  element.class('has-tooltip').attr('title', text);
};

tag('status-panel', 'Připraveno')
  .use(tooltip, 'Aktuální stav aplikace')
  .data('state', 'ready');
```

Pokud část rozhraní potřebuje přímo Web API (například `canvas`), může
`template()` vrátit skutečný DOM uzel. Obsluhy událostí a další prostředky se
pak navážou na životní cyklus komponenty metodami `this.listen(uzel, typ,
obsluha)` a `this.own(úklid)`.

## Veřejné API

| Oblast | Exporty |
| --- | --- |
| Komponenty | `Component`, `mount` |
| Stav | `signal`, `computed` |
| Šablony | `value`, `show`, `match`, `each`, `tag` a funkce HTML elementů |
| SVG (`src/svg.js`) | `svg`, `circle`, `path`, … a `svgTag` |

Komponenta je třída odvozená od `Component`, která v metodě `template()`
vrací svůj podstrom. K dispozici má `this.props`, `this.refs`, `this.root`,
`this.mounted`, metody `signal`, `computed`, `listen`, `own` a volitelné
háčky `afterMount()` a `beforeDestroy()`.

Existuje jediný způsob zápisu šablon. Dřívější objektový zápis
(`{ tag, children, 'on:click' }`), třída `ViewComponent`, alias `state()`
a nízkoúrovňové funkce `element`, `bind`, `text`, `list`, `when` a `view`
byly z V0 odstraněny nebo jsou pouze interní.

## Princip vykreslování

Řetězitelný builder není virtuální DOM. Existuje jen během úvodního průchodu
metodou `template()`, kdy se z něj rovnou vytvoří skutečné DOM uzly. Framework
si potom ponechá jen explicitní vazby na dynamická místa. Změna signálu proto
upraví konkrétní text, atribut, vlastnost, třídu nebo styl a znovu nevykresluje
celou komponentu.

Komponenta vlastní své reaktivní odběry, obsluhy událostí a vnořené komponenty.
`destroy()` je odstraní a uvolní. Z dokumentu přitom odebere pouze svůj kořen;
vnořené uzly odcházejí s ním, takže zničení obrazovky se seznamem znamená
jednu DOM operaci, nikoli jednu za každý řádek. Podmíněný obsah používá
hraniční komentářové uzly a seznam zachovává podle klíče identitu nezměněných
položek. Položky, jejichž pořadí se nezměnilo, seznam vůbec nepřesouvá.

## Spuštění a ověření

```text
npm install
npm run serve
```

Server vyžaduje Node.js 22.13 nebo novější, protože pro demonstrační data
používá vestavěný modul SQLite. Při prvním spuštění automaticky vytvoří
`framework/.data/kiosk.sqlite`, aplikuje schéma a vloží opakovatelnou sadu
kategorií a produktů. Tento vygenerovaný soubor není součástí repozitáře.

Demonstrační aplikace používá vlastní značku BITE a realistický katalog se
šesti kategoriemi a šestnácti položkami. Produktové fotografie jsou uložené
lokálně v jednom obrazovém atlasu, takže kiosk za běhu nestahuje externí
obrázky ani jiná data.

Objednávkový průchod odpovídá samoobslužnému kiosku: katalog doplňuje spodní
souhrnná lišta, samostatná obrazovka objednávky, nabídka doplňkových produktů,
volba konzumace na místě nebo s sebou a platební krok. Časově omezená nabídka
otevírá čtyřkrokové sestavení menu z burgeru, přílohy, nápoje a omáčky.

Poté lze otevřít:

- kiosk: `http://127.0.0.1:4173/demo/`
- kontrola API: `http://127.0.0.1:4173/api/health`
- prohlížečové testy: `http://127.0.0.1:4173/tests/`

Katalog poskytují endpointy `GET /api/categories`, `GET /api/menu-items`,
`GET /api/menu-items?category=<id>` a `GET /api/menu-items/<id>`. Kiosk odesílá
potvrzenou objednávku na `POST /api/orders`. Server znovu ověří položky a
množství, cenu vypočítá z aktuálních dat katalogu a objednávku i její řádky
uloží v jedné databázové transakci.

Úplné lokální ověření včetně produkčního buildu a velikosti:

```text
npm run verify
```

Součástí příkazu je také integrační scénář kiosku. Projde změnu kategorie,
detail produktu včetně klávesy Escape a návratu fokusu, práci s košíkem,
zachování identity jeho řádku, potvrzení objednávky a uvolnění reaktivních
odběrů po odstranění aplikace.

Zdrojové soubory používají pro odsazení skutečné tabulátory. Víceřádkové
destrukturování objektů linter nepovoluje. Formátování lze sjednotit příkazem
`npm run format` a samostatně zkontrolovat příkazem `npm run lint`; stejná
kontrola je součástí `npm run verify`.

`npm run build` vytvoří:

- `dist/modules/` – čitelné ES moduly pro přímé použití;
- `dist/constrained-ui.min.js` a sdílený chunk – minifikované jádro;
- `dist/svg.min.js` – volitelný SVG modul.

Aktuální V0 má 7 847 B minifikovaného jádra (3 207 B gzip, 2 858 B brotli).
Volitelný SVG vstup přidává 443 B před kompresí. Hodnoty reprodukuje
`npm run size`; příkaz současně selže při překročení limitu 10 kB a ověří
veřejné API čitelné i minifikované distribuce.

Kiosk je dokončený ve verzi V0. Podporuje zobrazení od šířky 320 px, omezení
animací podle nastavení uživatele, klávesové ovládání dialogů s uzavřeným
fokusem a návrat fokusu do nabídky po dokončení objednávky.

## Pokrytí požadavků

- `FR1`: třídní komponenty, mount, destroy, vlastnictví potomků a idempotentní uvolnění;
- `FR2`: řetězitelný deklarativní zápis a přímé cílené aktualizace DOM;
- `FR3`: synchronní signály a explicitní vazby na text, vlastnosti, atributy, třídy a styly;
- `FR4`: podmíněné podstromy (`show`, `match`) a seznamy se stabilními klíči;
- `FR5`: přímé listenery sdílející `AbortController` komponenty;
- `FR6`: skládání komponent, reaktivní vstupy položek a callbacky k rodiči;
- `FR7`: samostatný řetězitelný SVG modul;
- `NFR1`: nezávislé ES moduly a oddělená podpora SVG;
- `NFR2`: minifikované jádro V0 je menší než stanovených 10 kB;
- `NFR3`: zdrojové ES moduly i demo fungují bez buildu aplikace;
- `NFR4`: synchronní aktualizace skutečného DOM bez virtuálního stromu a plánovače;
- `NFR5`: standardní ECMAScript 2023 a Web API.

## Rozsah V0

V0 záměrně neobsahuje router, globální úložiště, SSR, hydrataci ani vlastní
datovou vrstvu. Seznam zatím neoptimalizuje počet přesunů pomocí longest
increasing subsequence a události používají přímé listenery namísto delegace.
Tyto body nejsou součástí požadavků na jádro práce.
