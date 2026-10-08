#!/bin/sh

# Exit immediately if any command returns a non-zero exit code
set -e

# Wait for postgreSQL database container to accept the connection
if [ "$DATABASE" = "postgres" ]; then
    echo "Waiting for PostgreSQL database at $SQL_HOST:$SQL_PORT..."
    while ! nc -z $SQL_HOST $SQL_PORT 2>/dev/null; do
        sleep 0.5
    done
    echo "PostgreSQL database is up and running!"
fi

# Executes migrations automatically on startup (only for web services)
echo "Running migrations..."
if [ "$SERVICE_TYPE" = "web" ]; then
    echo "Running migrations for web service..."
    python manage.py migrate --noinput
fi

# Executes passed container command (e.g. daphne and celery)
exec "$@"