# DietaryDB
Web front and database remote hosting for Dietary Menu System
=======
# Hospital Dietary Management Server

Backend infrastructure for the Hospital Dietary Management System, providing REST API, database, and admin interface for the Android application.

## 🏥 Overview

This repository contains the server-side components that power the Hospital Dietary Management Android app, enabling:
- Multi-user access with role-based permissions
- Centralized patient and menu data management  
- Real-time order processing
- Administrative web interface
- Automated backup and restore capabilities

## 🚀 Features

- **RESTful API**: Secure endpoints for Android app communication
- **PostgreSQL Database**: Robust data storage with full ACID compliance
- **Admin Dashboard**: Web-based management interface
- **Role-Based Access**: Admin, Kitchen, Nurse, and User roles
- **Automated Backups**: Scheduled database backups with easy restore
- **Audit Logging**: Complete activity tracking for compliance
- **Docker Deployment**: Single command deployment with docker-compose

## 📋 Prerequisites

- Ubuntu Server 20.04+ (or any Linux distribution with Docker)
- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum (4GB recommended)
- 20GB disk space
- Python 3.x (for migration scripts)

## 🛠️ Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/DietaryDB.git
   cd DietaryDB
   ```

2. **Run the setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Access the services**
   - API: `http://YOUR_SERVER_IP:3000`
   - Admin Panel: `http://YOUR_SERVER_IP:3001`
   - Default admin credentials: `admin` / `admin123` (change immediately!)

4. **Configure Android apps**
   - Open the Android app
   - Go to Settings
   - Enter server IP and port 3000
   - Test connection and save

## 📁 Project Structure

```
.
├── backend/              # Node.js Express API
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth & validation
│   └── config/          # Database configuration
├── admin-frontend/       # React admin interface
│   ├── src/
│   │   ├── pages/      # Admin pages
│   │   ├── components/ # Reusable components
│   │   └── contexts/   # React contexts
│   └── public/         # Static assets
├── database/            # PostgreSQL schemas
│   └── init.sql        # Database initialization
├── migration/           # Data migration tools
├── docker-compose.yml   # Container orchestration
├── setup.sh            # Automated setup script
└── monitor.sh          # Health monitoring script
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file (see `.env.example`):

```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=dietary_db
DB_USER=dietary_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

### Ports

- `3000`: Backend API
- `3001`: Admin Frontend  
- `5432`: PostgreSQL (internal)

## 📊 Database Schema

The system uses PostgreSQL with the following main tables:
- `users`: System users with role-based access
- `patient_info`: Patient dietary information
- `items`: Food items catalog
- `meal_orders`: Daily meal orders
- `default_menu`: Template menus by diet type
- `audit_log`: System activity tracking

## 🔐 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- CORS protection
- SQL injection prevention
- Audit logging for compliance

## 🔄 Migration from SQLite

If migrating from the Android app's local SQLite database:

```bash
# Extract SQLite database from Android device
adb pull /data/data/com.hospital.dietary/databases/HospitalDietaryDB

# Run migration script
python3 migration/migrate-sqlite-to-postgres.py HospitalDietaryDB
```

## 📦 Backup & Restore

### Automated Backups
```bash
# Set up daily backups at 2 AM
crontab -e
# Add: 0 2 * * * cd /path/to/DietaryDB && docker exec dietary_postgres pg_dump -U dietary_user dietary_db > backups/backup_$(date +\%Y\%m\%d).sql
```

### Manual Backup/Restore
```bash
# Backup
docker exec dietary_postgres pg_dump -U dietary_user dietary_db > backup.sql

# Restore
docker exec -i dietary_postgres psql -U dietary_user dietary_db < backup.sql
```

## 🩺 Monitoring

Check system health:
```bash
./monitor.sh
```

View logs:
```bash
docker-compose logs -f
```

## 🚀 Production Deployment

1. **Use HTTPS**: Set up SSL with Let's Encrypt
2. **Configure Firewall**: Only allow necessary ports
3. **Change Default Passwords**: Update all default credentials
4. **Enable Backups**: Set up automated backup schedule
5. **Monitor Resources**: Use monitoring tools like Prometheus

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is proprietary software for hospital use. All rights reserved.

## 🔗 Related Projects

- [Android App Repository](https://github.com/YOUR_USERNAME/DietaryMenu)

## 📞 Support

For issues or questions:
1. Check the [deployment guide](DEPLOYMENT.md)
2. Review logs with `docker-compose logs`
3. Open an issue on GitHub

---

Built with ❤️ for healthcare
>>>>>>> d107cd5 (Initial Commit: DMS Database  Server)
