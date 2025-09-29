#!/bin/bash

# Test nginx configuration without network dependencies
docker run --rm \
    --env AWS_S3_BUCKET_NAME=uploads \
    --env FILE_SIZE_LIMIT=5242880 \
    --add-host="web:127.0.0.1" \
    --add-host="admin:127.0.0.1" \
    --add-host="space:127.0.0.1" \
    --add-host="api:127.0.0.1" \
    --add-host="live:127.0.0.1" \
    --add-host="plane-minio:127.0.0.1" \
    plane-nginx nginx -t