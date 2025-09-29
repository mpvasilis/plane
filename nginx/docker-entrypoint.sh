#!/bin/sh

# Replace environment variables in nginx configuration
BUCKET_NAME=${AWS_S3_BUCKET_NAME:-uploads}
FILE_SIZE_LIMIT=${FILE_SIZE_LIMIT:-50m}

# Convert FILE_SIZE_LIMIT from bytes to MB if it's a number
if echo "$FILE_SIZE_LIMIT" | grep -qE '^[0-9]+$'; then
    FILE_SIZE_LIMIT=$((FILE_SIZE_LIMIT / 1024 / 1024))m
fi

# Create nginx config with environment variables substituted
sed "s/{{BUCKET_NAME}}/$BUCKET_NAME/g; s/{{FILE_SIZE_LIMIT}}/$FILE_SIZE_LIMIT/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# If the first argument is nginx and second is -t, test config and exit
if [ "$1" = "nginx" ] && [ "$2" = "-t" ]; then
    exec nginx -t
fi

# Start nginx
exec nginx -g "daemon off;"