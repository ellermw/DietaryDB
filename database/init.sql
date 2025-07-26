-- Create database schema for Dietary Management System
-- This script initializes the PostgreSQL database with all required tables and initial data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for better data integrity
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

-- Create patient_info table
CREATE TABLE IF NOT EXISTS patient_info (
    patient_id SERIAL PRIMARY KEY,
    patient_first_name VARCHAR(50),
    patient_last_name VARCHAR(50),
    wing VARCHAR(10),
    room_number VARCHAR(10),
    diet_type VARCHAR(50),
    diet VARCHAR(100),
    ada_diet BOOLEAN DEFAULT false,
    fluid_restriction VARCHAR(50),
    texture_modifications TEXT,
    mechanical_chopped BOOLEAN DEFAULT false,
    mechanical_ground BOOLEAN DEFAULT false,
    bite_size BOOLEAN DEFAULT false,
    bread_ok BOOLEAN DEFAULT true,
    nectar_thick BOOLEAN DEFAULT false,
    pudding_thick BOOLEAN DEFAULT false,
    honey_thick BOOLEAN DEFAULT false,
    extra_gravy BOOLEAN DEFAULT false,
    meats_only BOOLEAN DEFAULT false,
    is_puree BOOLEAN DEFAULT false,
    allergies TEXT,
    likes TEXT,
    dislikes TEXT,
    comments TEXT,
    preferred_drink VARCHAR(100),
    drink_variety VARCHAR(100),
    breakfast_complete BOOLEAN DEFAULT false,
    lunch_complete BOOLEAN DEFAULT false,
    dinner_complete BOOLEAN DEFAULT false,
    breakfast_npo BOOLEAN DEFAULT false,
    lunch_npo BOOLEAN DEFAULT false,
    dinner_npo BOOLEAN DEFAULT false,
    breakfast_items TEXT,
    lunch_items TEXT,
    dinner_items TEXT,
    breakfast_juices TEXT,
    lunch_juices TEXT,
    dinner_juices TEXT,
    breakfast_drinks TEXT,
    lunch_drinks TEXT,
    dinner_drinks TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    order_date DATE,
    breakfast_diet VARCHAR(50),
    lunch_diet VARCHAR(50),
    dinner_diet VARCHAR(50),
    breakfast_ada BOOLEAN DEFAULT false,
    lunch_ada BOOLEAN DEFAULT false,
    dinner_ada BOOLEAN DEFAULT false,
    discharged BOOLEAN DEFAULT false,
    discharged_date TIMESTAMP,
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

-- Create meal_orders table
CREATE TABLE IF NOT EXISTS meal_orders (
    order_id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patient_info(patient_id) ON DELETE CASCADE,
    meal VARCHAR(20),
    order_date DATE,
    is_complete BOOLEAN DEFAULT false,
    created_by VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES meal_orders(order_id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(item_id),
    quantity INTEGER DEFAULT 1,
    special_instructions TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create default_menu table
CREATE TABLE IF NOT EXISTS default_menu (
    menu_id SERIAL PRIMARY KEY,
    diet_type VARCHAR(50),
    meal_type VARCHAR(20),
    day_of_week VARCHAR(10),
    item_name VARCHAR(100),
    item_category VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create finalized_order table
CREATE TABLE IF NOT EXISTS finalized_order (
    order_id SERIAL PRIMARY KEY,
    patient_name VARCHAR(100),
    wing VARCHAR(10),
    room VARCHAR(10),
    order_date DATE,
    diet_type VARCHAR(50),
    meal_type VARCHAR(20),
    items TEXT,
    created_by VARCHAR(50),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_log table for tracking changes
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

-- Create indexes for better performance
CREATE INDEX idx_patient_wing_room ON patient_info(wing, room_number);
CREATE INDEX idx_patient_diet_type ON patient_info(diet_type);
CREATE INDEX idx_patient_discharged ON patient_info(discharged);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_ada ON items(is_ada_friendly);
CREATE INDEX idx_meal_orders_patient ON meal_orders(patient_id);
CREATE INDEX idx_meal_orders_date ON meal_orders(order_date);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_default_menu_config ON default_menu(diet_type, meal_type, day_of_week);
CREATE INDEX idx_finalized_order_date ON finalized_order(order_date);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, full_name, role, is_active, must_change_password)
VALUES ('admin', '$2b$10$YqVb5I2WMhPMkqUQqLMlH.oZxQ2W9Y0vBhzBqK2.vKQRxMqD0B4mS', 'System Administrator', 'Admin', true, true);

-- Insert default categories
INSERT INTO categories (category_name, description, sort_order) VALUES
('Entrees', 'Main course items', 1),
('Sides', 'Side dishes', 2),
('Soups', 'Soup options', 3),
('Salads', 'Salad options', 4),
('Desserts', 'Dessert items', 5),
('Beverages', 'Drink options', 6),
('Condiments', 'Condiments and extras', 7),
('Breakfast Items', 'Breakfast specific items', 8);

-- Insert all food items from the original SQLite database
INSERT INTO items (name, category, description, is_ada_friendly) VALUES
-- Entrees
('Baked Chicken', 'Entrees', 'Seasoned baked chicken breast', false),
('Grilled Salmon', 'Entrees', 'Fresh grilled salmon fillet', false),
('Meatloaf', 'Entrees', 'Traditional homestyle meatloaf', false),
('Turkey Sandwich', 'Entrees', 'Sliced turkey on wheat bread', false),
('Vegetable Lasagna', 'Entrees', 'Layered pasta with vegetables', false),
('Pot Roast', 'Entrees', 'Slow cooked beef pot roast', false),
('Chicken Salad Sandwich', 'Entrees', 'Homemade chicken salad on bread', false),
('Fish Fillet', 'Entrees', 'Breaded white fish fillet', false),
('Spaghetti with Meat Sauce', 'Entrees', 'Pasta with homemade meat sauce', false),
('Grilled Chicken Breast', 'Entrees', 'Plain grilled chicken breast', true),
('Baked Fish', 'Entrees', 'Herb seasoned baked fish', true),
('Turkey Burger', 'Entrees', 'Lean ground turkey patty', true),

-- Sides
('Mashed Potatoes', 'Sides', 'Creamy whipped potatoes', false),
('Green Beans', 'Sides', 'Steamed fresh green beans', true),
('Rice Pilaf', 'Sides', 'Seasoned rice blend', false),
('Steamed Broccoli', 'Sides', 'Fresh steamed broccoli', true),
('Corn', 'Sides', 'Sweet corn kernels', true),
('Carrots', 'Sides', 'Glazed baby carrots', true),
('Baked Potato', 'Sides', 'Plain baked potato', true),
('Sweet Potato', 'Sides', 'Baked sweet potato', true),
('Mixed Vegetables', 'Sides', 'Seasonal vegetable medley', true),
('Cole Slaw', 'Sides', 'Creamy cabbage slaw', false),
('French Fries', 'Sides', 'Crispy golden fries', false),
('Macaroni and Cheese', 'Sides', 'Creamy mac and cheese', false),

-- Soups
('Chicken Noodle Soup', 'Soups', 'Classic chicken soup with noodles', false),
('Vegetable Soup', 'Soups', 'Hearty vegetable soup', true),
('Tomato Soup', 'Soups', 'Creamy tomato soup', false),
('Beef Barley Soup', 'Soups', 'Beef and barley in broth', false),
('Minestrone Soup', 'Soups', 'Italian vegetable soup', true),
('Cream of Mushroom Soup', 'Soups', 'Rich mushroom cream soup', false),
('Chicken Rice Soup', 'Soups', 'Chicken soup with rice', true),
('Lentil Soup', 'Soups', 'Hearty lentil soup', true),

-- Salads
('Garden Salad', 'Salads', 'Mixed greens with vegetables', true),
('Caesar Salad', 'Salads', 'Romaine with Caesar dressing', false),
('Fruit Salad', 'Salads', 'Fresh seasonal fruit mix', true),
('Potato Salad', 'Salads', 'Traditional potato salad', false),
('Tossed Salad', 'Salads', 'Simple green salad', true),
('Chef Salad', 'Salads', 'Salad with meat and cheese', false),

-- Desserts
('Vanilla Pudding', 'Desserts', 'Smooth vanilla pudding', false),
('Chocolate Pudding', 'Desserts', 'Rich chocolate pudding', false),
('Sugar Free Vanilla Pudding', 'Desserts', 'Diabetic friendly vanilla pudding', true),
('Sugar Free Chocolate Pudding', 'Desserts', 'Diabetic friendly chocolate pudding', true),
('Fresh Fruit Cup', 'Desserts', 'Assorted fresh fruit', true),
('Jello', 'Desserts', 'Assorted flavors', false),
('Sugar Free Jello', 'Desserts', 'Diabetic friendly jello', true),
('Ice Cream', 'Desserts', 'Vanilla ice cream', false),
('Sugar Free Ice Cream', 'Desserts', 'Diabetic friendly ice cream', true),
('Apple Pie', 'Desserts', 'Traditional apple pie slice', false),
('Cookies', 'Desserts', 'Assorted cookies', false),
('Sugar Free Cookies', 'Desserts', 'Diabetic friendly cookies', true),

-- Beverages
('Coffee', 'Beverages', 'Regular or decaf', true),
('Tea', 'Beverages', 'Hot tea selection', true),
('Milk', 'Beverages', 'Whole, 2%, or skim', true),
('Orange Juice', 'Beverages', 'Fresh orange juice', false),
('Apple Juice', 'Beverages', 'Pure apple juice', false),
('Cranberry Juice', 'Beverages', 'Cranberry juice', false),
('Ginger Ale', 'Beverages', 'Caffeine free soda', false),
('Diet Ginger Ale', 'Beverages', 'Sugar free ginger ale', true),
('Water', 'Beverages', 'Bottled water', true),
('Lemonade', 'Beverages', 'Fresh lemonade', false),
('Sugar Free Lemonade', 'Beverages', 'Diabetic friendly lemonade', true),
('Hot Chocolate', 'Beverages', 'Rich hot cocoa', false),
('Sugar Free Hot Chocolate', 'Beverages', 'Diabetic friendly cocoa', true),

-- Condiments
('Butter', 'Condiments', 'Individual butter packets', true),
('Margarine', 'Condiments', 'Individual margarine packets', true),
('Jelly', 'Condiments', 'Assorted jellies', false),
('Sugar Free Jelly', 'Condiments', 'Diabetic friendly jelly', true),
('Peanut Butter', 'Condiments', 'Creamy peanut butter', true),
('Honey', 'Condiments', 'Natural honey', false),
('Sugar', 'Condiments', 'Sugar packets', false),
('Sugar Substitute', 'Condiments', 'Artificial sweetener', true),
('Salt', 'Condiments', 'Salt packets', true),
('Pepper', 'Condiments', 'Pepper packets', true),
('Ketchup', 'Condiments', 'Tomato ketchup', false),
('Mustard', 'Condiments', 'Yellow mustard', true),
('Mayonnaise', 'Condiments', 'Regular mayonnaise', false),
('Low Fat Mayonnaise', 'Condiments', 'Reduced fat mayo', true),
('Salad Dressing', 'Condiments', 'Assorted dressings', false),
('Low Fat Salad Dressing', 'Condiments', 'Reduced fat dressings', true),
('Sour Cream', 'Condiments', 'Regular sour cream', false),
('Low Fat Sour Cream', 'Condiments', 'Reduced fat sour cream', true),

-- Breakfast Items
('Scrambled Eggs', 'Breakfast Items', 'Fluffy scrambled eggs', true),
('Pancakes', 'Breakfast Items', 'Stack of pancakes', false),
('French Toast', 'Breakfast Items', 'Classic French toast', false),
('Oatmeal', 'Breakfast Items', 'Hot oatmeal', true),
('Cold Cereal', 'Breakfast Items', 'Assorted cereals', false),
('Whole Wheat Toast', 'Breakfast Items', 'Toasted wheat bread', true),
('White Toast', 'Breakfast Items', 'Toasted white bread', false),
('English Muffin', 'Breakfast Items', 'Toasted English muffin', false),
('Bacon', 'Breakfast Items', 'Crispy bacon strips', false),
('Turkey Bacon', 'Breakfast Items', 'Lean turkey bacon', true),
('Sausage', 'Breakfast Items', 'Breakfast sausage links', false),
('Turkey Sausage', 'Breakfast Items', 'Lean turkey sausage', true),
('Hard Boiled Egg', 'Breakfast Items', 'Peeled hard boiled egg', true),
('Yogurt', 'Breakfast Items', 'Low fat yogurt', true),
('Cottage Cheese', 'Breakfast Items', 'Low fat cottage cheese', true),
('Fresh Fruit', 'Breakfast Items', 'Seasonal fresh fruit', true),
('Bagel', 'Breakfast Items', 'Plain or everything bagel', false),
('Cream of Wheat', 'Breakfast Items', 'Hot wheat cereal', true),
('Grits', 'Breakfast Items', 'Southern style grits', true),
('Hash Browns', 'Breakfast Items', 'Crispy potato hash browns', false);

-- Create update trigger for updated_date columns
CREATE OR REPLACE FUNCTION update_updated_date_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_date BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_patient_info_updated_date BEFORE UPDATE ON patient_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_items_updated_date BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

CREATE TRIGGER update_meal_orders_updated_date BEFORE UPDATE ON meal_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dietary_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dietary_user;
