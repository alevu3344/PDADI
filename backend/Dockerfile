# backend/Dockerfile


FROM python:3.13-slim AS builder


ENV POETRY_HOME="/opt/poetry"
ENV POETRY_VERSION="1.8.3"
ENV PATH="$POETRY_HOME/bin:$PATH"
ENV POETRY_VIRTUALENVS_IN_PROJECT=true


RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*


RUN curl -sSL https://install.python-poetry.org | python - --version ${POETRY_VERSION}


WORKDIR /app_builder

COPY pyproject.toml poetry.lock ./

RUN poetry install --no-interaction --no-ansi --no-dev --no-root

FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5001
WORKDIR /app

COPY --from=builder /app_builder/.venv ./.venv

ENV PATH="/app/.venv/bin:$PATH"

COPY app.py .
COPY saved_model/ ./saved_model/

EXPOSE 5001

CMD ["python", "-m", "flask", "run"]