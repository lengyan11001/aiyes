# Aiyes deployment

Production uses a Git working tree at `/opt/aiyes-platform/current` and a
systemd service named `aiyes-platform.service`. Runtime secrets live in the
server-side `.env`; do not commit them.

Deploy after pushing to GitHub:

```bash
cd /opt/aiyes-platform/current
sh deploy/pull-deploy.sh
```

The script runs:

- `git pull --ff-only`
- `npm ci`
- `npm run prisma:generate`
- `npm run typecheck`
- `npm run build`
- `npm run db:migrate`
- `systemctl restart aiyes-platform.service`

PostgreSQL and Redis are managed on the server by their own services. Nginx
proxies `https://aiyes.vip` to the local Next.js server on port `3000`.

The Docker Compose files are kept as a reference for local or containerized
deployment, but production deploys should use Git pull.
