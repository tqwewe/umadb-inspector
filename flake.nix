{
  description = "UmaDB Inspector - Web interface for exploring events in UmaDB";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        umadb-inspector = pkgs.callPackage ./default.nix { };
        
      in {
        packages = {
          default = umadb-inspector;
          umadb-inspector = umadb-inspector;
        };

        apps = {
          default = {
            type = "app";
            program = "${umadb-inspector}/bin/umadb-inspector";
          };
          umadb-inspector = {
            type = "app"; 
            program = "${umadb-inspector}/bin/umadb-inspector";
          };
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            npm
            git
          ];
          
          shellHook = ''
            echo "UmaDB Inspector development environment"
            echo "Run 'npm run dev' to start development server"
            echo "Run 'nix build' to build the package"
            echo "Run 'nix run' to run the built package"
          '';
        };

        # For backwards compatibility
        defaultPackage = umadb-inspector;
        defaultApp = {
          type = "app";
          program = "${umadb-inspector}/bin/umadb-inspector";
        };
      });
}