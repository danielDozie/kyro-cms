# Roadmap

## Completed ✅

- Multi-database adapters (SQLite, PostgreSQL, MongoDB)
- Multi-protocol APIs (REST, GraphQL, tRPC, WebSocket)
- Admin dashboard with auto-generated forms
- JWT authentication with RBAC
- Version history & draft/publish workflow
- Webhook system
- Media service with resize/crop
- Pre-built templates (minimal, starter, blog, ecommerce, kitchen-sink)
- `create-kyro` CLI scaffolding
- CI/CD with GitHub Actions
- Documentation site (VitePress)
- Headless Rich Text React Renderer (`@kyro-cms/kyro-rich-text-react` package)

## In Progress

### Frontend Pages

- Built-in frontend page generation from content models
- Template-based SSR/SSG for content pages
- Dynamic routing for collections

### Migration Tools

- Data export/import between databases
- Schema migration scripts
- Auth data migration helpers

### Health Checks

- `/api/health` endpoint with database connectivity check
- Readiness/liveness probes for container deployments

## Planned

### Observability

- Request metrics (requests/sec, error rate, latency)
- Audit log export
- OpenTelemetry integration

### Plugin Ecosystem

- Plugin marketplace
- Hook-based extension points
- Custom field type plugins

### Advanced Features

- Scheduled publishing
- Content localization (i18n collections)
- Custom admin components
- Webhook retry dashboard
- API key management UI
- Kyro AI Plugin Configuration UI (Pro Feature)

### CI/CD Improvements

- Auto-release notes generation
- Versioned docs deployment
- Canary releases

## Environment Configuration

```bash
# Database selection
DB_TYPE=sqlite          # sqlite, postgres, mongodb
DB_CONNECTION_STRING=    # Full connection URI (optional)

# Database credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kyro
DB_USER=
DB_PASSWORD=

# Connection pool (PostgreSQL/PostgreSQL)
DB_POOL_MIN=5
DB_POOL_MAX=20
```
