use axum::{
    extract::{Path, Query},
    response::IntoResponse,
    routing::get,
    Router,
};
use axum_embed::ServeEmbed;
use clap::Parser;
use rust_embed::Embed;
use std::net::SocketAddr;
use std::time::Duration;
use tower_http::timeout::TimeoutLayer;

// use rust embed to embed in production or use from disk on dev
#[derive(Embed, Clone)]
#[folder = "webui/dist/"]
struct Assets;

// startup commands
#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    /// Port to listen on
    #[arg(short, long, default_value_t = 8080)]
    port: u16,

    /// Maximum nr of open rooms
    #[arg(short, long, default_value_t = 1000)]
    rooms: u32,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    // Create a regular axum app.
    let serve_assets = ServeEmbed::<Assets>::new();
    let app = axum::Router::new().nest_service("/", serve_assets);

    let listner = format!("127.0.0.1:{}", args.port);
    println!("Start listning on:\n{}", listner);
    let listener = tokio::net::TcpListener::bind(listner).await.unwrap();
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await
    .unwrap();
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
