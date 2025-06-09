# Post-Relocation Authentication Troubleshooting Guide

**Issue**: Authentication failures with 401 errors after moving project from `/Users/justin.scott/Desktop/risk-assessment-app` to `/Users/justin.scott/Projects/risk-assessment-app`

**Known Working Credentials**: 
- good@test.com / Password123
- jusscott@gmail.com / Password123

**Error Context**:
- API Gateway: `warn: Service auth-service responded with status 401: POST /login`
- Auth Service: `POST /login 401 3.126 ms - 89`

## 🚀 Quick Start Diagnostic

Run this comprehensive diagnostic first:

```bash
cd /Users/justin.scott/Projects/risk-assessment-app
node troubleshoot-post-relocation-auth.js
```

## 📋 Step-by-Step Troubleshooting Plan

### Phase 1: Infrastructure Verification

#### Step 1: Check Docker Container Status
```bash
# Check if all containers are running
docker-compose ps

# Expected: All services should show "Up" status
# If any are down, restart them:
docker-compose restart [service-name]
```

#### Step 2: Verify Service Health
```bash
# Test each service endpoint
curl -f http://localhost:3000                    # Frontend
curl -f http://localhost:5000/health             # API Gateway
curl -f http://localhost:5001/health             # Auth Service
curl -f http://localhost:5002/api/health         # Questionnaire Service
curl -f http://localhost:5003/api/health         # Payment Service
curl -f http://localhost:5004/health             # Analysis Service
curl -f http://localhost:5005/health             # Report Service
```

**🔍 What to Look For:**
- All services should return HTTP 200
- If any service is unreachable, check Docker logs: `docker-compose logs [service-name]`

### Phase 2: Database Connectivity

#### Step 3: Test Database Connection
```bash
# Check if PostgreSQL is accessible
docker-compose exec postgres pg_isready -U postgres

# Check auth-service database connectivity
curl -f http://localhost:5001/api/debug/db-status
```

**🔍 Expected Results:**
- PostgreSQL should respond "accepting connections"
- Auth service should return database status with user count

#### Step 4: Verify User Data Integrity
```bash
# Check if test users exist and have valid password hashes
curl -f "http://localhost:5001/api/debug/user/good%40test.com"
curl -f "http://localhost:5001/api/debug/user/jusscott%40gmail.com"
```

**🔍 What to Look For:**
- Users should exist in database
- Password hashes should start with `$2b$` (bcrypt format)
- If password hashes are corrupted, run: `node fix-good-test-user.js`

### Phase 3: Authentication Flow Testing

#### Step 5: Test Login Directly
```bash
# Test authentication for both users
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"good@test.com","password":"Password123"}'

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jusscott@gmail.com","password":"Password123"}'
```

**🔍 Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  }
}
```

#### Step 6: Run Comprehensive Test Suite
```bash
# Use existing comprehensive test
node comprehensive-login-e2e-test.js
```

**🔍 Target Success Rate:** 95%+ (11/12 tests should pass)

### Phase 4: Network and Configuration Verification

#### Step 7: Check Docker Network Connectivity
```bash
# Test inter-service connectivity
docker-compose exec api-gateway ping -c 1 auth-service
docker-compose exec auth-service ping -c 1 postgres

# Check Docker networks
docker network ls
```

#### Step 8: Verify Environment Variables
```bash
# Check critical environment variables
docker-compose exec auth-service env | grep -E "(DATABASE_URL|JWT_SECRET|NODE_ENV|PORT)"
docker-compose exec api-gateway env | grep -E "(AUTH_SERVICE_URL|JWT_SECRET|NODE_ENV|PORT)"
```

## 🚨 Common Post-Relocation Issues & Solutions

### Issue 1: Services Not Starting
**Symptoms:** Docker containers exiting or not running
**Solutions:**
```bash
# Full clean restart
docker-compose down --volumes
docker-compose up -d --build

# If that fails, clean Docker completely
docker system prune -af --volumes
docker-compose up -d --build
```

### Issue 2: Database Connection Lost
**Symptoms:** Auth service can't connect to database
**Solutions:**
```bash
# Restart database and dependent services
docker-compose restart postgres auth-service

# Check database initialization
docker-compose exec postgres psql -U postgres -c "\l"
```

### Issue 3: Corrupted User Data
**Symptoms:** Users exist but password validation fails
**Solutions:**
```bash
# Fix corrupted password hashes
node fix-good-test-user.js

# Verify fix worked
node test-login-passwords.js
```

### Issue 4: Service Network Issues
**Symptoms:** Services can't communicate with each other
**Solutions:**
```bash
# Recreate Docker network
docker-compose down
docker-compose up -d

# Check network configuration
docker-compose config
```

### Issue 5: Environment Configuration Issues
**Symptoms:** Missing or incorrect environment variables
**Solutions:**
1. Check `.env` files are in correct location
2. Verify `docker-compose.yml` environment sections
3. Restart services after any config changes

## 🔧 Quick Fix Commands

### Quick Service Restart
```bash
# Restart authentication-related services only
node troubleshoot-post-relocation-auth.js --quick-restart
```

### Emergency Full Reset
```bash
# Complete system reset (use with caution)
docker-compose down --volumes
docker system prune -af --volumes
docker-compose up -d --build

# Wait for services to stabilize
sleep 30

# Test authentication
node comprehensive-login-e2e-test.js
```

### Password Hash Fix
```bash
# If password hashes are corrupted
node fix-good-test-user.js
node test-login-passwords.js
```

## 📊 Success Verification

After following the troubleshooting steps, verify success with:

1. **Service Health Check:**
   ```bash
   node troubleshoot-post-relocation-auth.js
   ```

2. **Authentication Test:**
   ```bash
   node comprehensive-login-e2e-test.js
   ```

3. **Manual Login Test:**
   - Visit http://localhost:3000
   - Login with good@test.com / Password123
   - Should successfully reach dashboard

## 🔍 Diagnostic Data to Collect

If issues persist, collect this diagnostic information:

```bash
# Service status
docker-compose ps > docker-status.txt

# Service logs
docker-compose logs auth-service > auth-service.log
docker-compose logs api-gateway > api-gateway.log

# Network information
docker network ls > docker-networks.txt

# Environment check
docker-compose config > docker-config.txt

# Database status
docker-compose exec postgres pg_isready -U postgres > db-status.txt
```

## 🎯 Most Likely Causes (In Order of Probability)

1. **Docker Container Issues** (60% probability)
   - Services not fully started after relocation
   - Network connectivity between containers lost

2. **Database Connection Issues** (25% probability)
   - PostgreSQL container connectivity problems
   - Database volume mounting issues

3. **Corrupted User Data** (10% probability)
   - bcrypt password hashes corrupted during move
   - Database data inconsistency

4. **Environment Configuration** (5% probability)
   - Missing or incorrect environment variables
   - Docker configuration issues

## 💡 Prevention for Future Moves

1. **Always use the provided diagnostic script after moves**
2. **Verify Docker configuration before starting services**
3. **Run comprehensive authentication tests before declaring success**
4. **Keep backup of working database state**
5. **Document any custom environment configurations**

## 📞 Next Steps if Issues Persist

1. Run full diagnostic: `node troubleshoot-post-relocation-auth.js`
2. Collect diagnostic logs (see section above)
3. Try emergency full reset procedure
4. Check for any custom configurations that may have been missed
5. Consider restoring from a backup if available

---

**Status**: Ready to troubleshoot post-relocation authentication issues
**Created**: June 5, 2025
**Last Updated**: June 5, 2025
