"""
AROS Database Initialization Script
Creates database schema and runs migrations
"""

import psycopg2
from psycopg2 import sql
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def create_database(dbname="aros", user="postgres", password="test123", host="localhost"):
    """Create the aros database if it doesn't exist"""
    
    try:
        # Connect to default 'postgres' database
        conn = psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{dbname}'")
        if not cursor.fetchone():
            print(f"✓ Creating database: {dbname}")
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(dbname)))
            print(f"✓ Database '{dbname}' created successfully")
        else:
            print(f"✓ Database '{dbname}' already exists")
        
        cursor.close()
        conn.close()
        return True
    
    except Exception as e:
        print(f"✗ Error creating database: {e}")
        return False


def run_migrations(dbname="aros", user="postgres", password="test123", host="localhost"):
    """Run SQL migrations to create schema"""
    
    try:
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host
        )
        cursor = conn.cursor()
        
        # Read schema file with UTF-8 encoding
        schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        print("✓ Running migrations...")
        cursor.execute(schema_sql)
        conn.commit()
        
        # Verify tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"\n✓ Schema created successfully. Tables created:")
        for table in tables:
            print(f"  - {table}")
        
        cursor.close()
        conn.close()
        return True
    
    except Exception as e:
        print(f"✗ Error running migrations: {e}")
        return False


def verify_schema(dbname="aros", user="postgres", password="test123", host="localhost"):
    """Verify schema integrity"""
    
    try:
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host
        )
        cursor = conn.cursor()
        
        required_tables = [
            'decisions',
            'decision_audit_log',
            'strategy_performance_log',
            'baseline_calibration',
            'signal_history',
            'execution_events',
            'system_health'
        ]
        
        print("\n✓ Verifying schema...")
        for table in required_tables:
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = '{table}'
                )
            """)
            exists = cursor.fetchone()[0]
            status = "✓" if exists else "✗"
            print(f"  {status} {table}")
        
        cursor.close()
        conn.close()
        return True
    
    except Exception as e:
        print(f"✗ Error verifying schema: {e}")
        return False


def main():
    """Full initialization process"""
    
    print("\n" + "="*70)
    print(" AROS DATABASE INITIALIZATION")
    print("="*70 + "\n")
    
    dbname = "aros"
    user = "postgres"
    password = "test123"
    host = "localhost"
    
    # Step 1: Create database
    if not create_database(dbname, user, password, host):
        print("✗ Failed to create database")
        return False
    
    # Step 2: Run migrations
    if not run_migrations(dbname, user, password, host):
        print("✗ Failed to run migrations")
        return False
    
    # Step 3: Verify schema
    if not verify_schema(dbname, user, password, host):
        print("✗ Failed to verify schema")
        return False
    
    print("\n" + "="*70)
    print(" ✓ DATABASE INITIALIZATION COMPLETE")
    print("="*70 + "\n")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
