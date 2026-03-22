#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="$(dirname "$0")/docker-compose.yml"

sudo docker compose -f "$COMPOSE_FILE" logs -f --tail=200 --timestamps
