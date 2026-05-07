import os
import sys
import shutil
import uvicorn
import webbrowser
import threading
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv

# --- 1. Robust Path Detection ---
if getattr(sys, 'frozen', False):
    # base_path is the root of the bundled assets (sys._MEIPASS)
    base_path = Path(sys._MEIPASS).resolve()
    mode = "FROZEN (EXE)"
else:
    base_path = Path(__file__).parent.resolve()
    mode = "DEVELOPMENT"

# res_dir is the root for all static assets and configuration
res_dir = base_path

# Diagnostic Logging
print(f"[*] Mode: {mode}")
print(f"[*] Resource root: {res_dir}")

# --- 2. Load Environment Variables ---
if mode == "FROZEN (EXE)":
    env_path = res_dir / ".env"
else:
    # Development: env is likely in the backend folder
    env_path = res_dir / "productix_fastapi" / ".env"

if env_path.exists():
    print(f"[*] Loading environment from: {env_path}")
    load_dotenv(str(env_path))
else:
    print(f"[!] Warning: .env file not found at {env_path}")

# --- 3. Backend Setup ---
# Add both the root and _internal to sys.path to find bundled python modules
if mode == "FROZEN (EXE)":
    sys.path.append(str(res_dir.absolute()))
    internal_lib = res_dir / "_internal"
    if internal_lib.exists():
        sys.path.append(str(internal_lib.absolute()))
else:
    backend_src_path = res_dir / "productix_fastapi"
    sys.path.append(str(backend_src_path.absolute()))

# Import the FastAPI app
try:
    from app.main1 import app
except ImportError as e:
    print(f"[ERROR] Could not import 'app.main1': {e}")
    print(f"[*] Checked sys.path: {sys.path}")
    sys.exit(1)

# --- 4. Database Migration/Seeding ---
if mode == "FROZEN (EXE)":
    app_data = os.environ.get('APPDATA', os.path.expanduser('~'))
    dest_dir = Path(app_data) / "Productix AI"
    dest_db = (dest_dir / "productix.db").resolve()
    src_db = (res_dir / "productix.db").resolve()
    
    # Create directory if it doesn't exist
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"[*] Database Source: {src_db}")
    print(f"[*] Database Destination: {dest_db}")
    
    # Function to check if the database actually has user accounts (WAL-safe, read-only)
    def database_has_accounts(path):
        import sqlite3
        if not path.exists(): return False
        try:
            conn = sqlite3.connect(f"file:{str(path)}?mode=ro", uri=True)
            cursor = conn.cursor()
            cursor.execute("SELECT count(*) FROM users")
            count = cursor.fetchone()[0]
            conn.close()
            return count > 0
        except Exception:
            return False

    # Function to seed users directly via SQL INSERT (WAL-safe, no file copy)
    def seed_users_from_source(src_path, dest_path):
        import sqlite3
        try:
            # Read all rows from source
            src_conn = sqlite3.connect(str(src_path))
            src_cursor = src_conn.cursor()
            src_cursor.execute("SELECT * FROM organizations")
            orgs = src_cursor.fetchall()
            src_cursor.execute("PRAGMA table_info(organizations)")
            org_cols = len(src_cursor.fetchall())
            src_cursor.execute("SELECT * FROM users")
            users = src_cursor.fetchall()
            src_cursor.execute("PRAGMA table_info(users)")
            user_cols = len(src_cursor.fetchall())
            src_conn.close()
            
            # Write to dest
            dest_conn = sqlite3.connect(str(dest_path))
            dest_cursor = dest_conn.cursor()
            
            # Ensure tables exist (they should, since SQLAlchemy creates them on import)
            org_ph = ','.join(['?' for _ in range(org_cols)])
            for org in orgs:
                try:
                    dest_cursor.execute(f"INSERT OR IGNORE INTO organizations VALUES ({org_ph})", org)
                except Exception as e:
                    print(f"[!] Org insert warning: {e}")
            
            user_ph = ','.join(['?' for _ in range(user_cols)])
            inserted = 0
            for user in users:
                try:
                    dest_cursor.execute(f"INSERT OR IGNORE INTO users VALUES ({user_ph})", user)
                    inserted += 1
                except Exception as e:
                    print(f"[!] User insert warning: {e}")
            
            dest_conn.commit()
            dest_conn.close()
            print(f"[*] Seeded {inserted} user account(s) into database.")
            return inserted > 0
        except Exception as e:
            print(f"[!] Seeding error: {e}")
            return False

    # Ensure dest DB exists (create it if not)
    if not dest_db.exists():
        print("[*] Destination database does not exist yet — will be created by SQLAlchemy.")
    
    # Always try to seed from bundled source to ensure new dev accounts are present
    if src_db.exists():
        print(f"[*] Checking for new accounts in bundled source...")
        success = seed_users_from_source(src_db, dest_db)
        if success:
            print("[*] Account synchronization complete.")
    else:
        print(f"[*] Using existing database in AppData.")

# --- 5. Robust Frontend Serving (SPA) ---
dist_dir = res_dir / "project" / "dist"
print(f"[*] Expected Frontend dist: {dist_dir}")

if dist_dir.exists():
    # 1. Catch-all for API that should never hit frontend
    @app.get("/api/{rest:path}")
    async def api_fallback():
        return JSONResponse(status_code=404, content={"detail": "API route not found"})

    # 2. Serve static files from the dist root (index.html, favicon, etc.)
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")
    
    # 3. Custom 404 handler for SPA routing
    @app.exception_handler(404)
    async def spa_exception_handler(request: Request, exc):
        path = request.url.path
        accept = request.headers.get("accept", "")
        
        # 1. High Reliability Heuristic: If the browser is asking for a PAGE (HTML),
        # always return the frontend index.html. This resolves collisions like /login/
        if "text/html" in accept:
            index_path = dist_dir / "index.html"
            if index_path.exists():
                return FileResponse(str(index_path))
        
        # 2. If it's a data request (JSON) or a missing asset, return a proper 404.
        # This prevents the frontend from crashing on unexpected HTML responses.
        return JSONResponse(
            status_code=404, 
            content={"detail": f"Resource '{path}' not found."}
        )
else:
    print(f"[!] Critical: Frontend dist directory not found at {dist_dir}")

# --- 6. Start Server ---
def open_browser():
    """Opens the browser after a short delay to ensure the server is ready."""
    print("[*] Automatically opening frontend in browser...")
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    import multiprocessing
    multiprocessing.freeze_support()
    
    # Start browser timer
    threading.Timer(1.5, open_browser).start()
    
    print("\n" + "="*60)
    print(" CRITICAL PERFORMANCE TIP FOR WINDOWS USERS:")
    print(" If the application 'hangs' or stops loading, it is likely")
    print(" because you clicked inside this black terminal window.")
    print(" Windows enters 'Mark/QuickEdit Mode' which pauses the app.")
    print(" PRESS ENTER or RIGHT-CLICK inside this window to unpause.")
    print("="*60 + "\n")
    
    print(f"[*] Starting Productix AI Server on http://127.0.0.1:8000")
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000, 
        log_level="info",
        loop="asyncio",        # Use standard asyncio loop for stability
        limit_concurrency=100,  # Ensure many concurrent refreshes are handled
        timeout_keep_alive=5    # Clean up stale connections faster
    )
    print(f"[*] Starting Productix AI Server on http://127.0.0.1:8000")
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000, 
        log_level="info",
        loop="asyncio",        # Use standard asyncio loop for stability
        limit_concurrency=100,  # Ensure many concurrent refreshes are handled
        timeout_keep_alive=5    # Clean up stale connections faster
    )
