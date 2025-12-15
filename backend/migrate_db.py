import psycopg2
import os

# PASTE YOUR DATABASE URL HERE (from Render Dashboard → Database → Connect)
DATABASE_URL = "postgresql://YOUR_URL_HERE?sslmode=require"

try:
    print("🔌 Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    print("✅ Connected!")
    
    # Check if is_pro exists
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='is_pro'
    """)
    
    result = cur.fetchone()
    
    if result:
        print("✅ is_pro column already exists!")
    else:
        print("➕ Adding missing columns...")
        
        # Add columns
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP")
        
        conn.commit()
        print("✅ Columns added!")
    
    # Show all columns
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name='users'
        ORDER BY ordinal_position
    """)
    
    print("\n📋 Users table columns:")
    for row in cur.fetchall():
        print(f"  ✓ {row[0]}: {row[1]}")
    
    cur.close()
    conn.close()
    print("\n🎉 Done!")
    
except Exception as e:
    print(f"❌ Error: {e}")