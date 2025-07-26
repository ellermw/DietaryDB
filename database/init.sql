-- Create database schema for Dietary Management System
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS meal_type CASCADE;
DROP TYPE IF EXISTS diet_type CASCADE;

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('Admin', 'User', 'Kitchen', 'Nurse');
CREATE TYPE meal_type AS ENUM ('Breakfast', 'Lunch', 'Dinner');
CREATE TYPE diet_type AS ENUM ('Regular', 'ADA', 'Puree', 'Mechanical Soft', 'Cardiac', 'Renal', 'Low Sodium');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'User',
    is_active BOOLEAN DEFAULT true,
    must_change_password BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create items table
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

-- Create patient_info table
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

-- Create audit_log table
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

-- Create meal_orders table
CREATE TABLE IF NOT EXISTS meal_orders (
    order_id SERIAL PRIMARY KEY,
    patient_id INTEGER,
    meal VARCHAR(20),
    order_date DATE,
    created_by VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, full_name, role, is_active)
VALUES ('admin', '$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS', 'System Administrator', 'Admin', true)
ON CONFLICT (username) DO NOTHING;

-- Insert default categories
INSERT INTO categories (category_name, description, sort_order) VALUES
('Entrees', 'Main course items', 1),
('Sides', 'Side dishes', 2),
('Beverages', 'Drink options', 3),
('Desserts', 'Dessert items', 4)
ON CONFLICT (category_name) DO NOTHING;

-- Insert sample items
INSERT INTO items (name, category, description, is_ada_friendly) VALUES
('Baked Chicken', 'Entrees', 'Seasoned baked chicken breast', false),
('Grilled Salmon', 'Entrees', 'Fresh grilled salmon fillet', false),
('Mashed Potatoes', 'Sides', 'Creamy mashed potatoes', true),
('Green Beans', 'Sides', 'Steamed green beans', true),
('Coffee', 'Beverages', 'Regular coffee', true),
('Tea', 'Beverages', 'Hot tea', true),
('Chocolate Pudding', 'Desserts', 'Creamy chocolate pudding', true),
('Vanilla Ice Cream', 'Desserts', 'Classic vanilla ice cream', true);

-- Insert sample patients
INSERT INTO patient_info (patient_first_name, patient_last_name, wing, room_number, diet_type, ada_diet) VALUES
('John', 'Doe', 'A', '101', 'Regular', false),
('Jane', 'Smith', 'A', '102', 'ADA', true),
('Robert', 'Johnson', 'B', '201', 'Cardiac', false);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dietary_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dietary_user;
