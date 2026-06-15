use axum::{
    extract::{Extension, Path, Query},
    Json,
};
use redis::aio::MultiplexedConnection;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    db::BusinessRepository,
    models::{ApiResponse, Business, NearbyQuery, SearchQuery},
    redis_cache::RedisCache,
};

pub async fn list_businesses(
    Extension(db): Extension<PgPool>,
    Extension(mut redis): Extension<MultiplexedConnection>,
    Query(query): Query<SearchQuery>,
) -> Json<ApiResponse<crate::models::SearchResult>> {
    let cache_key = format!("businesses:list:{:?}", query);
    
    // Try cache first
    if let Ok(Some(cached)) = RedisCache::get(&mut redis, &cache_key).await {
        if let Ok(result) = serde_json::from_str(&cached) {
            return Json(ApiResponse::success(result));
        }
    }

    let repo = BusinessRepository::new(db);
    
    match repo.search(&query).await {
        Ok(result) => {
            // Cache for 5 minutes
            let _ = RedisCache::set(&mut redis, &cache_key, &result, 300).await;
            Json(ApiResponse::success(result))
        }
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Json(ApiResponse::error("Failed to fetch businesses"))
        }
    }
}

pub async fn get_business(
    Extension(db): Extension<PgPool>,
    Extension(mut redis): Extension<MultiplexedConnection>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Business>> {
    let cache_key = format!("business:{}", id);
    
    // Try cache first
    if let Ok(Some(cached)) = RedisCache::get::<Business>(&mut redis, &cache_key).await {
        return Json(ApiResponse::success(cached));
    }

    let repo = BusinessRepository::new(db);
    
    match repo.get_by_id(id).await {
        Ok(Some(business)) => {
            // Cache for 1 hour
            let _ = RedisCache::set(&mut redis, &cache_key, &business, 3600).await;
            Json(ApiResponse::success(business))
        }
        Ok(None) => Json(ApiResponse::error("Business not found")),
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Json(ApiResponse::error("Failed to fetch business"))
        }
    }
}

pub async fn nearby_businesses(
    Extension(db): Extension<PgPool>,
    Extension(mut redis): Extension<MultiplexedConnection>,
    Query(query): Query<NearbyQuery>,
) -> Json<ApiResponse<Vec<Business>>> {
    let cache_key = format!("businesses:nearby:{:.6}:{:.6}", query.lat, query.lng);
    
    // Try cache first
    if let Ok(Some(cached)) = RedisCache::get::<Vec<Business>>(&mut redis, &cache_key).await {
        return Json(ApiResponse::success(cached));
    }

    let repo = BusinessRepository::new(db);
    
    match repo.nearby(&query).await {
        Ok(businesses) => {
            // Cache for 10 minutes
            let _ = RedisCache::set(&mut redis, &cache_key, &businesses, 600).await;
            Json(ApiResponse::success(businesses))
        }
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Json(ApiResponse::error("Failed to fetch nearby businesses"))
        }
    }
}

pub async fn get_reviews(
    Extension(db): Extension<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<crate::models::Review>>> {
    let repo = BusinessRepository::new(db);
    
    match repo.get_reviews(id, 20).await {
        Ok(reviews) => Json(ApiResponse::success(reviews)),
        Err(e) => {
            tracing::error!("Database error: {}", e);
            Json(ApiResponse::error("Failed to fetch reviews"))
        }
    }
}
