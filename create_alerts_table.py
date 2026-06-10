#!/usr/bin/env python
"""
Direct script to create the alerts table using SQL
"""

import sys
sys.path.insert(0, 'h:\\ProductixAI')

from productix_fastapi.app.database import engine
import sqlite3

def create_alerts_table():
    print("[*] Creating alerts table using direct SQL...")
    
    try:
        # Get the database path from the engine
        db_path = str(engine.url).replace('sqlite:///', '')
        
        # Connect directly to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create the alerts table
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            alert_type VARCHAR(50) NOT NULL,
            severity VARCHAR(20) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            entity_type VARCHAR(50),
            entity_id INTEGER,
            data_context TEXT,
            is_dismissed BOOLEAN DEFAULT 0,
            dismissed_at DATETIME,
            dismissed_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (dismissed_by) REFERENCES users(id) ON DELETE CASCADE
        )
        """
        
        cursor.execute(create_table_sql)
        conn.commit()
        
        # Verify the table was created
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='alerts'")
        result = cursor.fetchone()
        
        if result:
            print("[SUCCESS] Alerts table created successfully!")
            
            # Show table structure
            cursor.execute("PRAGMA table_info(alerts)")
            columns = cursor.fetchall()
            print("[INFO] Table structure:")
            for col in columns:
                print(f"  - {col[1]} ({col[2]})")
        else:
            print("[ERROR] Alerts table was not created!")
            
        conn.close()
        
    except Exception as e:
        print(f"[ERROR] Failed to create alerts table: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_alerts_table()