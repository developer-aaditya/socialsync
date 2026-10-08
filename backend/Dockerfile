# Use official Python 3.12 slim image as the base image
FROM python:3.12-slim

# Set environment variables to prevent Python from writing .pyc files and buffering stdout/stderr logs
ENV PYTHONDONTWRITEBYTECODE=1
# Ensure celery and other Python processes output logs to the console immediately
ENV PYTHONUNBUFFERED=1

# Set working directory in the container
WORKDIR /app

# Install system dependencies required for pillow, postgres, and netcat for entrypoint check
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container and install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application code into the /app/ directory
COPY . /app/

# Make entrypoint.sh executable
RUN chmod +x /app/entrypoint.sh

# Set the entrypoint script to be executed when the container starts
ENTRYPOINT ["/app/entrypoint.sh"]