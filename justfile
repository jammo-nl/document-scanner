default:
    @just --list

run:
    cargo watch -x "run --features local"
build-production:
    cargo build --profile production --features prd --target x86_64-unknown-linux-musl
build-next:
    cargo build --profile release --features prd --target x86_64-unknown-linux-musl
clean:
    cargo clean

deploy-production: build-production
    echo "copy to server"
    scp ./target/x86_64-unknown-linux-musl/release/document-scanner docscanner@web.docscanner.eu:/home/docscanner/document-scanner
    echo "update"
    ssh docscanner@web.docscanner.eu "mv document-scanner prod && chmod a+x prod"
deploy-next: build-next
    echo "copy to server"
    scp ./target/x86_64-unknown-linux-musl/release/document-scanner docscanner@web.docscanner.eu:/home/docscanner/document-scanner
    echo "update"
    ssh docscanner@web.docscanner.eu "mv document-scanner next && chmod a+x next"
