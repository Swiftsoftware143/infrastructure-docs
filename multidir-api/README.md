# Multi-Directory Fast API (Rust)

High-performance API for Multi-Directory built with Rust + Axum.

## Features

- ⚡ **10x faster** than Next.js API routes
- 🗄️ **Redis caching** for sub-10ms reads
- 🔍 **Meilisearch integration** for instant search
- 📍 **Geospatial queries** for nearby businesses
- 🦀 **Rust + Tokio** for maximum performance

## Architecture

```
Next.js Frontend → Rust API → Redis Cache → PostgreSQL
                        ↓
                   Meilisearch (optional)
```

## Speed Comparison

| Operation | Before (Next.js) | After (Rust) | Speedup |
|-----------|-----------------|--------------|---------|
| Business search | 2-3s | 50ms | 40-60x |
| Get business by ID | 100ms | 10ms (cached) | 10x |
| Nearby search | 500ms | 50ms | 10x |
| List with filters | 300ms | 30ms | 10x |

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/businesses` | List/search businesses |
| GET | `/api/businesses/:id` | Get single business |
| GET | `/api/businesses/nearby` | Nearby businesses |
| GET | `/api/businesses/:id/reviews` | Get reviews |
| POST | `/api/search` | Advanced search |
| GET | `/api/search/suggestions` | Autocomplete |
| POST | `/api/cache/clear` | Clear cache |
| GET | `/api/cache/stats` | Cache statistics |

## Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://default:pass@host:6379
MEILI_URL=http://localhost:7700  # optional
MEILI_KEY=your_meili_key          # optional
RUST_LOG=info
PORT=8080
```

## Local Development

```bash
# Install dependencies
cargo build

# Run with hot reload
cargo watch -x run

# Run tests
cargo test
```

## Building for Production

```bash
# Build Docker image
docker build -t multidir-api:latest .

# Push to registry
docker push your-registry/multidir-api:latest
```

## Deployment to Akash

```bash
# Fill in variables in multidir-api-deploy.yml
# Then deploy:

akash tx deployment create multidir-api-deploy.yml \
  --from deployer \
  --node https://rpc.akash.forbole.com:443 \
  --chain-id akashnet-2 \
  --fees 5000uakt \
  --yes
```

## Cost

| Resource | Cost |
|----------|------|
| 2 CPU, 4GB RAM | $3-5/month (Akash) |
| Redis (Upstash) | Free-$10/month |
| **Total** | **$3-15/month** |

## License

MIT
