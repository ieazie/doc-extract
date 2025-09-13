#!/usr/bin/env python3
"""
Permission System Test Script
Tests the enhanced permission system with tenant scoping
"""

import requests
import json
from uuid import UUID

# Configuration
BASE_URL = "http://localhost:8000"
TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001"

def login_user(email, password):
    """Login and get access token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    
    if response.status_code == 200:
        data = response.json()
        return data["access_token"], data["user"]
    else:
        print(f"Login failed for {email}: {response.text}")
        return None, None

def test_permissions():
    """Test permission system with different roles"""
    
    print("🔐 Testing Permission System")
    print("=" * 50)
    
    # Test with tenant admin
    print("\n1. Testing Tenant Admin Permissions:")
    token, user = login_user("admin@docextract.com", "admin123")
    
    if token:
        print(f"   User: {user['email']}")
        print(f"   Role: {user['role']}")
        print(f"   Tenant: {user['tenant_id']}")
        
        # Test documents access (should work)
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/documents", headers=headers)
        print(f"   Documents access: {response.status_code} {'✅' if response.status_code == 200 else '❌'}")
        
        # Test users access (should work for tenant admin)
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        print(f"   Users access: {response.status_code} {'✅' if response.status_code == 200 else '❌'}")
    
    # Test with regular user
    print("\n2. Testing Regular User Permissions:")
    token, user = login_user("user@docextract.com", "admin123")
    
    if token:
        print(f"   User: {user['email']}")
        print(f"   Role: {user['role']}")
        print(f"   Tenant: {user['tenant_id']}")
        
        # Test documents access (should work)
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/documents", headers=headers)
        print(f"   Documents access: {response.status_code} {'✅' if response.status_code == 200 else '❌'}")
        
        # Test users access (should fail for regular user)
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        print(f"   Users access: {response.status_code} {'✅' if response.status_code == 200 else '❌ (Expected for user role)'}")
    
    print("\n✅ Permission testing complete!")

if __name__ == "__main__":
    test_permissions()
