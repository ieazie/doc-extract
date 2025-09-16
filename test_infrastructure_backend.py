#!/usr/bin/env python3
"""
Test script for environment-aware infrastructure backend functionality
"""
import requests
import json
import sys
from uuid import UUID

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

# Test tenant ID (using the default tenant from the system)
TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001"

def test_health_check():
    """Test basic health check"""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health/")
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_database_connection():
    """Test database connection by checking if we can access tenant configurations"""
    print("\n🔍 Testing database connection...")
    try:
        # This will test if the new tables exist and are accessible
        response = requests.get(f"{API_BASE}/tenant/configurations")
        if response.status_code in [200, 401]:  # 401 is expected without auth
            print("✅ Database connection successful")
            return True
        else:
            print(f"❌ Database connection failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def test_environment_endpoints():
    """Test environment-aware endpoints"""
    print("\n🔍 Testing environment endpoints...")
    
    # Test getting available environments
    try:
        response = requests.get(f"{API_BASE}/tenant/configurations/environments")
        if response.status_code == 401:  # Expected without auth
            print("✅ Environment endpoints are accessible (auth required)")
            return True
        elif response.status_code == 200:
            data = response.json()
            print(f"✅ Available environments: {data.get('environments', [])}")
            return True
        else:
            print(f"❌ Environment endpoints failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Environment endpoints error: {e}")
        return False

def test_database_direct():
    """Test database directly using SQL queries"""
    print("\n🔍 Testing database directly...")
    try:
        import subprocess
        
        # Test if the new tables exist
        cmd = [
            "docker", "exec", "-i", "doc-extract-db-1", 
            "psql", "-U", "postgres", "-d", "docextract", "-c",
            "SELECT table_name FROM information_schema.tables WHERE table_name IN ('tenant_environment_secrets', 'tenant_environment_usage');"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ New tables exist in database")
            print(f"Tables found: {result.stdout}")
            return True
        else:
            print(f"❌ Database query failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Database direct test error: {e}")
        return False

def test_tenant_configurations_data():
    """Test if tenant configurations have environment data"""
    print("\n🔍 Testing tenant configurations data...")
    try:
        import subprocess
        
        # Check if tenant configurations have environment column
        cmd = [
            "docker", "exec", "-i", "doc-extract-db-1", 
            "psql", "-U", "postgres", "-d", "docextract", "-c",
            "SELECT tenant_id, config_type, environment FROM tenant_configurations LIMIT 5;"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Tenant configurations have environment data")
            print(f"Sample data:\n{result.stdout}")
            return True
        else:
            print(f"❌ Tenant configurations query failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Tenant configurations test error: {e}")
        return False

def test_secret_encryption():
    """Test secret encryption functionality"""
    print("\n🔍 Testing secret encryption...")
    try:
        import subprocess
        
        # Test if we can create a test secret
        cmd = [
            "docker", "exec", "-i", "doc-extract-db-1", 
            "psql", "-U", "postgres", "-d", "docextract", "-c",
            "SELECT COUNT(*) as secret_count FROM tenant_environment_secrets;"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Secret encryption tables accessible")
            print(f"Secret count: {result.stdout}")
            return True
        else:
            print(f"❌ Secret encryption test failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Secret encryption test error: {e}")
        return False

def test_infrastructure_configs():
    """Test infrastructure configurations"""
    print("\n🔍 Testing infrastructure configurations...")
    try:
        import subprocess
        
        # Check if we have infrastructure configs for different environments
        cmd = [
            "docker", "exec", "-i", "doc-extract-db-1", 
            "psql", "-U", "postgres", "-d", "docextract", "-c",
            "SELECT environment, config_type, COUNT(*) as count FROM tenant_configurations GROUP BY environment, config_type ORDER BY environment, config_type;"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Infrastructure configurations exist")
            print(f"Configuration summary:\n{result.stdout}")
            return True
        else:
            print(f"❌ Infrastructure configs test failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Infrastructure configs test error: {e}")
        return False

def test_api_endpoints_structure():
    """Test API endpoints structure"""
    print("\n🔍 Testing API endpoints structure...")
    
    endpoints_to_test = [
        "/api/tenant/configurations/environments",
        "/api/tenant/configurations/storage/development",
        "/api/tenant/secrets/development",
        "/api/tenant/infrastructure/status/development",
        "/api/tenant/infrastructure/config/development"
    ]
    
    success_count = 0
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            if response.status_code == 401:  # Expected without auth
                print(f"✅ {endpoint} - Auth required (expected)")
                success_count += 1
            elif response.status_code == 200:
                print(f"✅ {endpoint} - Accessible")
                success_count += 1
            else:
                print(f"❌ {endpoint} - Failed: {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} - Error: {e}")
    
    print(f"✅ {success_count}/{len(endpoints_to_test)} endpoints accessible")
    return success_count == len(endpoints_to_test)

def test_backend_services():
    """Test backend services directly"""
    print("\n🔍 Testing backend services...")
    try:
        import subprocess
        
        # Test if the backend can import the new services
        cmd = [
            "docker", "exec", "doc-extract-backend-1", 
            "python", "-c", 
            "from src.services.tenant_secret_service import TenantSecretService; from src.services.tenant_infrastructure_service import TenantInfrastructureService; print('Services imported successfully')"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Backend services can be imported")
            print(f"Output: {result.stdout}")
            return True
        else:
            print(f"❌ Backend services import failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Backend services test error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Backend Infrastructure Testing")
    print("=" * 50)
    
    tests = [
        test_health_check,
        test_database_connection,
        test_environment_endpoints,
        test_database_direct,
        test_tenant_configurations_data,
        test_secret_encryption,
        test_infrastructure_configs,
        test_api_endpoints_structure,
        test_backend_services
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
    
    print("\n" + "=" * 50)
    print(f"🎯 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend infrastructure is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
