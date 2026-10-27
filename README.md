# LAV503

Eine moderne von der Computer-AG des Johannes-Kepler-Gymnasium Reutlingen enwickelte Lehrauftragsverteilungssoftware.

---

## Installation

> [!IMPORTANT]
> Dieser Guide ist nur für Linux und andere *nix Systeme konzipiert.

---

### Installation von Abhängigkeiten

Abhängigkeiten müssen nur ein mal pro Computer installiert werden.

1. Nix Package Manager installieren und konfigurieren:

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
   mkdir -p ~/.config/nix
   echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
   ```

2. Direnv installieren und konfigurieren:

   ```bash
   nix profile install nixpkgs#direnv nixpkgs#nix-direnv
   grep -qF 'eval "$(direnv hook bash)"' ~/.bashrc || echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
   mkdir -p ~/.config/direnv
   echo "source ~/.nix-profile/share/nix-direnv/direnvrc" > ~/.config/direnv/direnvrc
   ```

---

### Projekt ausführen

> [!IMPORTANT]
> Nach der Installation von Abhängigkeiten (s. oben) muss das Terminal einmal komplett geschlossen und wieder geöffnet werden. 

1. Automatische Installation von Abhängigkeiten erlauben:

   ```bash
   direnv allow
   ```

   Dieser Befehl könnte eine Weile brauchen.

2. Bun-Abhängigkeiten installieren:

   ```bash
   bun i
   ```

3. Projekt starten:

   ```bash
   bun tauri dev
   ```

Viel Spaß!

---

> [!TIP]
> Mit `bun run lint` kann man den gesamten Code auf Fehler prüfen und automatisch verbessern lassen!
