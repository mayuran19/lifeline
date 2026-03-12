# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# Stage 2: Build backend
FROM eclipse-temurin:25-jdk-noble AS backend-build
RUN apt-get update -q && apt-get install -y -q maven && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/ backend/
# Copy compiled frontend so maven-resources-plugin can include it in the JAR
COPY --from=frontend-build /app/frontend/dist backend/src/main/resources/static/
WORKDIR /app/backend
# Skip frontend-maven-plugin since we pre-built the frontend above
RUN mvn package -DskipTests -Dfrontend.build.skip=true

# Stage 3: Runtime
FROM eclipse-temurin:25-jre-noble
WORKDIR /app
COPY --from=backend-build /app/backend/target/lifeline-call-log-backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "app.jar"]
