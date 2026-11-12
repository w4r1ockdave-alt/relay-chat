# Relay Chat

Jednoduchý chat se šifrováním end-to-end. Server je pouhé „relé“: přeposílá
šifrovaná data mezi lidmi ve stejné místnosti, nezná klíč, přezdívky ani obsah
zpráv a nic neukládá.

## Spuštění

```bash
npm install
npm start        # http://localhost:3000 (PORT a HOST lze změnit proměnnými prostředí)
npm test
```

Šifrování v prohlížeči (WebCrypto) funguje jen přes HTTPS nebo na `localhost`.

## Jak to funguje

1. Při vytvoření místnosti prohlížeč vygeneruje náhodné 256bitové tajemství a
   uloží ho do odkazu za znak `#`. Tato část URL se na server neodesílá.
2. Z tajemství se pomocí HKDF-SHA-256 odvodí dvě nezávislé hodnoty: ID místnosti
   (to server vidí) a klíč AES-256-GCM (ten prohlížeč neopustí).
3. Každá zpráva včetně přezdívky a času se zašifruje s náhodným IV a odešle jako
   binární rámec. Server ho beze změny rozešle ostatním v místnosti.

## Co server vidí a co ne

| Vidí | Nevidí |
| --- | --- |
| IP adresy, ID místnosti, počet lidí, čas a velikost zpráv | obsah zpráv, přezdívky, klíč |

## Omezení

- Všichni v místnosti sdílejí jeden klíč: kdo získá odkaz, může číst i psát a
  vydávat se za kohokoli. Odkaz proto posílejte důvěryhodným kanálem.
- Není zde forward secrecy – únik odkazu odhalí i dříve zachycené zprávy.
- Historie se neukládá; zprávy vidí jen ti, kdo jsou právě připojeni.
- Provozovatel serveru by mohl podvrhnout upravený JavaScript. Pro vyšší
  nároky na bezpečnost si server provozujte sami.

Limity serveru: 50 lidí na místnost, 64 kB na zprávu, omezení rychlosti odesílání.
