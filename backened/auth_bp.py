from flask import Blueprint, request, jsonify
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from contextlib import contextmanager
import os
from flask_cors import CORS

auth_bp = Blueprint('auth', __name__)

# Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-strong-secret-key-here')
DB_PATH = os.path.join(os.getcwd(), "garissa_voting.db")

print(f"Database path: {DB_PATH}")

# Database context manager
@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_auth_db():
    """Initialize authentication tables in the existing database"""
    with get_db_connection() as conn:
        # Create users table if it doesn't exist
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_number TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                user_type TEXT NOT NULL,
                full_name TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Check if sample users exist, create them if not
        admin_exists = conn.execute(
            "SELECT id FROM users WHERE registration_number = 'admin001'"
        ).fetchone()
        
        if not admin_exists:
            conn.execute(
                "INSERT INTO users (registration_number, password_hash, user_type, full_name) VALUES (?, ?, ?, ?)",
                ('admin001', generate_password_hash('admin123'), 'admin', 'System Administrator')
            )
            print("Created admin user: admin001/admin123")
        
        student_exists = conn.execute(
            "SELECT id FROM users WHERE registration_number = 'student001'"
        ).fetchone()
        
        if not student_exists:
            conn.execute(
                "INSERT INTO users (registration_number, password_hash, user_type, full_name) VALUES (?, ?, ?, ?)",
                ('student001', generate_password_hash('student123'), 'student', 'John Student')
            )
            print("Created student user: student001/student123")
        
        conn.commit()

# Initialize database tables
init_auth_db()

# ------------------ AUTHENTICATION ROUTES ------------------

# Login user
@auth_bp.route("/auth/login", methods=["POST", "OPTIONS"])
def login_user():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify()
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    data = request.get_json()
    print(f"DEBUG: Received login data: {data}")  # ADD THIS LINE

    if not data or not data.get("registrationNumber") or not data.get("password") or not data.get("userType"):
        return jsonify({"error": "Registration number, password, and user type are required"}), 400

    try:
        reg_number = str(data["registrationNumber"]).strip().replace(" ", "")
        password = str(data["password"]).strip()
        user_type = str(data["userType"]).strip()
        
        print(f"DEBUG: Searching for - reg_number: '{reg_number}', user_type: '{user_type}'")  

        with get_db_connection() as conn:
            user = conn.execute(
                "SELECT * FROM users WHERE registration_number = ? AND user_type = ? AND is_active = TRUE",
                [reg_number, user_type]
            ).fetchone()

        print(f"DEBUG: Found user: {dict(user) if user else None}")  

        if not user:
            return jsonify({"error": "User not found. Please check your credentials."}), 404

        # Check password
        if not check_password_hash(user["password_hash"], password):
            return jsonify({"error": "Incorrect password"}), 401

        # Generate JWT token
        payload = {
            "user_id": user["id"],
            "registration_number": user["registration_number"],
            "user_type": user["user_type"],
            "full_name": user["full_name"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12)
        }
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")

        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": {
                "id": user["id"],
                "registrationNumber": user["registration_number"],
                "userType": user["user_type"],
                "fullName": user["full_name"]
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

        

# Verify token
@auth_bp.route("/auth/verify", methods=["GET", "OPTIONS"])
def verify_token():
    if request.method == 'OPTIONS':
        response = jsonify()
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "Authorization token required"}), 401

    try:
        token = auth_header.split(' ')[1]
        decoded = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        return jsonify({
            "message": "Token is valid",
            "user": decoded
        }), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token has expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        return jsonify({"error": "Token verification failed"}), 401

# Get all users (for admin purposes)
@auth_bp.route("/auth/users", methods=["GET"])
def get_users():
    try:
        with get_db_connection() as conn:
            users = []
            rows = conn.execute(
                "SELECT id, registration_number, user_type, full_name, is_active, created_at FROM users"
            ).fetchall()
            
            for row in rows:
                users.append(dict(row))
                
        return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Create new user (for admin purposes)
@auth_bp.route("/auth/users", methods=["POST"])
def create_user():
    data = request.get_json()

    required_fields = ["registrationNumber", "password", "userType"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field} is required"}), 400

    password = str(data["password"]).strip()
    if not password:
        return jsonify({"error": "Password cannot be empty"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    try:
        with get_db_connection() as conn:
            clean_reg_number = str(data["registrationNumber"]).strip().upper()
            existing_user = conn.execute(
                "SELECT * FROM users WHERE registration_number = ?",
                [clean_reg_number]
            ).fetchone()
            if existing_user:
                return jsonify({"error": "User with this registration number already exists"}), 409

            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO users (registration_number, password_hash, user_type, full_name)
                VALUES (?, ?, ?, ?)
                ''',
                (
                    clean_reg_number,
                    generate_password_hash(password),
                    str(data["userType"]).strip(),
                    data.get("fullName", "").strip()
                ),
            )
            conn.commit()
            user_id = cursor.lastrowid

        return jsonify({
            "message": "User created successfully",
            "user_id": user_id,
        }), 201

    except sqlite3.IntegrityError:
        return jsonify({"error": "Registration number already exists"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Health check
@auth_bp.route("/auth/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Authentication service is running"})

# Debug endpoint
@auth_bp.route("/auth/debug/users", methods=["GET"])
def debug_users():
    try:
        with get_db_connection() as conn:
            users = []
            rows = conn.execute(
                "SELECT id, registration_number, user_type, full_name, is_active FROM users"
            ).fetchall()
            
            for row in rows:
                users.append(dict(row))
                
        return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    