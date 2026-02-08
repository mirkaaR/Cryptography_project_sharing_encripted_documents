Decentralizovana aplikacija (DApp) za bezbedno čuvanje i deljenje dokumenata

Ovaj projekat predstavlja rešenje za sigurno upravljanje poverljivim dokumentima korišćenjem Ethereum blockchain tehnologije i savremenih kriptografskih algoritama. Razvijen je u okviru studija na Fakultetu inženjerskih nauka u Kragujevcu.

🎯 Cilj projekta

Glavni fokus projekta je obezbeđivanje poverljivosti, integriteta i dostupnosti (CIA trijada) podataka. Aplikacija omogućava korisnicima da:

    Otpremaju dokumente van blockchain-a (IPFS model).

    Vrše enkripciju podataka pre slanja.

    Upravljaju pravima pristupa putem pametnih ugovora.

    Garantuju integritet dokumenta putem hash vrednosti zapisanih na blockchain-u.

🛠 Tehnologije i alati

    Blockchain: Ethereum (Sepolia testna mreža).

    Pametni ugovori: Solidity.

    Razvojno okruženje: Hardhat / Truffle (opciono Remix IDE).

    Frontend: React.js uz ethers.js (ili Web3.js) integraciju.

    Novčanik: MetaMask za potpisivanje transakcija i upravljanje ključevima.

    Kriptografija: AES-256 (simetrična enkripcija), RSA/ECC (asimetrična enkripcija ključeva), SHA-256 (provera integriteta).

🔐 Kriptografski i bezbednosni zahtevi

Projekat implementira stroge bezbednosne protokole:

    Bezbedno skladištenje: Privatni podaci se nikada ne upisuju direktno na blockchain. Beleže se isključivo hash vrednosti i metapodaci.

    Enkripcija: Dokumenti se šifruju algoritmom AES-256. Deljenje ključeva sa drugim korisnicima vrši se enkripcijom njihovim javnim ključevima.

    Integritet: Upotrebom SHA-256 funkcije, obezbeđen je revizorski trag koji garantuje da dokument nije menjan od trenutka registracije.

    Kontrola pristupa: Samo vlasnik dokumenta ima autoritet da putem pametnog ugovora dodeli ili ukine prava pristupa drugim adresama.

🚀 Instalacija i pokretanje

    Klonirajte repozitorijum:
    Bash

git clone [link_ka_tovm_githubu]

Instalirajte zavisnosti:
Bash

npm install

Konfiguracija mreže: Podesite svoj MetaMask na Sepolia testnu mrežu. Testni ETH možete preuzeti sa Google Cloud Faucet-a.

Deployment ugovora:
Bash

npx hardhat run scripts/deploy.js --network sepolia

Pokretanje aplikacije:
Bash

    npm start

📋 Struktura pametnog ugovora

Ugovor beleži:

    Jedinstveni identifikator (ID) dokumenta.

    Hash vrednost sadržaja (za proveru integriteta).

    Adresu vlasnika.

    Spoljnu lokaciju (IPFS link).

    Listu adresa sa pravom pristupa
