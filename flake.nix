{
  description = "Node.js and pnpm development environment for transcript-browser";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_24
            corepack
          ];

          shellHook = ''
            mkdir -p "$PWD/.direnv/bin"
            corepack enable --install-directory "$PWD/.direnv/bin"
            export PATH="$PWD/.direnv/bin:$PATH"
          '';
        };
      });
}
