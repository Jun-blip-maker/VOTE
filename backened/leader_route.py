from flask import Blueprint, request, jsonify
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
from contextlib import contextmanager

# Create the Blueprint instance
leader_bp = Blueprint('leader', __name__)

# Enable CORS for this blueprint
CORS(leader_bp, resources={
    r"/api/leaders/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]  # Added Authorization header
    }
})

# Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-strong-secret-key-here')

# Database context manager
@contextmanager
def get_db_connection():
    conn = sqlite3.connect("garissa_voting.db")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS leaders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                reg_number TEXT UNIQUE NOT NULL,
                school TEXT,
                position TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT UNIQUE,
                year_of_study TEXT,
                photo_url TEXT,
                password TEXT NOT NULL,
                is_approved BOOLEAN DEFAULT FALSE,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create an index for faster queries
        conn.execute('CREATE INDEX IF NOT EXISTS idx_leaders_reg_number ON leaders(reg_number)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_leaders_email ON leaders(email)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_leaders_approved ON leaders(is_approved)')
        
        conn.commit()

# Initialize database
init_db()

@leader_bp.route("/api/leaders/register", methods=["POST", "OPTIONS"])
def register_leader():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200

    data = request.get_json()

    # Fixed field names to match frontend (camelCase)
    required_fields = ["fullName", "regNumber", "phone", "position"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field} is required"}), 400

    try:
        # Generate password from phone (last 4 digits)
        phone = str(data["phone"]).strip()
        password = phone[-4:] if len(phone) >= 4 else "1234"
        
        if not password:
            return jsonify({"error": "Password cannot be generated from phone number"}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO leaders (full_name, reg_number, school, position, phone, email, 
                                   year_of_study, photo_url, password)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    str(data["fullName"]).strip(),  # Changed to match frontend field name
                    str(data["regNumber"]).strip().upper(),  # Changed to match frontend field name
                    str(data.get("school", "")).strip(),
                    str(data["position"]).strip(),
                    phone,
                    str(data.get("email", "")).strip(),
                    str(data.get("yearOfStudy", "")).strip(),  # Changed to match frontend field name
                    None,  # photo_url placeholder
                    generate_password_hash(password),
                ),
            )
            conn.commit()
            leader_id = cursor.lastrowid

        response = jsonify({
            "message": "Leader registered successfully. Pending admin approval.", 
            "leader_id": leader_id,
            "temp_password": password,  # In production, send this via email/SMS
            "redirect": "/leader-signin"
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 201

    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint failed: leaders.reg_number" in str(e):
            return jsonify({"error": "Registration number already exists"}), 400
        if "UNIQUE constraint failed: leaders.email" in str(e):
            return jsonify({"error": "Email already exists"}), 400
        return jsonify({"error": "Database integrity error"}), 400
    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500

@leader_bp.route("/api/leaders/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200

    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400
    if not data.get("registrationNumber"):
        return jsonify({"error": "Registration number is required"}), 400
    if not data.get("password"):
        return jsonify({"error": "Password is required"}), 400

    try:
        # Standardize inputs
        reg_number = str(data["registrationNumber"]).strip().upper()
        password = str(data["password"])

        # Fetch leader row
        with get_db_connection() as conn:
            row = conn.execute(
                "SELECT * FROM leaders WHERE reg_number = ? COLLATE NOCASE",
                (reg_number,)
            ).fetchone()

        if not row:
            return jsonify({
                "error": "Leader not registered",
                "suggestion": "Please check your registration number or register first"
            }), 404

        # Convert row to dict so it works outside DB connection
        leader = dict(row)

        # Check if approved
        if not leader["is_approved"]:
            return jsonify({
                "error": "Account pending approval",
                "suggestion": "Your account is pending admin approval. Please wait for approval."
            }), 403

        # Verify password hash
        if not check_password_hash(leader["password"], password):
            return jsonify({
                "error": "Invalid password",
                "suggestion": "Please check your password"
            }), 401

        # Generate JWT token
        token = jwt.encode({
            "id": leader["id"],
            "reg_number": leader["reg_number"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, JWT_SECRET_KEY, algorithm="HS256")

        # Update last login timestamp
        with get_db_connection() as conn:
            conn.execute(
                "UPDATE leaders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (leader["id"],)
            )
            conn.commit()

        # Fixed response field names to camelCase for frontend
        response = jsonify({
            "message": "Login successful",
            "token": token,
            "leader": {
                "id": leader["id"],
                "fullName": leader["full_name"],  # Changed to camelCase
                "regNumber": leader["reg_number"],  # Changed to camelCase
                "school": leader["school"],
                "position": leader["position"],
                "phone": leader["phone"],
                "email": leader["email"],
                "yearOfStudy": leader["year_of_study"],  # Changed to camelCase
                "photoUrl": leader["photo_url"],  # Changed to camelCase
                "is_approved": bool(leader["is_approved"]),
                "is_admin": bool(leader["is_admin"])
            }
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200

    except Exception as e:
        return jsonify({"error": f"Login error: {str(e)}"}), 500

@leader_bp.route("/api/leaders/profile", methods=["GET"])
def get_profile():
    try:
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization token required"}), 401
        
        token = auth_header.split(' ')[1]
        
        # Verify token
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        
        # Fetch leader data
        with get_db_connection() as conn:
            row = conn.execute(
                "SELECT id, full_name, reg_number, school, position, phone, email, year_of_study, photo_url, is_approved, is_admin, created_at, updated_at FROM leaders WHERE id = ?",
                (payload["id"],)
            ).fetchone()
            
        if not row:
            return jsonify({"error": "Leader not found"}), 404
            
        leader = dict(row)
        
        # Format response with camelCase field names for frontend
        leader_response = {
            "id": leader["id"],
            "fullName": leader["full_name"],
            "regNumber": leader["reg_number"],
            "school": leader["school"],
            "position": leader["position"],
            "phone": leader["phone"],
            "email": leader["email"],
            "yearOfStudy": leader["year_of_study"],
            "photoUrl": leader["photo_url"],
            "is_approved": bool(leader["is_approved"]),
            "is_admin": bool(leader["is_admin"]),
            "created_at": leader["created_at"],
            "updated_at": leader["updated_at"]
        }
        
        response = jsonify({"leader": leader_response})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch profile: {str(e)}"}), 500

@leader_bp.route("/api/leaders/approve/<reg_number>", methods=["POST", "OPTIONS"])
def approve_leader(reg_number):
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200

    try:
        with get_db_connection() as conn:
            # Check if leader exists
            row = conn.execute(
                "SELECT * FROM leaders WHERE reg_number = ? COLLATE NOCASE",
                (reg_number.upper(),)
            ).fetchone()
            
            if not row:
                return jsonify({"error": "Leader not found"}), 404
                
            # Approve the leader
            conn.execute(
                "UPDATE leaders SET is_approved = TRUE, updated_at = CURRENT_TIMESTAMP WHERE reg_number = ?",
                (reg_number.upper(),)
            )
            conn.commit()
            
        response = jsonify({
            "message": "Leader approved successfully",
            "reg_number": reg_number.upper()
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Approval failed: {str(e)}"}), 500

@leader_bp.route("/api/leaders", methods=["GET"])
def get_all_leaders():
    try:
        with get_db_connection() as conn:
            # Fixed SQL query - removed "course" field
            rows = conn.execute(
                "SELECT id, full_name, reg_number, school, position, phone, email, "
                "year_of_study, photo_url, is_approved, is_admin, created_at, updated_at "
                "FROM leaders ORDER BY created_at DESC"
            ).fetchall()
            
        # Format response with camelCase field names
        leaders = []
        for row in rows:
            leader = dict(row)
            leaders.append({
                "id": leader["id"],
                "fullName": leader["full_name"],
                "regNumber": leader["reg_number"],
                "school": leader["school"],
                "position": leader["position"],
                "phone": leader["phone"],
                "email": leader["email"],
                "yearOfStudy": leader["year_of_study"],
                "photoUrl": leader["photo_url"],
                "is_approved": bool(leader["is_approved"]),
                "is_admin": bool(leader["is_admin"]),
                "created_at": leader["created_at"],
                "updated_at": leader["updated_at"]
            })
        
        response = jsonify({"leaders": leaders})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch leaders: {str(e)}"}), 500

@leader_bp.route("/api/leaders/debug", methods=["GET"])
def debug_leaders():
    try:
        with get_db_connection() as conn:
            leaders = conn.execute("SELECT id, reg_number, full_name, is_approved FROM leaders").fetchall()
            response = jsonify({
                "database": os.path.abspath("garissa_voting.db"),
                "leaders": [dict(leader) for leader in leaders]
            })
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Export the blueprint
__all__ = ['leader_bp']