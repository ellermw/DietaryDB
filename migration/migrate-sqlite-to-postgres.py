#!/usr/bin/env python3
"""
SQLite to PostgreSQL Migration Script for Hospital Dietary Management System
This script migrates data from the Android app's SQLite database to PostgreSQL
"""

import sqlite3
import psycopg2
import json
import sys
import os
from datetime import datetime
import bcrypt

# Configuration
SQLITE_DB_PATH = "HospitalDietaryDB"  # Path to SQLite database file
POSTGRES_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'dietary_db',
    'user': 'dietary_user',
    'password': 'DietaryP@ssw0rd2024'
}

def connect_sqlite(db_path):
    """Connect to SQLite database"""
    if not os.path.exists(db_path):
        print(f"Error: SQLite database not found at {db_path}")
        sys.exit(1)
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def connect_postgres(config):
    """Connect to PostgreSQL database"""
    try:
        conn = psycopg2.connect(**config)
        return conn
    except Exception as e:
        print(f"Error connecting to PostgreSQL: {e}")
        sys.exit(1)

def migrate_users(sqlite_conn, pg_conn):
    """Migrate users table"""
    print("Migrating users...")
    
    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()
    
    # Fetch users from SQLite
    sqlite_cur.execute("SELECT * FROM users")
    users = sqlite_cur.fetchall()
    
    count = 0
    for user in users:
        try:
            # Note: Passwords will need to be rehashed as they may use different algorithms
            # For migration, we'll set must_change_password to true for all users
            pg_cur.execute("""
                INSERT INTO users (username, password, full_name, role, is_active, 
                                 must_change_password, last_login, created_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (username) DO UPDATE
                SET full_name = EXCLUDED.full_name,
                    role = EXCLUDED.role,
                    is_active = EXCLUDED.is_active
            """, (
                user['username'],
                user['password'],  # Note: May need to rehash
                user['full_name'],
                user['role'],
                bool(user['is_active']),
                True,  # Force password change for security
                datetime.fromtimestamp(user['last_login']) if user['last_login'] else None,
                datetime.fromtimestamp(user['created_date']) if user['created_date'] else datetime.now()
            ))
            count += 1
        except Exception as e:
            print(f"  Error migrating user {user['username']}: {e}")
    
    pg_conn.commit()
    print(f"  Migrated {count} users")

