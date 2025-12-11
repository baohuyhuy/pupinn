#!/bin/bash
set -e

echo "🌱 Seeding database with sample data..."
echo ""

# Default database settings (can be overridden via .env)
DB_USER="${POSTGRES_USER:-pupinn_user}"
DB_NAME="${POSTGRES_DB:-pupinn_db}"

# Seed directory
SEED_DIR="$(dirname "$0")/seeds"

# Check if seed directory exists
if [ ! -d "$SEED_DIR" ]; then
  echo "❌ Error: Seed directory not found at $SEED_DIR"
  exit 1
fi

# Execute seed scripts in order
for seed_file in "$SEED_DIR"/0*.sql; do
  if [ -f "$seed_file" ]; then
    filename=$(basename "$seed_file")
    echo "Loading: $filename"
    docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" < "$seed_file"
    echo "  ✓ Completed"
    echo ""
  fi
done

echo "✅ Database seeding complete!"

