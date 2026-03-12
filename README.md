# Lifeline Call Log

Call log management system for Lifeline.

## Architecture

- **Backend**: Spring Boot 4.0.0, Java 25, Maven
- **Database**: PostgreSQL with Liquibase migrations
- **Database Access**: jOOQ 3.19.28 with code generation via Testcontainers (mvn -Pjooq-codegen)
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS + React Query
- **Auth**: Spring Security with JWT (HttpOnly cookies)
- **Deployment**: Railway / Render / fly.io (single cheap server)

## Project Structure

```
lifeline-call-log/
├── backend/              # Spring Boot application
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/lifelinecalllog/
│   │   │   │   ├── config/         # Spring Security, CORS
│   │   │   │   ├── controller/     # REST controllers
│   │   │   │   ├── dto/            # Data Transfer Objects
│   │   │   │   ├── security/       # JWT utilities
│   │   │   │   ├── service/        # Business logic
│   │   │   │   └── repository/     # Data access (placeholder)
│   │   │   └── resources/
│   │   │       ├── db/changelog/   # Liquibase migrations
│   │   │       └── application.properties
│   └── pom.xml
├── frontend/             # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── contexts/
│   │   └── lib/
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Java 25
- Maven 3.9+
- Node.js 20+
- pnpm (or npm/yarn)
- PostgreSQL 17
- Docker (for jOOQ code generation)

### Backend Setup

1. Create PostgreSQL database:
```bash
createdb lifeline_app

-- Create user
CREATE USER lifeline_app WITH PASSWORD 'password';

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE lifeline_app TO lifeline_app;

-- Connect to the specific database first, then grant schema permissions
\c lifeline_app

-- Grant usage on schema
GRANT CREATE ON SCHEMA public TO lifeline_app;
GRANT USAGE ON SCHEMA public TO lifeline_app;

-- Grant all on existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lifeline_app;

-- Grant all on existing sequences (for auto-increment/serial columns)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lifeline_app;

-- Grant all on existing functions
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO lifeline_app;

-- Auto-grant on future tables/sequences/functions created in this schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO lifeline_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO lifeline_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO lifeline_app;

```

2. Update database connection in `backend/src/main/resources/application.properties`

3. Run Liquibase migrations:
```bash
cd backend
mvn liquibase:update
```

4. Generate jOOQ code (after defining your schema):
```bash
mvn clean install -Pjooq-codegen
```

5. Run the application:
```bash
mvn spring-boot:run
```

Backend will be available at `http://localhost:8080`

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
pnpm install
```

2. Start development server:
```bash
pnpm dev
```

Frontend will be available at `http://localhost:5173`

## API Conventions

- `/api/v1/public/**` - Unauthenticated, read-only public content
- `/api/v1/auth/**` - Authentication endpoints (login, register, etc.)
- `/api/v1/user/**` - Authenticated USER and above, own data
- `/api/v1/platform-admin/**` - PLATFORM_ADMIN only, system management

## Database Conventions

- All tables have audit columns: `created_date`, `created_by`, `last_modified_date`, `last_modified_by`, `version`
- Audit columns are updated automatically using database triggers
- Core tables have corresponding `_history` tables
- History tables are populated automatically by triggers
- All primary keys use UUID type
- All datetime columns use `timestamptz`

## Auth Strategy

- JWT stored in HttpOnly, Secure, SameSite=Strict cookie for web
- Also accepts Bearer token in Authorization header for mobile
- JwtAuthFilter checks cookie first, then Authorization header fallback
- Refresh token stored in DB (revocable) also in HttpOnly cookie
- Access token: 15min, Refresh token: 7 days

## Development

### Adding New Tables

1. Create Liquibase migration in `backend/src/main/resources/db/changelog/sql/`
2. Include the migration in `db.changelog-master.xml`
3. Add audit triggers for your table in `002-audit-triggers.sql`
4. Add history table and triggers in `003-history-tables.sql`
5. Run migrations: `mvn liquibase:update`
6. Generate jOOQ code: `mvn clean install -Pjooq-codegen`

### Project Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed architecture and conventions.

## License

Proprietary
