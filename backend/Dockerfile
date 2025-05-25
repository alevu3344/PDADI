# backend/Dockerfile

# Stage 1: Install Poetry and project dependencies in a builder environment
FROM python:3.13-slim AS builder

# Set environment variables for Poetry
ENV POETRY_HOME="/opt/poetry"
ENV POETRY_VERSION="1.8.3"
ENV PATH="$POETRY_HOME/bin:$PATH"
# *** CHIAVE DELLA SOLUZIONE: Dice a Poetry di creare .venv nella root del progetto ***
ENV POETRY_VIRTUALENVS_IN_PROJECT=true

# Install system dependencies required for Poetry installation (curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python - --version ${POETRY_VERSION}

# Set working directory for the builder stage
WORKDIR /app_builder

# Copy only the files necessary for dependency installation to leverage Docker cache
COPY pyproject.toml poetry.lock ./

# Install dependencies using Poetry
# Il .venv verrà creato qui dentro /app_builder/.venv grazie a POETRY_VIRTUALENVS_IN_PROJECT=true
RUN poetry install --no-interaction --no-ansi --no-dev --no-root


# Stage 2: Create the final application image from a clean Python base
FROM python:3.13-slim

# Set environment variables for Flask and Python
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5001
WORKDIR /app

# Copy the virtual environment created by Poetry from the builder stage
# Ora /app_builder/.venv dovrebbe esistere
COPY --from=builder /app_builder/.venv ./.venv

# Activate the virtual environment by adding its bin directory to PATH
ENV PATH="/app/.venv/bin:$PATH"

# Copy the application code and other necessary files into the final image
COPY app.py .
COPY saved_model/ ./saved_model/
# Se hai moduli Python in una cartella src/ usati da app.py, copia anche quella:
# COPY src/ ./src/

# Expose the port the app runs on
EXPOSE 5001

CMD ["python", "-m", "flask", "run"]