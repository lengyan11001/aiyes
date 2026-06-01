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

if [ -f deploy/aiyes-job-sync.service ] && [ -f deploy/aiyes-job-sync.timer ]; then
  cp -a deploy/aiyes-job-sync.service /etc/systemd/system/aiyes-job-sync.service
  cp -a deploy/aiyes-job-sync.timer /etc/systemd/system/aiyes-job-sync.timer
  systemctl daemon-reload
  systemctl enable --now aiyes-job-sync.timer
fi

systemctl restart "$SERVICE_NAME"
systemctl is-active "$SERVICE_NAME"
