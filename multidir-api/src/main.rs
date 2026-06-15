use axum::{
    routing::{get, post},
    Extension, Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;
use tower_http::cors::CorsLayer;
use tracing::{info, Level};
use tracing_subscriber;

mod db;
mod handlers;
mod models;
mod redis_cache;

use handlers::{business, cache, health, search};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    info!("Starting Multi-Directory API...");

    // Load environment variables
    dotenvy::dotenv().ok();

    // Database connection
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    let db_pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await?;

    info!("Connected to database");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&db_pool)
        .await?;

    info!("Database migrations completed");

    // Redis connection
    let redis_url = env::var("REDIS_URL")
        .expect("REDIS_URL must be set");
    
    let redis_client = redis::Client::open(redis_url)?;
    let redis_conn = redis_client.get_multiplexed_async_connection().await?;

    info!("Connected to Redis");

    // Meilisearch client (optional)
    let meili_client = if let Ok(meili_url) = env::var("MEILI_URL") {
        let meili_key = env::var("MEILI_KEY").unwrap_or_default();
        Some(meilisearch_sdk::Client::new(meili_url, Some(meili_key)))
    } else {
        None
    };

    if meili_client.is_some() {
        info!("Meilisearch client initialized");
    }

    // Build router
    let app = Router::new()
        // Health check
        .route("/health", get(health::health_check))
        
        // Business endpoints
        .route("/api/businesses", get(business::list_businesses))
        .route("/api/businesses/:id", get(business::get_business))
        .route("/api/businesses/nearby", get(business::nearby_businesses))
        .route("/api/businesses/:id/reviews", get(business::get_reviews))
        
        // Search endpoints
        .route("/api/search", post(search::search_businesses))
        .route("/api/search/suggestions", get(search::search_suggestions))
        
        // Cache management
        .route("/api/cache/clear", post(cache::clear_cache))
        .route("/api/cache/stats", get(cache::cache_stats))
        
        // Layers
        .layer(CorsLayer::permissive())
        .layer(Extension(db_pool))
        .layer(Extension(redis_conn))
        .layer(Extension(meili_client));

    let port = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()?;

    let addr = format!("0.0.0.0:{}", port);
    info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
