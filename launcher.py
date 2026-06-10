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
    # 1. Load bundled default env
    env_path = res_dir / ".env"
    if not env_path.exists():
        # PyInstaller 6+ often puts data in _internal
        env_path = res_dir / "_internal" / ".env"
    if env_path.exists():
        print(f"[*] Loading bundled environment from: {env_path}")
        load_dotenv(str(env_path))
    
    # 2. Check for and load custom env next to executable (takes precedence)
    custom_env = Path(sys.executable).parent / ".env"
    if custom_env.exists():
        print(f"[*] Loading custom override environment from: {custom_env}")
        load_dotenv(str(custom_env), override=True)
else:
    # Development: env is likely in the backend folder
    env_path = res_dir / "productix_fastapi" / ".env"
    if env_path.exists():
        print(f"[*] Loading environment from: {env_path}")
        load_dotenv(str(env_path))
    else:
        print(f"[!] Warning: .env file not found at {env_path}")

# --- 3. Robust Database Deployment (BEFORE backend import) ---
# CRITICAL: This MUST run before importing app.main1, because importing the
# backend immediately creates the SQLAlchemy engine + opens an SQLite connection.
# If the DB file doesn't exist yet, SQLite silently creates an empty one,
# and the subsequent shutil.copy2 either fails (file locked) or overwrites a
# file that is already memory-mapped, leaving the client with an empty database.
if mode == "FROZEN (EXE)":
    try:
        dest_dir = Path(sys.executable).parent.resolve()
        dest_db = (dest_dir / "productix.db").resolve()
        
        # Find the bundled database
        src_db = (res_dir / "productix.db").resolve()
        if not src_db.exists():
            src_db = (res_dir / "_internal" / "productix.db").resolve()
        
        # Expose writable directory for other modules (like uploads.py)
        os.environ["PRODUCTIX_DATA_DIR"] = str(dest_dir)
        
        # Create destination directory
        dest_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"[*] Database deployment:")
        print(f"    Source: {src_db}")
        print(f"    Destination: {dest_db}")
        
        def _db_has_superadmin(db_path: Path) -> bool:
            """Return True if the database at db_path contains the superadmin user."""
            try:
                import sqlite3 as _sqlite3
                conn = _sqlite3.connect(str(db_path))
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) FROM users WHERE email = 'superadmin@productix.ai'")
                count = cur.fetchone()[0]
                conn.close()
                return count > 0
            except Exception:
                return False

        should_copy = False
        copy_reason = ""

        if not src_db.exists():
            print("[!] Warning: Bundled database not found, will create new database")
        elif not dest_db.exists():
            should_copy = True
            copy_reason = "Database does not exist next to executable"
        elif not _db_has_superadmin(dest_db):
            # DB exists but is empty / missing superadmin — always replace it
            should_copy = True
            copy_reason = "Database is missing the superadmin account (likely empty)"
        else:
            # Both exist and superadmin is present — keep the user's existing data
            print("[*] Using existing database (superadmin verified OK)")

        if should_copy:
            print(f"[*] Copying bundled database: {copy_reason}")
            # Remove stale WAL/SHM files first to avoid corruption
            for ext in ["-wal", "-shm"]:
                stale = Path(str(dest_db) + ext)
                if stale.exists():
                    stale.unlink()
            shutil.copy2(src_db, dest_db)
            print("[SUCCESS] Database installed successfully")
        
        print(f"[*] Final database location: {dest_db}")
        
    except Exception as e:
        print(f"[ERROR] Database initialization failed: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        print("\n[ERROR] Press ENTER to close this window...")
        input()
        sys.exit(1)

# --- 4. Backend Setup ---
# Add both the root and _internal to sys.path to find bundled python modules
if mode == "FROZEN (EXE)":
    sys.path.append(str(res_dir.absolute()))
    internal_lib = res_dir / "_internal"
    if internal_lib.exists():
        sys.path.append(str(internal_lib.absolute()))
else:
    backend_src_path = res_dir / "productix_fastapi"
    sys.path.append(str(backend_src_path.absolute()))

# Import the FastAPI app — now safe because the DB file is already in place
try:
    from app.main1 import app
    print(f"[*] FastAPI app imported successfully")
except ImportError as e:
    print(f"[ERROR] Could not import 'app.main1': {e}")
    print(f"[*] Checked sys.path: {sys.path}")
    print("\n[ERROR] Press ENTER to close this window...")
    input()
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Unexpected error importing app: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    print("\n[ERROR] Press ENTER to close this window...")
    input()
    sys.exit(1)

# --- 5. Robust Frontend Serving (SPA) ---
dist_dir = res_dir / "project" / "dist"
if not dist_dir.exists():
    dist_dir = res_dir / "_internal" / "project" / "dist"
print(f"[*] Expected Frontend dist: {dist_dir}")

try:
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
                    return FileResponse(index_path)
            
            # 2. Otherwise, return JSON 404 for API calls
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        
        print(f"[*] Frontend mounted from: {dist_dir}")
    else:
        print(f"[ERROR] Frontend dist not found at: {dist_dir}")
        print("\n[ERROR] Press ENTER to close this window...")
        input()
        sys.exit(1)
        
except Exception as e:
    print(f"[ERROR] Frontend mounting failed: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    print("\n[ERROR] Press ENTER to close this window...")
    input()
    sys.exit(1)

def find_free_port(start_port=8000):
    import socket
    port = start_port
    while port < start_port + 100:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.bind(('127.0.0.1', port))
            s.close()
            return port
        except OSError:
            port += 1
    return start_port

# --- 6. Start Server ---
def run_server():
    port = find_free_port(8000)
    print(f"[*] Starting Productix AI server on port {port}...")
    print("[*] The application will open in your browser automatically")
    print("[*] Press CTRL+C to stop the server")
    
    # Open browser after a short delay
    def open_browser():
        import time
        time.sleep(2)
        webbrowser.open(f"http://127.0.0.1:{port}")
    
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Run uvicorn
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="info"
    )

if __name__ == "__main__":
    run_server()