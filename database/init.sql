-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'User' CHECK (role IN ('Admin', 'Kitchen', 'Nurse', 'User')),
    is_active BOOLEAN DEFAULT true,
    must_change_password BOOLEAN DEFAULT false,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_info (
    patient_id SERIAL PRIMARY KEY,
    patient_first_name VARCHAR(50) NOT NULL,
    patient_last_name VARCHAR(50) NOT NULL,
    wing VARCHAR(10) NOT NULL,
    room_number VARCHAR(10) NOT NULL,
    diet_type VARCHAR(50) NOT NULL,
    ada_diet BOOLEAN DEFAULT false,
    food_allergies TEXT,
    fluid_restriction BOOLEAN DEFAULT false,
    fluid_restriction_amount INTEGER,
    texture_modification VARCHAR(50),
    discharged BOOLEAN DEFAULT false,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    is_ada_friendly BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_orders (
    order_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient_info(patient_id),
    meal VARCHAR(20) NOT NULL CHECK (meal IN ('Breakfast', 'Lunch', 'Dinner')),
    order_date DATE NOT NULL,
    is_complete BOOLEAN DEFAULT false,
    created_by VARCHAR(50),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES meal_orders(order_id),
    item_id INTEGER REFERENCES items(item_id),
    quantity INTEGER DEFAULT 1,
    special_instructions TEXT
);

CREATE TABLE IF NOT EXISTS default_menu (
    menu_id SERIAL PRIMARY KEY,
    diet_type VARCHAR(50),
    meal_type VARCHAR(20),
    day_of_week VARCHAR(10),
    item_name VARCHAR(100),
    item_category VARCHAR(50),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS finalized_order (
    order_id SERIAL PRIMARY KEY,
    patient_name VARCHAR(100),
    wing VARCHAR(10),
    room VARCHAR(10),
    order_date DATE,
    diet_type VARCHAR(50),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finalized_order_items (
    item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES finalized_order(order_id),
    meal_type VARCHAR(20),
    item_name VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    category VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS audit_log (
    audit_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(50),
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_patient_wing_room ON patient_info(wing, room_number);
CREATE INDEX idx_patient_diet_type ON patient_info(diet_type);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_meal_orders_date ON meal_orders(order_date);
CREATE INDEX idx_meal_orders_patient ON meal_orders(patient_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_date ON audit_log(created_date);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, full_name, role) VALUES 
('admin', '$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS', 'System Administrator', 'Admin')
ON CONFLICT (username) DO NOTHING;

-- Insert default categories
INSERT INTO categories (category_name, description, sort_order) VALUES
('Breakfast Entrees', 'Main breakfast items', 1),
('Lunch Entrees', 'Main lunch items', 2),
('Dinner Entrees', 'Main dinner items', 3),
('Beverages', 'Drink options', 4),
('Breads', 'Bread and grain items', 5),
('Condiments', 'Sauces and condiments', 6),
('Desserts', 'Dessert items', 7),
('Fruits', 'Fresh and prepared fruits', 8),
('Vegetables', 'Fresh and prepared vegetables', 9),
('Soups', 'Soup options', 10),
('Salads', 'Salad options', 11),
('Snacks', 'Snack items', 12)
ON CONFLICT (category_name) DO NOTHING;

-- Insert sample food items
INSERT INTO items (name, category, description, is_ada_friendly) VALUES
-- Breakfast items
('Scrambled Eggs', 'Breakfast Entrees', 'Fresh scrambled eggs', false),
('Oatmeal', 'Breakfast Entrees', 'Hot oatmeal with toppings', true),
('Pancakes', 'Breakfast Entrees', 'Fluffy pancakes with syrup', false),
('French Toast', 'Breakfast Entrees', 'Classic French toast', false),
-- Lunch items
('Grilled Chicken Breast', 'Lunch Entrees', 'Seasoned grilled chicken', false),
('Baked Fish', 'Lunch Entrees', 'Herb-crusted baked fish', false),
('Vegetable Lasagna', 'Lunch Entrees', 'Hearty vegetable lasagna', false),
-- Dinner items
('Roast Beef', 'Dinner Entrees', 'Tender roast beef with gravy', false),
('Baked Salmon', 'Dinner Entrees', 'Lemon pepper baked salmon', false),
('Pasta Primavera', 'Dinner Entrees', 'Pasta with fresh vegetables', false),
-- Beverages
('Coffee', 'Beverages', 'Regular coffee', true),
('Decaf Coffee', 'Beverages', 'Decaffeinated coffee', true),
('Tea', 'Beverages', 'Hot tea', true),
('Orange Juice', 'Beverages', 'Fresh orange juice', true),
('Apple Juice', 'Beverages', 'Fresh apple juice', true),
('Milk', 'Beverages', 'Whole milk', true),
('Skim Milk', 'Beverages', 'Fat-free milk', true),
-- Sides and others
('White Rice', 'Vegetables', 'Steamed white rice', true),
('Brown Rice', 'Vegetables', 'Steamed brown rice', true),
('Mashed Potatoes', 'Vegetables', 'Creamy mashed potatoes', true),
('Green Beans', 'Vegetables', 'Steamed green beans', true),
('Carrots', 'Vegetables', 'Glazed carrots', true),
('Wheat Bread', 'Breads', 'Whole wheat bread', true),
('White Bread', 'Breads', 'White bread', true),
('Vanilla Pudding', 'Desserts', 'Creamy vanilla pudding', true),
('Chocolate Pudding', 'Desserts', 'Rich chocolate pudding', true)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dietary_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dietary_user;