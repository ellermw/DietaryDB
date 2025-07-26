# Hospital Dietary Management System - Deployment Guide

This guide covers the migration from SQLite to PostgreSQL and deployment of the new architecture.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Android App   │────▶│   Backend API   │────▶│   PostgreSQL    │
│  (Modified)     │     │   (Node.js)     │     │   Database      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Admin Frontend │
                        │    (React)      │
                        └─────────────────┘
```

## Prerequisites

- Ubuntu Server with Docker and Docker Compose installed
- Python 3.x (for migration script)
- Access to the Android app's SQLite database file
- Network connectivity between Android devices and the server

## Deployment Steps

### 1. Server Setup

1. **Clone or create the project structure:**
```bash
mkdir dietary-system
cd dietary-system

# Create directory structure
mkdir -p backend/routes backend/middleware backend/config
mkdir -p admin-frontend/src/pages admin-frontend/src/components admin-frontend/src/contexts
mkdir -p database
mkdir -p migration
```

2. **Copy all provided files to their respective directories**

3. **Set environment variables:**
```bash
# Create .env file in the root directory
cat > .env << EOF
DB_PASSWORD=DietaryP@ssw0rd2024
JWT_SECRET=$(openssl rand -base64 32)
BACKUP_DIR=/backups
NODE_ENV=production
EOF
```

### 2. Database Migration

1. **Extract SQLite database from Android device:**
```bash
# Using ADB (Android Debug Bridge)
adb pull /data/data/com.hospital.dietary/databases/HospitalDietaryDB ./migration/
```

2. **Install Python dependencies:**
```bash
pip install psycopg2-binary
```

3. **Start PostgreSQL container:**
```bash
docker-compose up -d postgres
# Wait for database to initialize
sleep 10
```

4. **Run migration script:**
```bash
cd migration
python migrate-sqlite-to-postgres.py HospitalDietaryDB
```

### 3. Deploy Backend and Frontend

1. **Build and start all services:**
```bash
docker-compose up -d
```

2. **Verify services are running:**
```bash
docker-compose ps
```

Expected output:
```
Name                Command               State                    Ports
----------------------------------------------------------------------------------
dietary_postgres   docker-entrypoint.sh postgres   Up      0.0.0.0:5432->5432/tcp
dietary_api        node server.js                  Up      0.0.0.0:3000->3000/tcp
dietary_admin      nginx -g daemon off;            Up      0.0.0.0:3001->80/tcp
```

### 4. Configure Android App

1. **Update Android app on each device:**
   - Open the app
   - It will redirect to Settings
   - Enter server IP address and port (3000)
   - Test connection
   - Save settings

2. **Login with migrated credentials:**
   - All users will need to change their passwords on first login
   - Default admin credentials: username: `admin`, password: `admin123`

## Configuration

### Network Configuration

Ensure the following ports are open on your Ubuntu server:
- **3000**: Backend API
- **3001**: Admin Frontend
- **5432**: PostgreSQL (only if external access needed)

```bash
# Ubuntu firewall configuration
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
```

### SSL/HTTPS Configuration (Optional)

For production deployment, use a reverse proxy like Nginx:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Admin Frontend Access

1. Open web browser and navigate to: `http://SERVER_IP:3001`
2. Login with admin credentials
3. Available features:
   - Dashboard with statistics
   - Patient management
   - Food item management
   - Order management
   - Default menu configuration
   - User management (Admin only)
   - Database backup/restore (Admin only)
   - Audit logs (Admin only)

## Backup and Restore

### Automatic Backups

Create a cron job for automatic backups:

```bash
# Create backup script
cat > /usr/local/bin/dietary-backup.sh << 'EOF'
#!/bin/bash
docker exec dietary_postgres pg_dump -U dietary_user dietary_db > /backups/dietary_backup_$(date +%Y%m%d_%H%M%S).sql
# Keep only last 30 days of backups
find /backups -name "dietary_backup_*.sql" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/dietary-backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/dietary-backup.sh") | crontab -
```

### Manual Backup/Restore

**Via Admin UI:**
1. Login to admin frontend
2. Navigate to Backup & Restore
3. Click "Create Backup" or upload/select backup to restore

**Via Command Line:**
```bash
# Backup
docker exec dietary_postgres pg_dump -U dietary_user dietary_db > backup.sql

# Restore
docker exec -i dietary_postgres psql -U dietary_user dietary_db < backup.sql
```

## Monitoring

### Check Service Logs

```bash
# API logs
docker-compose logs -f api

# Database logs
docker-compose logs -f postgres

# Admin frontend logs
docker-compose logs -f admin
```

### Health Checks

- API Health: `http://SERVER_IP:3000/health`
- Admin Health: `http://SERVER_IP:3001/health`
- System Info: `http://SERVER_IP:3000/api/system/info`

## Troubleshooting

### Android App Cannot Connect

1. **Check network connectivity:**
```bash
# From Android device, ensure you can ping the server
ping SERVER_IP
```

2. **Verify API is accessible:**
```bash
curl http://SERVER_IP:3000/api/system/info
```

3. **Check firewall rules:**
```bash
sudo ufw status
```

### Database Connection Issues

1. **Check PostgreSQL is running:**
```bash
docker-compose ps postgres
docker-compose logs postgres
```

2. **Test database connection:**
```bash
docker exec -it dietary_postgres psql -U dietary_user -d dietary_db -c "SELECT 1;"
```

### Performance Optimization

1. **Database indexes are automatically created**

2. **For large deployments, tune PostgreSQL:**
```yaml
# In docker-compose.yml, add:
postgres:
  command: 
    - "postgres"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "max_connections=200"
```

## Security Considerations

1. **Change default passwords immediately**
2. **Use HTTPS in production**
3. **Regularly update Docker images**
4. **Enable database encryption at rest**
5. **Implement network segmentation**
6. **Regular security audits via audit logs**

## Maintenance

### Update Containers

```bash
docker-compose pull
docker-compose up -d
```

### Database Maintenance

```bash
# Vacuum and analyze database
docker exec dietary_postgres psql -U dietary_user -d dietary_db -c "VACUUM ANALYZE;"
```

### Disk Space Management

```bash
# Check disk usage
df -h
docker system df

# Clean up old containers and images
docker system prune -a
```

## Support

For issues or questions:
1. Check application logs
2. Review audit logs in admin panel
3. Verify all services are running
4. Ensure network connectivity
5. Check database integrity

## API Documentation

Access API documentation at: `http://SERVER_IP:3000/api/docs`

Key endpoints:
- Authentication: `/api/auth/login`
- Patients: `/api/patients`
- Items: `/api/items`
- Orders: `/api/orders`
- Menus: `/api/menus`
- Admin functions: `/api/admin/*`
