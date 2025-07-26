-- Create user and database
CREATE USER dietary_user WITH PASSWORD 'DietarySecurePass2024!';
CREATE DATABASE dietary_db OWNER dietary_user;

-- Connect to the dietary_db
\c dietary_db;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE dietary_db TO dietary_user;
GRANT ALL ON SCHEMA public TO dietary_user;

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'User',
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    is_ada_friendly BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_info (
    patient_id SERIAL PRIMARY KEY,
    patient_first_name VARCHAR(50),
    patient_last_name VARCHAR(50),
    wing VARCHAR(10),
    room_number VARCHAR(10),
    diet_type VARCHAR(50),
    ada_diet BOOLEAN DEFAULT false,
    discharged BOOLEAN DEFAULT false,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_log (
    audit_id SERIAL PRIMARY KEY,
    table_name VARCHAR(50),
    record_id INTEGER,
    action VARCHAR(20),
    changed_by VARCHAR(50),
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    old_values JSONB,
    new_values JSONB
);

-- Set ownership
ALTER TABLE users OWNER TO dietary_user;
ALTER TABLE categories OWNER TO dietary_user;
ALTER TABLE items OWNER TO dietary_user;
ALTER TABLE patient_info OWNER TO dietary_user;
ALTER TABLE audit_log OWNER TO dietary_user;

-- Insert admin user (password: admin123)
INSERT INTO users (username, password, full_name, role) VALUES 
('admin', '$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS', 'Administrator', 'Admin')
ON CONFLICT (username) DO NOTHING;

-- Insert default categories
INSERT INTO categories (category_name, description, sort_order) VALUES
('Entrees', 'Main dishes', 1),
('Sides', 'Side dishes', 2),
('Desserts', 'Dessert options', 3),
('Beverages', 'Drinks', 4)
ON CONFLICT (category_name) DO NOTHING;
