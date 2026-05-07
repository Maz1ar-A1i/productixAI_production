# -*- mode: python ; coding: utf-8 -*-
import os
import sys

block_cipher = None

# Absolute paths
project_root = os.path.abspath(os.getcwd())
backend_path = os.path.join(project_root, 'productix_fastapi')
frontend_dist = os.path.join(project_root, 'project', 'dist')
env_file = os.path.join(backend_path, '.env')
db_file = os.path.join(backend_path, 'productix.db')
db_wal = os.path.join(backend_path, 'productix.db-wal')
db_shm = os.path.join(backend_path, 'productix.db-shm')

added_files = [
    (frontend_dist, 'project/dist'),
    (env_file, '.'),
    (db_file, '.'),
]

if os.path.exists(db_wal):
    added_files.append((db_wal, '.'))
if os.path.exists(db_shm):
    added_files.append((db_shm, '.'))

# Hidden imports for FastAPI/Uvicorn/SQLAlchemy/Plugins
hidden_imports = [
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'fastapi',
    'sqlalchemy.sql.default_comparator',
    'aiosqlite',
    'jinja2',
    'email_validator',
    'python-multipart',
    'bcrypt',
    'passlib.handlers.bcrypt',
    'jose',
    'jose.jwt',
]

a = Analysis(
    ['launcher.py'],
    pathex=[project_root, backend_path],
    binaries=[],
    datas=added_files,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='ProductixAI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='ProductixAI',
)
