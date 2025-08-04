-- DietaryDB Fresh Database Schema

-- Create users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'User')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create items table
CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_ada_friendly BOOLEAN DEFAULT false,
    fluid_ml INTEGER,
    sodium_mg INTEGER,
    carbs_g DECIMAL(6,2),
    calories INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_active ON items(is_active);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, first_name, last_name, role) VALUES 
('admin', '$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS', 'System', 'Administrator', 'Admin');

-- Insert default categories
INSERT INTO categories (category_name) VALUES
('Breakfast'),
('Lunch'),
('Dinner'),
('Beverages'),
('Snacks'),
('Desserts'),
('Sides'),
('Condiments');

-- Insert sample items
INSERT INTO items (name, category, is_ada_friendly, fluid_ml, sodium_mg, carbs_g, calories) VALUES
('Scrambled Eggs', 'Breakfast', false, NULL, 180, 2, 140),
('Oatmeal', 'Breakfast', true, 240, 140, 27, 150),
('Orange Juice', 'Beverages', true, 240, 2, 26, 110),
('Grilled Chicken', 'Lunch', false, NULL, 440, 0, 165),
('Garden Salad', 'Lunch', true, NULL, 140, 10, 35),
('Apple', 'Snacks', true, NULL, 2, 25, 95);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dietary_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dietary_user;
