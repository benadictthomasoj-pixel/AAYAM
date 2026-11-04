import os
import sys
import subprocess
from pathlib import Path
from urllib.parse import quote_plus
from dotenv import load_dotenv, set_key

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from scripts.migrate_sqlite_to_postgres import migrate_database

def get_password_from_macos_dialog(timeout_sec=45):
    applescript = f'''
    tell application "System Events"
        activate
        set dialogResult to display dialog "Enter your Supabase PostgreSQL Database Password for project dahgvnzokjpieadtvqrj:" default answer "" with hidden answer with title "AAYAM Secure Database Migration" giving up after {timeout_sec}
        if gave up of dialogResult is false then
            return text returned of dialogResult
        else
            return ""
        end if
    end tell
    '''
    try:
        proc = subprocess.run(['osascript', '-e', applescript], capture_output=True, text=True, check=True)
        pwd = proc.stdout.strip()
        return pwd
    except Exception as e:
        print(f"Dialog prompt error: {e}")
        return ""

def main():
    env_file = backend_dir / ".env"
    load_dotenv(env_file, override=True)
    
    pwd = os.getenv("SUPABASE_DB_PASSWORD", "").strip()
    if not pwd or pwd in ["[YOUR_ACTUAL_PASSWORD]", "YOUR_PASSWORD"]:
        print("Prompting via macOS Secure Input Dialog...")
        pwd = get_password_from_macos_dialog()
    
    if not pwd:
        print("NO_PASSWORD_ENTERED")
        sys.exit(1)
        
    # Construct pooler URL
    escaped = quote_plus(pwd)
    pg_url = f"postgresql://postgres.dahgvnzokjpieadtvqrj:{escaped}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
    
    # Update .env
    set_key(str(env_file), "SUPABASE_DB_PASSWORD", pwd)
    
    # Run migration
    sqlite_path = str(backend_dir / "aayam_infra.db")
    success = migrate_database(sqlite_path, pg_url)
    if success:
        print("MIGRATION_SUCCESS")
        sys.exit(0)
    else:
        print("MIGRATION_FAILED")
        sys.exit(2)

if __name__ == "__main__":
    main()
