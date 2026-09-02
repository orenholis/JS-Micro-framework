# Constrained UI framework – demonstrační prototyp

Tento adresář obsahuje první spustitelnou implementaci návrhu z bakalářské práce.
Prototyp používá pouze standardní ES moduly a Web API, nemá runtime závislosti a ke spuštění nevyžaduje build.

Elementy se zapisují jako jeden deklarativní strom inspirovaný GW.
Renderer strom jednou projde a přímo vytvoří skutečné DOM uzly; nevzniká virtuální DOM ani nutnost ručně volat `append` pro každého potomka.

```js
class Counter extends ViewComponent {
  constructor() {
    super();
    this.count = this.signal(0);
  }

  template() {
    return {
      tag: 'button',
      class: 'counter',
      'class:is-positive': value(this.count, count => count > 0),
      'on:click': () => this.count.update(count => count + 1),
      children: [
        'Počet kliknutí: ',
        { tag: 'strong', text: value(this.count) },
      ],
    };
  }
}
```

Podporované části zápisu:

- `tag` nebo kompatibilní `nodeName` určuje typ elementu;
- `children` obsahuje libovolně vnořené elementy, texty a komponenty;
- `text` nastavuje statický nebo reaktivní text;
- `on:click` a další `on:*` registrují lifecycle-aware události;
- `attr:*`, `class:*` a `style:*` přijímají statické i reaktivní hodnoty;
- `ref` ukládá uzel do `this.refs` bez následného hledání v DOM;
- `value(signal, transformace)` vytváří explicitní reaktivní vazbu;
- `show(signal, render)` vytváří podmíněný podstrom;
- `each(signal, { key, render })` vytváří keyed seznam.

## Spuštění

Vyžaduje Node.js pouze jako lokální HTTP server:

```text
npm run serve
```

Poté otevřete:

- demonstrační kiosk: `http://127.0.0.1:4173/demo/`
- testy: `http://127.0.0.1:4173/tests/`

Základní testy frameworkového jádra lze spustit i bez prohlížeče:

```text
npm test
```

Velikosti zdrojových modulů a jejich komprimovaných variant vypíše:

```text
npm run size
```

## Implementované vlastnosti

- `FR1`: třídní komponenty, mount, destroy, vlastnictví potomků a idempotentní cleanup;
- `FR2`: deklarativní strom s přímou tvorbou a cílenou aktualizací skutečných DOM uzlů;
- `FR3`: synchronní signály, explicitní odběry a vazby na text, vlastnosti, atributy, třídy a styly;
- `FR4`: podmíněné podstromy a keyed kolekce zachovávající identitu uzlů;
- `FR5`: přímé listenery sdílející `AbortController` komponenty;
- `FR6`: skládání komponent a předávání callbacků směrem k rodiči;
- `FR7`: samostatný volitelný SVG modul;
- `NFR1`: rozdělení na nezávislé ES moduly;
- `NFR3`: přímé spuštění v prohlížeči bez bundleru a transpilace;
- `NFR4`: synchronní aktualizace bez virtuálního DOM a implicitního plánovače;
- `NFR5`: použití standardního moderního JavaScriptu a Web API.

Požadavek `NFR2` zatím nelze prohlásit za splněný.
Skript měří neoptimalizované moduly, zatímco limit 10 kB se vztahuje na skutečnou minifikovanou distribuční variantu.

## Struktura

- `src/state.js` – signály a odvozené hodnoty;
- `src/dom.js` – tvorba uzlů a explicitní vazby;
- `src/core.js` – scope, komponenty a lifecycle;
- `src/collections.js` – podmíněný obsah a keyed seznamy;
- `src/template.js` – rekurzivní převod deklarativního stromu na skutečný DOM;
- `src/svg.js` – volitelná podpora SVG;
- `demo/` – kiosková demonstrační aplikace;
- `tests/` – testy spouštěné přímo v prohlížeči.

## Omezení prototypu

- Veřejné názvy API jsou pracovní; aktuální hlavní rozhraní tvoří `ViewComponent`, `value`, `show` a `each`.
- Komponenta má právě jeden trvalý kořenový uzel; vícenásobné kořeny řeší obalovým elementem.
- Seznam podporuje stabilní klíče, ale neprovádí minimalizaci počtu přesunů pomocí longest increasing subsequence.
- Přímé listenery jsou záměrnou výchozí volbou; delegace událostí není implementována.
- Prototyp neobsahuje router, globální store, SSR, hydrataci ani vlastní datovou vrstvu.
- Produkční bundling, minifikace, typové deklarace a měření na cílovém zařízení patří do další fáze.