def migrate_patients(sqlite_conn, pg_conn):
    """Migrate patient_info table"""
    print("Migrating patients...")
    
    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()
    
    # Fetch patients from SQLite
    sqlite_cur.execute("SELECT * FROM patient_info")
    patients = sqlite_cur.fetchall()
    
    count = 0
    for patient in patients:
        try:
            pg_cur.execute("""
                INSERT INTO patient_info (
                    patient_first_name, patient_last_name, wing, room_number,
                    diet_type, diet, ada_diet, fluid_restriction, texture_modifications,
                    mechanical_chopped, mechanical_ground, bite_size, bread_ok,
                    nectar_thick, pudding_thick, honey_thick, extra_gravy, meats_only,
                    is_puree, allergies, likes, dislikes, comments, preferred_drink,
                    drink_variety, breakfast_complete, lunch_complete, dinner_complete,
                    breakfast_npo, lunch_npo, dinner_npo, breakfast_items, lunch_items,
                    dinner_items, breakfast_juices, lunch_juices, dinner_juices,
                    breakfast_drinks, lunch_drinks, dinner_drinks, created_date,
                    order_date, breakfast_diet, lunch_diet, dinner_diet,
                    breakfast_ada, lunch_ada, dinner_ada, discharged
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                patient['patient_first_name'],
                patient['patient_last_name'],
                patient['wing'],
                patient['room_number'],
                patient['diet_type'],
                patient['diet'],
                bool(patient['ada_diet']),
                patient['fluid_restriction'],
                patient['texture_modifications'],
                bool(patient['mechanical_chopped']),
                bool(patient['mechanical_ground']),
                bool(patient['bite_size']),
                bool(patient['bread_ok']),
                bool(patient['nectar_thick']),
                bool(patient['pudding_thick']),
                bool(patient['honey_thick']),
                bool(patient['extra_gravy']),
                bool(patient['meats_only']),
                bool(patient.get('is_puree', 0)),
                patient['allergies'],
                patient['likes'],
                patient['dislikes'],
                patient['comments'],
                patient['preferred_drink'],
                patient['drink_variety'],
                bool(patient['breakfast_complete']),
                bool(patient['lunch_complete']),
                bool(patient['dinner_complete']),
                bool(patient['breakfast_npo']),
                bool(patient['lunch_npo']),
                bool(patient['dinner_npo']),
                patient['breakfast_items'],
                patient['lunch_items'],
                patient['dinner_items'],
                patient['breakfast_juices'],
                patient['lunch_juices'],
                patient['dinner_juices'],
                patient['breakfast_drinks'],
                patient['lunch_drinks'],
                patient['dinner_drinks'],
                datetime.fromtimestamp(patient['created_date']) if patient['created_date'] else datetime.now(),
                datetime.fromtimestamp(patient['order_date']) if patient['order_date'] else None,
                patient['breakfast_diet'],
                patient['lunch_diet'],
                patient['dinner_diet'],
                bool(patient['breakfast_ada']),
                bool(patient['lunch_ada']),
                bool(patient['dinner_ada']),
                bool(patient.get('discharged', 0))
            ))
            count += 1
        except Exception as e:
            print(f"  Error migrating patient {patient['patient_first_name']} {patient['patient_last_name']}: {e}")
    
    pg_conn.commit()
    print(f"  Migrated {count} patients")

def migrate_items(sqlite_conn, pg_conn):
    """Migrate items table"""
    print("Migrating items...")
    
    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()
    
    # Check if items already exist (from init.sql)
    pg_cur.execute("SELECT COUNT(*) FROM items")
    existing_count = pg_cur.fetchone()[0]
    
    if existing_count > 0:
        print(f"  Items table already has {existing_count} items, skipping migration")
        return
    
    # Fetch items from SQLite
    sqlite_cur.execute("SELECT * FROM items")
    items = sqlite_cur.fetchall()
    
    count = 0
    for item in items:
        try:
            pg_cur.execute("""
                INSERT INTO items (name, category, description, is_ada_friendly)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (name) DO NOTHING
            """, (
                item['name'],
                item['category'],
                item['description'],
                bool(item['is_ada_friendly'])
            ))
            count += 1
        except Exception as e:
            print(f"  Error migrating item {item['name']}: {e}")
    
    pg_conn.commit()
    print(f"  Migrated {count} items")

def migrate_meal_orders(sqlite_conn, pg_conn):
    """Migrate meal_orders table"""
    print("Migrating meal orders...")
    
    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()
    
    # Get patient ID mapping
    patient_map = {}
    sqlite_cur.execute("SELECT patient_id, patient_first_name, patient_last_name, wing, room_number FROM patient_info")
    for patient in sqlite_cur.fetchall():
        key = f"{patient['patient_first_name']}_{patient['patient_last_name']}_{patient['wing']}_{patient['room_number']}"
        
        # Find corresponding patient in PostgreSQL
        pg_cur.execute("""
            SELECT patient_id FROM patient_info 
            WHERE patient_first_name = %s AND patient_last_name = %s 
            AND wing = %s AND room_number = %s
        """, (patient['patient_first_name'], patient['patient_last_name'], 
              patient['wing'], patient['room_number']))
        
        result = pg_cur.fetchone()
        if result:
            patient_map[patient['patient_id']] = result[0]
    
    # Fetch orders from SQLite
    sqlite_cur.execute("SELECT * FROM meal_orders")
    orders = sqlite_cur.fetchall()
    
    count = 0
    order_id_map = {}
    
    for order in orders:
        try:
            if order['patient_id'] not in patient_map:
                print(f"  Warning: Patient ID {order['patient_id']} not found in mapping")
                continue
            
            pg_cur.execute("""
                INSERT INTO meal_orders (patient_id, meal, order_date, is_complete, 
                                       created_by, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING order_id
            """, (
                patient_map[order['patient_id']],
                order['meal'],
                datetime.fromtimestamp(order['order_date']) if order['order_date'] else None,
                bool(order['is_complete']),
                order['created_by'],
                datetime.fromtimestamp(order['timestamp']) if order['timestamp'] else datetime.now()
            ))
            
            new_order_id = pg_cur.fetchone()[0]
            order_id_map[order['order_id']] = new_order_id
            count += 1
        except Exception as e:
            print(f"  Error migrating order {order['order_id']}: {e}")
    
    pg_conn.commit()
    print(f"  Migrated {count} meal orders")
    
    # Migrate order items
    print("Migrating order items...")
    sqlite_cur.execute("SELECT * FROM order_items")
    order_items = sqlite_cur.fetchall()
    
    item_count = 0
    for order_item in order_items:
        try:
            if order_item['order_id'] not in order_id_map:
                continue
            
            # Get item ID from PostgreSQL
            sqlite_cur.execute("SELECT name FROM items WHERE item_id = ?", (order_item['item_id'],))
            item_name = sqlite_cur.fetchone()['name']
            
            pg_cur.execute("SELECT item_id FROM items WHERE name = %s", (item_name,))
            pg_item = pg_cur.fetchone()
            
            if pg_item:
                pg_cur.execute("""
                    INSERT INTO order_items (order_id, item_id, quantity)
                    VALUES (%s, %s, %s)
                """, (
                    order_id_map[order_item['order_id']],
                    pg_item[0],
                    order_item['quantity']
                ))
                item_count += 1
        except Exception as e:
            print(f"  Error migrating order item: {e}")
    
    pg_conn.commit()
    print(f"  Migrated {item_count} order items")

def migrate_default_menu(sqlite_conn, pg_conn):
    """Migrate default_menu table"""
    print("Migrating default menu...")
    
    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()
    
    # Fetch default menu from SQLite
    sqlite_cur.execute("SELECT * FROM default_menu")
    menu_items = sqlite_cur.fetchall()
    
    count = 0
    for menu_item in menu_items:
        try:
            pg_cur.execute("""
                INSERT INTO default_menu (diet_type, meal_type, day_of_week, 
                                        item_name, item_category, is_active)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                menu_item['diet_type'],
                menu_item['meal_type'],
                menu_item['day_of_week'],
                menu_item['item_name'],
                menu_item['item_category'],
                bool(menu_item['is_active'])
            ))
            count += 1
        except Exception as e:
            print(f"  Error migrating default menu item: {e}")
    
    pg_conn.commit()
    print(f"  Migrated {count} default menu items")

def main():
    """Main migration function"""
    print("Hospital Dietary Management System - SQLite to PostgreSQL Migration")
    print("=" * 60)
    
    # Get database paths from command line or use defaults
    if len(sys.argv) > 1:
        SQLITE_DB_PATH = sys.argv[1]
    
    # Connect to databases
    print("Connecting to databases...")
    sqlite_conn = connect_sqlite(SQLITE_DB_PATH)
    pg_conn = connect_postgres(POSTGRES_CONFIG)
    
    try:
        # Perform migrations
        migrate_users(sqlite_conn, pg_conn)
        migrate_patients(sqlite_conn, pg_conn)
        migrate_items(sqlite_conn, pg_conn)
        migrate_meal_orders(sqlite_conn, pg_conn)
        migrate_default_menu(sqlite_conn, pg_conn)
        
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"\nMigration failed: {e}")
        pg_conn.rollback()
        sys.exit(1)
        
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    main()
