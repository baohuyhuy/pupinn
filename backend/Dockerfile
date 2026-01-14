FROM rust:1.92-bookworm AS builder
RUN apt-get update && \
    apt-get install -y libpq-dev default-libmysqlclient-dev libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/diesel.toml ./
RUN cargo fetch --locked
COPY backend/src ./src
COPY backend/migrations ./migrations
COPY backend/src/bin ./seed
RUN cargo build --release --bin server --bin seed

RUN cargo install diesel_cli --no-default-features --features postgres

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y libpq5 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN groupadd -g 1001 appuser && \
    useradd -u 1001 -g appuser -s /usr/sbin/nologin -d /nonexistent appuser

COPY --from=builder /app/target/release/server /app/server
COPY --from=builder /app/target/release/seed /app/seed
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /usr/local/cargo/bin/diesel /usr/local/bin/diesel
COPY backend/diesel.toml ./diesel.toml
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 8080
CMD ["sh", "-c", "diesel migration run && ./seed && ./server"]

