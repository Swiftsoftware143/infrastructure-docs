use redis::aio::MultiplexedConnection;
use serde::{de::DeserializeOwned, Serialize};

pub struct RedisCache;

impl RedisCache {
    pub async fn get<T: DeserializeOwned>(
        conn: &mut MultiplexedConnection,
        key: &str,
    ) -> redis::RedisResult<Option<T>> {
        let data: Option<String> = redis::cmd("GET").arg(key).query_async(conn).await?;
        
        match data {
            Some(json_str) => {
                match serde_json::from_str(&json_str) {
                    Ok(value) => Ok(Some(value)),
                    Err(e) => {
                        tracing::error!("Failed to deserialize cache: {}", e);
                        Ok(None)
                    }
                }
            }
            None => Ok(None),
        }
    }

    pub async fn set<T: Serialize>(
        conn: &mut MultiplexedConnection,
        key: &str,
        value: &T,
        ttl_seconds: usize,
    ) -> redis::RedisResult<()> {
        let json_str = match serde_json::to_string(value) {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("Failed to serialize for cache: {}", e);
                return Ok(());
            }
        };

        redis::cmd("SETEX")
            .arg(key)
            .arg(ttl_seconds)
            .arg(json_str)
            .query_async(conn)
            .await
    }

    pub async fn delete(
        conn: &mut MultiplexedConnection,
        key: &str,
    ) -> redis::RedisResult<()> {
        redis::cmd("DEL").arg(key).query_async(conn).await
    }

    pub async fn delete_pattern(
        conn: &mut MultiplexedConnection,
        pattern: &str,
    ) -> redis::RedisResult<()> {
        let keys: Vec<String> = redis::cmd("KEYS").arg(pattern).query_async(conn).await?;
        
        if !keys.is_empty() {
            redis::cmd("DEL").arg(&keys).query_async(conn).await?;
        }
        
        Ok(())
    }
}
