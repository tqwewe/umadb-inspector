{
  pkgs ? import <nixpkgs> { },
}:

pkgs.stdenv.mkDerivation {
  pname = "umadb-inspector";
  version = "1.0.0";

  src = ./.;

  nativeBuildInputs = with pkgs; [ nodejs_24 ];

  # Allow network access for npm install
  __impure = true;

  buildPhase = ''
    runHook preBuild

    # Install dependencies for all packages
    npm ci
    cd client && npm ci && cd ..
    cd server && npm ci && cd ..
    cd shared && npm ci && cd ..

    # Build client
    cd client
    npm run build
    cd ..

    # Build server
    cd server
    npm run build
    cd ..

    runHook postBuild
  '';

  installPhase = ''
        runHook preInstall
        
        mkdir -p $out/lib/umadb-inspector
        mkdir -p $out/bin
        
        # Copy server build output
        cp -r server/dist $out/lib/umadb-inspector/
        cp -r server/node_modules $out/lib/umadb-inspector/
        cp server/package.json $out/lib/umadb-inspector/
        
        # Copy client build output to be served by server
        cp -r client/dist $out/lib/umadb-inspector/public
        
        # Copy shared package
        cp -r shared/dist $out/lib/umadb-inspector/shared
        
        # Create startup script
        cat > $out/bin/umadb-inspector << EOF
    #!/bin/sh
    cd $out/lib/umadb-inspector
    export NODE_PATH=$out/lib/umadb-inspector/node_modules
    export PORT=\''${PORT:-3001}
    export UMADB_URL=\''${UMADB_URL:-localhost:50051}
    exec ${pkgs.nodejs}/bin/node dist/index.js "\$@"
    EOF
        
        chmod +x $out/bin/umadb-inspector
        
        runHook postInstall
  '';

  meta = with pkgs.lib; {
    description = "Web interface for exploring events in UmaDB";
    homepage = "https://github.com/tqwewe/umadb-inspector";
    license = licenses.mit; # Adjust if different
    maintainers = [ ];
    platforms = platforms.all;
    mainProgram = "umadb-inspector";
  };
}
