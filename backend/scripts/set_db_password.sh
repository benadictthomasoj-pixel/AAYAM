#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$BACKEND_DIR/.env"

echo "=========================================================="
echo " AAYAM — Secure Supabase Password Setup & Data Migration"
echo "=========================================================="
echo ""
echo "Enter your Supabase database password (input will be hidden):"
read -s DB_PASS
echo ""

if [ -z "$DB_PASS" ]; then
    echo "Error: Password cannot be empty."
    exit 1
fi

# Update SUPABASE_DB_PASSWORD in .env
cd "$BACKEND_DIR"
./venv/bin/python -c "
import os, sys
from dotenv import set_key
env_file = '$ENV_FILE'
pwd = '''$DB_PASS'''
set_key(env_file, 'SUPABASE_DB_PASSWORD', pwd)
print('Updated SUPABASE_DB_PASSWORD in backend/.env successfully.')
"

# Run migration
echo "Executing database migration..."
./venv/bin/python scripts/migrate_sqlite_to_postgres.py --password "$DB_PASS"

echo ""
echo "=========================================================="
echo " Migration finished successfully!"
echo "=========================================================="
