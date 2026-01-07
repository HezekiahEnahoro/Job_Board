import requests
import json

API = "https://job-board-iqkz.onrender.com"

def test_health():
    """Test basic health"""
    r = requests.get(f"{API}/health")
    print(f"✅ Health: {r.json()}")

def test_jobs():
    """Test job listings"""
    r = requests.get(f"{API}/jobs?limit=5")
    jobs = r.json()
    print(f"✅ Jobs found: {len(jobs)}")
    if jobs:
        print(f"   Latest: {jobs[0]['title']} at {jobs[0]['company']}")

def test_auth(email, password):
    """Test authentication"""
    r = requests.post(f"{API}/auth/login", json={
        "email": email,
        "password": password
    })
    if r.ok:
        token = r.json()['access_token']
        print(f"✅ Auth: Login successful")
        return token
    else:
        print(f"❌ Auth: {r.text}")
        return None

def test_user(token):
    """Test user endpoint"""
    r = requests.get(f"{API}/auth/me", 
        headers={"Authorization": f"Bearer {token}"})
    user = r.json()
    print(f"✅ User: {user['email']}")
    print(f"   Pro status: {user.get('is_pro', False)}")
    return user

def test_applications(token):
    """Test applications"""
    r = requests.get(f"{API}/applications/", 
        headers={"Authorization": f"Bearer {token}"})
    apps = r.json()
    print(f"✅ Applications: {len(apps)} tracked")

def test_stats(token):
    """Test analytics"""
    r = requests.get(f"{API}/applications/stats", 
        headers={"Authorization": f"Bearer {token}"})
    stats = r.json()
    print(f"✅ Stats: {stats}")

if __name__ == "__main__":
    print("🧪 Testing JobFlow Production...\n")
    
    # Test public endpoints
    test_health()
    test_jobs()
    
    # Test authenticated endpoints
    email = input("\nEnter your email: ")
    password = input("Enter your password: ")
    
    token = test_auth(email, password)
    if token:
        test_user(token)
        test_applications(token)
        test_stats(token)
        
    print("\n🎉 All tests complete!")