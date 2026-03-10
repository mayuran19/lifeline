# Project: Lifeline Call Log

## Architecture
- Backend: Spring Boot 4.0.0, Java 25, Maven
- Database: PostgreSQL with Liquibase migrations
- Database access: jOOQ 3.19.28 with code generation via Testcontainers (mvn -Pjooq-codegen), no Hibernate and JPA
- Frontend: React 19 + TypeScript + Vite + TailwindCSS + React Query
- Auth: Spring Security. Refer to Auth Strategy
- Deployment: Railway / Render / fly.io (single cheap server)

## Project Structure
- /backend  -> Spring Boot app (port 8080)
- /frontend -> React app (port 5173)

## API Conventions
- /api/v1/public/**       -> unauthenticated, read-only approved content
- /api/v1/auth/**         -> authentication endpoints (login, register, refresh, logout)
- /api/v1/user/**         -> authenticated USER and above, own data
- /api/v1/platform-admin/** -> PLATFORM_ADMIN only, manage system

## Frontend
- Single React app, role-based routing
- Calls API endpoints based on authenticated role
- Axios interceptor adds cookie automatically

## Database Convention
- All tables to have audit columns: created_date, created_by, last_modified_date, last_modified_by, version
- Audit columns will be updated using database triggers
- Version will be updated by database triggers
- When inserted, version will be 1 and this will be available in history table as well
- Core tables to have _history tables
- History table will be populated by trigger with extra column dml_type(INSERT/UPDATE/DELETE), history_created_date
- History table will not have any constraints
- All table primary key columns will use UUID type
- All datetime types will use timestamptz

## Key Conventions for API
- REST API versioned at /api/v1
- All DB changes via Liquibase migration files
- DTOs use records as much as possible, just beans ok also
- Frontend calls backend via /api proxy (Vite config)

## Domain Models
- user: public user
- platform_admin: platform admin user

## Auth Strategy
- JWT stored in HttpOnly, Secure, SameSite=Strict cookie for web
- Also accept Bearer token in Authorization header for future mobile
- JwtAuthFilter checks cookie first, then Authorization header fallback
- Refresh token stored in DB (revocable) also in HttpOnly cookie
- Access token: 15min, Refresh token: 7 days

## jOOQ Code Generation
To generate jOOQ classes after creating/updating database schema:
```bash
cd backend
mvn clean install -Pjooq-codegen
```

This will:
1. Start a PostgreSQL Testcontainer
2. Run Liquibase migrations against it
3. Generate jOOQ classes from the resulting schema
4. Place generated code in `src/main/java/com/lifelinecalllog/jooq/`

## Next Steps
1. Define your database schema in Liquibase migration files
2. Add audit triggers for your tables in `002-audit-triggers.sql`
3. Add history tables and triggers in `003-history-tables.sql`
4. Run jOOQ code generation: `mvn clean install -Pjooq-codegen`
5. Implement your business logic using generated jOOQ classes
