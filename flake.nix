{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, rust-overlay, ... }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      eachSystem = f: nixpkgs.lib.genAttrs supportedSystems (system: f {
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ rust-overlay.overlays.default ];
        };
      });
    in
    {
      devShells = eachSystem ({ pkgs }:
        let
          commonBuildInputs = with pkgs; [
            bun
            biome
            rustPlatform.rustcSrc
            pkg-config
            openssl
            (pkgs.rust-bin.stable.latest.default.override {
              targets = [ "x86_64-pc-windows-msvc" ];
            })
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

          windowsCrossBuildInputs = with pkgs; [
            cargo-xwin
            clang
            lld
            llvm
            nsis
          ];
        in
        {
          default = pkgs.mkShell {
            buildInputs = commonBuildInputs
              ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux linuxBuildInputs
              ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux windowsCrossBuildInputs;

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