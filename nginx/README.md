# Plane Nginx Proxy

This is a high-performance nginx reverse proxy configuration for Plane that replaces the original Caddy proxy.

## Features

- ✅ **High Performance**: Optimized nginx configuration with connection pooling
- ✅ **Rate Limiting**: API and authentication endpoints are rate-limited
- ✅ **Security Headers**: Comprehensive security headers implementation
- ✅ **Health Checks**: Built-in health check endpoint
- ✅ **File Upload Support**: Configurable file upload limits
- ✅ **Static Asset Caching**: Optimized caching for CSS, JS, and images
- ✅ **WebSocket Support**: Full support for live collaboration features

## Service Routing

The proxy automatically routes requests to the appropriate services:

| Path | Service | Port | Description |
|------|---------|------|-------------|
| `/` | web | 3000 | Main Plane application |
| `/api/*` | api | 8000 | API endpoints (rate limited: 60/min) |
| `/auth/*` | api | 8000 | Authentication endpoints (rate limited: 5/min) |
| `/god-mode/*` | admin | 3000 | Admin interface |
| `/spaces/*` | space | 3000 | Public project views |
| `/live/*` | live | 3000 | Live collaboration service |
| `/uploads/*` | plane-minio | 9000 | File storage |
| `/health` | proxy | 80 | Health check endpoint |

## Configuration

### Environment Variables

The proxy uses these environment variables from your `.env` file:

- `AWS_S3_BUCKET_NAME`: Storage bucket name (default: `uploads`)
- `FILE_SIZE_LIMIT`: Maximum upload size in bytes (default: `5242880` = 5MB)
- `LISTEN_HTTP_PORT`: HTTP port for the proxy (default: `80`)

### Rate Limiting

- **API endpoints**: 60 requests/minute per IP
- **Auth endpoints**: 5 requests/minute per IP

### File Upload Limits

The upload limit is dynamically configured based on the `FILE_SIZE_LIMIT` environment variable.

## Usage

### Production

```bash
# Build and start all services
docker-compose up -d

# Test the proxy
./test-proxy.sh
```

### Development

```bash
# Use the development override
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# This will:
# - Remove individual service port exposure
# - Keep infrastructure ports exposed (DB, Redis, etc.)
# - Add nginx logs volume for debugging
```

### Testing

Run the included test script to verify all endpoints:

```bash
./test-proxy.sh
```

## Monitoring

### Health Check

The proxy includes a health check endpoint at `/health` that returns:
- HTTP 200 with "healthy" response when operational
- Used by Docker health checks and monitoring systems

### Logs

Nginx logs are available at:
- Access logs: `/var/log/nginx/access.log`
- Error logs: `/var/log/nginx/error.log`

In development mode, logs are mounted to `./nginx/logs/`

### Docker Health Check

The container includes built-in health checks that run every 30 seconds.

## Security Features

### Headers

The following security headers are automatically added:

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer-when-downgrade
Content-Security-Policy: default-src 'self' http: https: data: blob: 'unsafe-inline'
```

### Rate Limiting

- API endpoints are protected against abuse
- Different limits for authentication vs general API usage
- Per-IP tracking with burst capacity

## Comparison with Caddy

| Feature | Nginx (New) | Caddy (Original) |
|---------|-------------|------------------|
| Performance | Higher | Good |
| Memory Usage | Lower | Higher |
| Configuration | More explicit | More automatic |
| Rate Limiting | Built-in | Plugin required |
| Health Checks | Built-in | Basic |
| SSL/TLS | Manual setup | Automatic |
| WebSocket | Full support | Full support |

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Backend services not ready
   - Check if all services are running: `docker-compose ps`
   - Check service logs: `docker-compose logs [service-name]`

2. **404 Not Found**: Routing issue
   - Verify service names in docker-compose match nginx upstream definitions
   - Check nginx logs: `docker-compose logs proxy`

3. **Upload Failures**: File size limit
   - Check `FILE_SIZE_LIMIT` in `.env`
   - Verify nginx configuration was updated with correct limit

### Debug Mode

Enable debug logging by setting `NGINX_DEBUG=true` in the proxy environment variables.

## Migration from Caddy

The new nginx proxy is a drop-in replacement. Simply:

1. Stop the current setup: `docker-compose down`
2. Update to the new configuration
3. Start: `docker-compose up -d`

All existing functionality is preserved with improved performance and security.