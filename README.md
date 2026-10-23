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
  ViewComponent,
  button,
  div,
  mount,
  strong,
  value,
} from './src/index.js';

class Counter extends ViewComponent {
  constructor() {
    super();
    this.count = this.signal(0);
  }

  template() {
    return div(
      button(
        'Počet kliknutí: ',
        strong(value(this.count)),
      )
        .class('counter')
        .class('is-positive', value(this.count, (count) => count > 0))
        .prop('type', 'button')
        .on('click', () => this.count.update((count) => count + 1)),
    ).class('counter-wrapper');
  }
}

mount(new Counter(), document.querySelector('#app'));
```

Builder elementu podporuje:

- `.class('card', 'card--wide')` pro statické CSS třídy;
- `.class('is-active', value(signal))` pro reaktivní třídu;
- `.attr(name, value)`, `.aria(name, value)` a `.data(name, value)`;
- `.prop(name, value)` pro DOM vlastnosti, například `disabled` nebo `value`;
- `.style(name, value)` pro statické i reaktivní styly;
- `.on(type, handler, options)` pro události svázané s životním cyklem;
- `.ref(name)` pro uložení skutečného uzlu do `this.refs`;
- `.text(value)`, `.child(value)` a `.children(...values)` pro obsah.

Každá hodnota přijímaná atributem, vlastností, třídou nebo stylem může být
statická nebo vytvořená pomocí `value(signal, transformace)`. `show(...)`
spravuje podmíněný podstrom a `each(...)` seznam se stabilními klíči.

Pro neobvyklé HTML elementy lze místo pojmenované funkce použít
`tag('custom-element')`. Původní objektový popis a nízkoúrovňové funkce zůstaly
dostupné pro kompatibilitu a nestandardní použití.

## Princip vykreslování

Řetězitelný builder není virtuální DOM. Existuje jen během úvodního průchodu
metodou `template()`, kdy se z něj rovnou vytvoří skutečné DOM uzly. Framework
si potom ponechá jen explicitní vazby na dynamická místa. Změna signálu proto
upraví konkrétní text, atribut, vlastnost, třídu nebo styl a znovu nevykresluje
celou komponentu.

Komponenta vlastní své reaktivní odběry, obsluhy událostí a vnořené komponenty.
`destroy()` je odstraní a uvolní. Podmíněný obsah používá hraniční komentářové
uzly a seznam zachovává podle klíče identitu nezměněných položek.

## Spuštění a ověření

```text
npm install
npm run serve
```

Poté lze otevřít:

- kiosk: `http://127.0.0.1:4173/demo/`
- prohlížečové testy: `http://127.0.0.1:4173/tests/`

Úplné lokální ověření včetně produkčního buildu a velikosti:

```text
npm run verify
```

`npm run build` vytvoří:

- `dist/modules/` – čitelné ES moduly pro přímé použití;
- `dist/constrained-ui.min.js` a sdílený chunk – minifikované jádro;
- `dist/svg.min.js` – volitelný SVG modul.

Aktuální V0 má 9 680 B minifikovaného jádra (3 735 B gzip, 3 338 B brotli).
Volitelný SVG vstup přidává 443 B před kompresí. Hodnoty reprodukuje
`npm run size`.

## Pokrytí požadavků

- `FR1`: třídní komponenty, mount, destroy, vlastnictví potomků a idempotentní uvolnění;
- `FR2`: řetězitelný deklarativní zápis a přímé cílené aktualizace DOM;
- `FR3`: synchronní signály a explicitní vazby na text, vlastnosti, atributy, třídy a styly;
- `FR4`: podmíněné podstromy a seznamy se stabilními klíči;
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
