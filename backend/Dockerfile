FROM rust:1.92 AS builder
RUN apt-get update && \
    apt-get install -y libpq-dev default-libmysqlclient-dev libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/diesel.toml ./
RUN mkdir -p src/bin && \
    echo "fn main() {}" > src/main.rs && \
    echo "" > src/lib.rs && \
    echo "fn main() {}" > src/bin/seed.rs && \
    cargo build --release && \
    rm -rf src
COPY backend/src ./src
COPY backend/migrations ./migrations
RUN rm -rf target/release/server target/release/deps/*server* && \
    cargo build --release --bin server


FROM debian:trixie-slim
RUN apt-get update && \
    apt-get install -y libpq5 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN groupadd -g 1001 appuser && \
    useradd -u 1001 -g appuser -s /usr/sbin/nologin -d /nonexistent appuser

COPY --from=builder /app/target/release/server /app/server
COPY --from=builder /app/migrations ./migrations
RUN chown -R appuser:appuser /app
USER appuser
EXPOSE 8080
CMD ["./server"]

