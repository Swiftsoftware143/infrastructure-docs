use axum::{
    extract::{Extension, Query},
    Json,
};
use serde::Deserialize;

use crate::models::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct SuggestionQuery {
    pub q: String,
    pub limit: Option<usize>,
}

pub async fn search_businesses(
    Extension(_db): Extension<sqlx::PgPool>,
    Json(_query): Json<crate::models::SearchQuery>,
) -> Json<ApiResponse<crate::models::SearchResult>> {
    // This is handled by list_businesses
    // Here you could add Meilisearch integration
    Json(ApiResponse::error("Use /api/businesses endpoint"))
}

pub async fn search_suggestions(
    Query(query): Query<SuggestionQuery>,
) -> Json<ApiResponse<Vec<String>>> {
    // Simple autocomplete suggestions
    // In production, this would query Meilisearch or Elasticsearch
    
    let suggestions: Vec<String> = vec![
        format!("{} near me", query.q),
        format!("best {}", query.q),
        format!("{} reviews", query.q),
        format!("cheap {}", query.q),
    ];
    
    Json(ApiResponse::success(suggestions))
}
