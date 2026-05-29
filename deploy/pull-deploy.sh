#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/aiyes-platform/current}"
SERVICE_NAME="${SERVICE_NAME:-aiyes-platform.service}"

cd "$APP_DIR"

git pull --ff-only
npm ci
npm run prisma:generate
npm run typecheck
npm run build
cp -a .env .next/standalone/.env
npm run db:migrate

systemctl restart "$SERVICE_NAME"
systemctl is-active "$SERVICE_NAME"
