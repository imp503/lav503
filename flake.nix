{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs, ... }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      eachSystem = f: nixpkgs.lib.genAttrs supportedSystems (system: f {
        pkgs = import nixpkgs { inherit system; };
      });
    in
    {
      devShells = eachSystem ({ pkgs }:
        let
          commonBuildInputs = with pkgs; [
            bun
            biome
            rustc
            cargo
            rustPlatform.rustcSrc
            pkg-config
            openssl
          ];

          linuxBuildInputs = with pkgs; [
            webkitgtk_4_1
            gtk3
            libsoup_3
            glib
            libglvnd
            libappindicator
            librsvg
            patchelf
          ];
        in
        {
          default = pkgs.mkShell {
            buildInputs = commonBuildInputs ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux linuxBuildInputs;

            shellHook = ''
              export RUST_BACKTRACE=1
              ${pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
                export XDG_DATA_DIRS=$GSETTINGS_SCHEMAS_PATH:$XDG_DATA_DIRS
                export WEBKIT_DISABLE_COMPOSITING_MODE=1
              ''}
            '';
          };
        });
    };
}