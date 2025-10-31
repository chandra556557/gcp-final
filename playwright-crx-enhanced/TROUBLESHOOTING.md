# 🛠️ Troubleshooting Guide

## Frontend Not Loading Issue

If you're unable to create the project or the frontend screen is not loading properly, follow these steps:

### 1. Check Port Configuration
- **Backend**: Should be running on port 3001
- **Frontend**: Should be configured to connect to port 3001
- **Verify**: Check that both backend and frontend are using the same port

### 2. Start Backend Server
```bash
cd playwright-crx-enhanced/backend
npm install
npm run dev
```
- Verify server starts on port 3001
- Check console for any errors

### 3. Start Frontend Development Server
```bash
cd playwright-crx-enhanced/frontend
npm install
npm run dev
```
- Verify frontend starts on port 3001 (or 5173 if using Vite's default)
- Check browser console for any errors

### 4. Check Database Connection
```bash
cd playwright-crx-enhanced/backend
npx prisma db push
npx prisma generate
npx prisma studio
```
- Verify database connection is working
- Check that all tables are created

### 5. Common Issues and Solutions

#### Issue: CORS Errors
- **Symptom**: "Not allowed by CORS" error in browser console
- **Solution**: Verify ALLOWED_ORIGINS includes your frontend URL
- **Check**: `playwright-crx-enhanced/backend/.env` file

#### Issue: API Connection Failed
- **Symptom**: "Network Error" or "ERR_CONNECTION_REFUSED"
- **Solution**: 
  1. Ensure backend is running
  2. Check port conflicts (no other service using port 3001)
  3. Verify firewall settings

#### Issue: Database Connection Failed
- **Symptom**: Database connection errors in backend console
- **Solution**:
  1. Check PostgreSQL is running
  2. Verify DATABASE_URL in backend/.env
  3. Run database migrations: `npx prisma db push`

#### Issue: Frontend Build Errors
- **Symptom**: TypeScript compilation errors
- **Solution**:
  1. Check for missing dependencies: `npm install`
  2. Clear node_modules: `rm -rf node_modules && npm install`
  3. Check TypeScript version: `npx tsc --version`

### 6. Verification Steps

1. **Backend Health Check**:
   ```bash
   curl http://localhost:3001/health
   ```
   Expected response: `{"status":"ok","timestamp":"..."}`

2. **Frontend API Test**:
   - Open browser to `http://localhost:3001`
   - Check browser console for API calls
   - Verify login functionality works

3. **End-to-End Test**:
   - Register a new user
   - Create a test script
   - Execute a test run
   - Verify all components work together

### 7. Getting Help

If you continue to experience issues:

1. **Check Logs**:
   - Backend logs: `playwright-crx-enhanced/backend/logs/`
   - Frontend browser console (F12)

2. **Clean Installation**:
   ```bash
   # Remove all node_modules and reinstall
   rm -rf playwright-crx-enhanced/frontend/node_modules
   rm -rf playwright-crx-enhanced/backend/node_modules
   npm install
   ```

3. **Reset Database**:
   ```bash
   cd playwright-crx-enhanced/backend
   npx prisma migrate reset
   npx prisma db push
   ```

### 8. Quick Start Commands

```bash
# Terminal 1: Backend
cd playwright-crx-enhanced/backend
npm run dev

# Terminal 2: Frontend (new terminal)
cd playwright-crx-enhanced/frontend
npm run dev
```

### 9. Port Configuration Summary

- **Backend Port**: 3001 (configured in backend/src/index.ts)
- **Frontend Port**: 5173 (configured in frontend/vite.config.ts)
- **API URL**: http://localhost:3001/api
- **Database**: PostgreSQL on default port 5432

All configuration files have been updated to use port 3001 consistently.