# manual_upgrade.py
import psycopg2
import os

# Your Render database URL
DATABASE_URL = "postgresql://jobflow:ViSuQZXQ3S9KnhaghthqV9ID1Jo5FpJR@dpg-d4shq8s9c44c73emubqg-a.oregon-postgres.render.com/jobflow_kk53?sslmode=require"

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Update user
email = input("Enter user email: ")
cur.execute("""
    UPDATE users 
    SET is_pro = true,
        subscription_status = 'active',
        stripe_customer_id = 'cus_manual_upgrade'
    WHERE email = %s
    RETURNING id, email, is_pro
""", (email,))

result = cur.fetchone()
conn.commit()

if result:
    print(f"✅ User upgraded: {result[1]} - Pro: {result[2]}")
else:
    print("❌ User not found")

cur.close()
conn.close()