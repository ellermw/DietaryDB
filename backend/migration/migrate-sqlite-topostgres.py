#!/usr/bin/env python3
import sqlite3
import psycopg2
import sys
import os
from datetime import datetime

def migrate_database(sqlite_file):
    # PostgreSQL connection parameters
    pg_params = {
        'host': os.environ.get('DB_HOST', 'localhost'),
        'port': os.environ.get('DB_PORT', '5432'),
        'database': os.environ.get('DB_NAME', 'dietary_db'),
        'user': os.environ.get('DB_USER', 'dietary_user'),
        'password': os.environ.get('DB_PASSWORD', 'DietarySecurePass2024!')
    }
    
    try:
        # Connect to SQLite
        print(f"Connecting to SQLite database: {sqlite_file}")
        sqlite_conn = sqlite3.connect(sqlite_file)
        sqlite_conn.row_factory = sqlite3.Row
        sqlite_cursor = sqlite_conn.cursor()
        
        # Connect to PostgreSQL
        print("Connecting to PostgreSQL database...")
        pg_conn = psycopg2.connect(**pg_params)
        pg_cursor = pg_conn.cursor()
        
        # Migration mapping
        table_mappings = {
            'users': {
                'columns': ['username', 'password', 'full_name', 'role', 'is_active', 'must_change_password'],
                'defaults': {'is_active': True, 'must_change_password': False}
            },
            'patient_info': {
                'columns': ['patient_first_name', 'patient_last_name', 'wing', 'room_number', 
                           'diet_type', 'ada_diet', 'food_allergies', 'fluid_restriction', 
                           'fluid_restriction_amount', 'texture_modification'],
                'defaults': {'discharged': False}
            },
            'items': {
                'columns': ['name', 'category', 'description', 'is_ada_friendly'],
                'defaults': {'is_active': True}
            },
            'categories': {
                'columns': ['category_name', 'description', 'sort_order'],
                'defaults': {}
            },
            'meal_orders': {
                'columns': ['patient_id', 'meal', 'order_date', 'is_complete', 'created_by'],
                'defaults': {'is_complete': False}
            },
            'order_items': {
                'columns': ['order_id', 'item_id', 'quantity'],
                'defaults': {'quantity': 1}
            },
            'default_menu': {
                'columns': ['diet_type', 'meal_type', 'day_of_week', 'item_name', 'item_category'],
                'defaults': {'is_active': True}
            }
        }
        
        # Migrate each table
        for table_name, mapping in table_mappings.items():
            print(f"\nMigrating table: {table_name}")
            
            # Check if table exists in SQLite
            sqlite_cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table_name,)
            )
            if not sqlite_cursor.fetchone():
                print(f"  Table {table_name} not found in SQLite, skipping...")
                continue
            
            # Get data from SQLite
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cursor.fetchall()
            
            if not rows:
                print(f"  No data found in {table_name}")
                continue
            
            # Prepare insert statement
            columns = mapping['columns']
            placeholders = ', '.join(['%s'] * len(columns))
            insert_query = f"""
                INSERT INTO {table_name} ({', '.join(columns)})
                VALUES ({placeholders})
                ON CONFLICT DO NOTHING
            """
            
            # Insert data
            count = 0
            for row in rows:
                try:
                    values = []
                    for col in columns:
                        if col in dict(row):
                            value = row[col]
                            # Handle boolean conversion
                            if isinstance(value, int) and col in ['is_active', 'ada_diet', 
                                                                   'fluid_restriction', 'is_complete']:
                                value = bool(value)
                            values.append(value)
                        else:
                            # Use default value if column doesn't exist
                            values.append(mapping['defaults'].get(col))
                    
                    pg_cursor.execute(insert_query, values)
                    count += 1
                except Exception as e:
                    print(f"  Error inserting row: {e}")
                    continue
            
            pg_conn.commit()
            print(f"  Migrated {count} rows")
        
        # Update sequences
        print("\nUpdating sequences...")
        sequence_updates = [
            ("users_user_id_seq", "SELECT MAX(user_id) FROM users"),
            ("patient_info_patient_id_seq", "SELECT MAX(patient_id) FROM patient_info"),
            ("items_item_id_seq", "SELECT MAX(item_id) FROM items"),
            ("categories_category_id_seq", "SELECT MAX(category_id) FROM categories"),
            ("meal_orders_order_id_seq", "SELECT MAX(order_id) FROM meal_orders"),
            ("order_items_order_item_id_seq", "SELECT MAX(order_item_id) FROM order_items"),
            ("default_menu_menu_id_seq", "SELECT MAX(menu_id) FROM default_menu")
        ]
        
        for seq_name, max_query in sequence_updates:
            try:
                pg_cursor.execute(max_query)
                max_id = pg_cursor.fetchone()[0]
                if max_id:
                    pg_cursor.execute(f"SELECT setval('{seq_name}', %s, true)", (max_id,))
                    print(f"  Updated {seq_name} to {max_id}")
            except Exception as e:
                print(f"  Error updating sequence {seq_name}: {e}")
        
        pg_conn.commit()
        
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        if 'pg_conn' in locals():
            pg_conn.rollback()
        sys.exit(1)
    finally:
        if 'sqlite_conn' in locals():
            sqlite_conn.close()
        if 'pg_conn' in locals():
            pg_conn.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python migrate-sqlite-to-postgres.py <sqlite_database_file>")
        sys.exit(1)
    
    sqlite_file = sys.argv[1]
    if not os.path.exists(sqlite_file):
        print(f"Error: SQLite file '{sqlite_file}' not found")
        sys.exit(1)
    
    migrate_database(sqlite_file)