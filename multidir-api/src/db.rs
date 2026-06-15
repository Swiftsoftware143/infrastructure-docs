use sqlx::{PgPool, Row};
use crate::models::{Business, Category, Review, SearchQuery, SearchResult, NearbyQuery};
use uuid::Uuid;

pub struct BusinessRepository {
    pool: PgPool,
}

impl BusinessRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn get_by_id(&self, id: Uuid) -> Result<Option<Business>, sqlx::Error> {
        sqlx::query_as::<_, Business>(
            r#"
            SELECT * FROM businesses 
            WHERE id = $1 AND is_active = true
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn get_by_slug(&self, slug: &str) -> Result<Option<Business>, sqlx::Error> {
        sqlx::query_as::<_, Business>(
            r#"
            SELECT * FROM businesses 
            WHERE slug = $1 AND is_active = true
            "#
        )
        .bind(slug)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn search(&self, query: &SearchQuery) -> Result<SearchResult, sqlx::Error> {
        let page = query.page.unwrap_or(1);
        let per_page = query.per_page.unwrap_or(20).min(100);
        let offset = (page - 1) * per_page;

        // Build dynamic query
        let mut sql = String::from(
            "SELECT * FROM businesses WHERE is_active = true"
        );
        let mut count_sql = String::from(
            "SELECT COUNT(*) FROM businesses WHERE is_active = true"
        );
        
        let mut conditions: Vec<String> = Vec::new();

        if !query.q.is_empty() {
            conditions.push(format!(
                "(name ILIKE '%{}%' OR description ILIKE '%{}%')",
                query.q, query.q
            ));
        }

        if let Some(city) = &query.city {
            conditions.push(format!("city ILIKE '%{}%'", city));
        }

        if let Some(category) = &query.category {
            conditions.push(format!(
                "category_id IN (SELECT id FROM categories WHERE slug = '{}')",
                category
            ));
        }

        // Add conditions to both queries
        for condition in &conditions {
            sql.push_str(&format!(" AND {}", condition));
            count_sql.push_str(&format!(" AND {}", condition));
        }

        // Add sorting
        match query.sort.as_deref() {
            Some("rating") => sql.push_str(" ORDER BY rating DESC NULLS LAST"),
            Some("newest") => sql.push_str(" ORDER BY created_at DESC"),
            _ => sql.push_str(" ORDER BY rating DESC NULLS LAST, name ASC"),
        }

        // Add pagination
        sql.push_str(&format!(" LIMIT {} OFFSET {}", per_page, offset));

        // Execute queries
        let businesses: Vec<Business> = sqlx::query_as(&sql)
            .fetch_all(&self.pool)
            .await?;

        let total: i64 = sqlx::query_scalar(&count_sql)
            .fetch_one(&self.pool)
            .await?;

        let total_pages = (total as f64 / per_page as f64).ceil() as i32;

        Ok(SearchResult {
            businesses,
            total,
            page,
            per_page,
            total_pages,
        })
    }

    pub async fn nearby(&self, query: &NearbyQuery) -> Result<Vec<Business>, sqlx::Error> {
        let radius = query.radius.unwrap_or(10.0); // miles
        let limit = query.limit.unwrap_or(20);

        // Convert miles to degrees (approximate)
        let degrees = radius / 69.0;

        let mut sql = String::from(
            r#"
            SELECT *, 
                (6371 * acos(
                    cos(radians($1)) * cos(radians(latitude)) * 
                    cos(radians(longitude) - radians($2)) + 
                    sin(radians($1)) * sin(radians(latitude))
                )) AS distance
            FROM businesses 
            WHERE is_active = true 
            AND latitude BETWEEN $3 AND $4
            AND longitude BETWEEN $5 AND $6
            "#
        );

        if let Some(category) = &query.category {
            sql.push_str(&format!(
                " AND category_id IN (SELECT id FROM categories WHERE slug = '{}')",
                category
            ));
        }

        sql.push_str(&format!(
            " ORDER BY distance LIMIT {}",
            limit
        ));

        let min_lat = query.lat - degrees;
        let max_lat = query.lat + degrees;
        let min_lng = query.lng - degrees;
        let max_lng = query.lng + degrees;

        sqlx::query_as(&sql)
            .bind(query.lat)
            .bind(query.lng)
            .bind(min_lat)
            .bind(max_lat)
            .bind(min_lng)
            .bind(max_lng)
            .fetch_all(&self.pool)
            .await
    }

    pub async fn get_reviews(&self, business_id: Uuid, limit: i32) -> Result<Vec<Review>, sqlx::Error> {
        sqlx::query_as::<_, Review>(
            r#"
            SELECT * FROM reviews 
            WHERE business_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2
            "#
        )
        .bind(business_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
    }
}
