use axum::{
    extract::Extension,
    Json,
};
use redis::aio::MultiplexedConnection;
use serde::Serialize;

use crate::models::ApiResponse;

#[derive(Serialize)]
pub struct CacheStats {
    pub keys_count: i64,
    pub memory_used: String,
}

pub async fn clear_cache(
    Extension(mut redis): Extension<MultiplexedConnection>,
) -> Json<ApiResponse<String>> {
    match redis::cmd("FLUSHDB").query_async::<_, ()>(&mut redis).await {
        Ok(_) => Json(ApiResponse::success("Cache cleared".to_string())),
        Err(e) => {
            tracing::error!("Redis error: {}", e);
            Json(ApiResponse::error("Failed to clear cache"))
        }
    }
}

pub async fn cache_stats(
    Extension(mut redis): Extension<MultiplexedConnection>,
) -> Json<ApiResponse<CacheStats>> {
    let keys_count: i64 = redis::cmd("DBSIZE")
        .query_async(&mut redis)
        .await
        .unwrap_or(0);
    
    let memory: String = redis::cmd("INFO")
        .arg("memory")
        .query_async(&mut redis)
        .await
        .unwrap_or_default();
    
    // Parse memory used
    let memory_used = memory
        .lines()
        .find(|line| line.starts_with("used_memory_human:"))
        .and_then(|line| line.split(':').nth(1))
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    Json(ApiResponse::success(CacheStats {
        keys_count,
        memory_used,
    }))
}
