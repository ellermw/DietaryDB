# DietaryDB Project Structure

## Active Directories
- `/admin-frontend/` - React frontend application
  - `/src/` - Source files
    - `/components/` - Reusable components
    - `/contexts/` - React contexts (Auth)
    - `/pages/` - Page components
    - `/utils/` - Utilities (axios config)
  - `/public/` - Static assets

- `/backend/` - Node.js Express backend
  - `/config/` - Configuration files (database.js)
  - `/middleware/` - Express middleware (auth, activity tracker)
  - `/routes/` - API routes
    - `auth.js` - Authentication endpoints
    - `categories.js` - Category management
    - `dashboard.js` - Dashboard statistics
    - `items.js` - Food items management
    - `tasks.js` - System tasks and backups
    - `users.js` - User management

- `/backups/` - Database backup storage
  - `/databases/` - SQL backup files

## Configuration Files
- `docker-compose.yml` - Docker services configuration
- `.env` files - Environment variables

## Scripts
- `cleanup-dead-code.sh` - This cleanup script
- `verify-fixes.sh` - Verification script

## Docker Containers
1. `dietary_postgres` - PostgreSQL database
2. `dietary_backend` - Node.js API server
3. `dietary_admin` - Nginx serving React app
