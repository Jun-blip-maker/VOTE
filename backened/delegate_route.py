from flask import Blueprint, request, jsonify
import sqlite3
from werkzeug.security import generate_password_hash
import uuid
from contextlib import contextmanager

delegate_bp = Blueprint('delegate', __name__)

# Database context manager
@contextmanager
def get_db_connection():
    conn = sqlite3.connect("garissa_voting.db")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_delegate_db():
    with get_db_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS delegates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                public_id TEXT UNIQUE,
                full_name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                registration_number TEXT UNIQUE NOT NULL,
                faculty TEXT,
                year_of_study INTEGER,
                password TEXT NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

# Initialize database
init_delegate_db()

@delegate_bp.route("/api/delegates/register", methods=["POST", "OPTIONS"])
def register_delegate():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
        
    data = request.get_json()

    required_fields = ["fullName", "emailOrPhone", "registrationNumber", "faculty", "yearOfStudy", "password"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field} is required"}), 400

    # Validate password length
    if len(data["password"]) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400

    try:
        with get_db_connection() as conn:
            # Check if delegate already exists
            existing_delegate = conn.execute(
                "SELECT * FROM delegates WHERE registration_number = ?",
                [data["registrationNumber"].upper()]
            ).fetchone()
            
            if existing_delegate:
                return jsonify({"error": "Delegate with this registration number already exists"}), 409

            # Insert new delegate
            public_id = str(uuid.uuid4())
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO delegates (public_id, full_name, email, phone, registration_number, faculty, year_of_study, password)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    public_id,
                    data["fullName"],
                    data["emailOrPhone"] if "@" in data["emailOrPhone"] else None,
                    data["emailOrPhone"] if "@" not in data["emailOrPhone"] else None,
                    data["registrationNumber"].upper(),
                    data["faculty"],
                    data["yearOfStudy"],
                    generate_password_hash(data["password"]),
                ),
            )
            conn.commit()
            delegate_id = cursor.lastrowid

        return jsonify({
            "message": "Delegate registered successfully", 
            "delegate_id": delegate_id,
            "public_id": public_id,
            "redirect": "/delegate-signin"
        }), 201
        
    except sqlite3.IntegrityError as e:
        return jsonify({"error": "Registration number already exists"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@delegate_bp.route("/api/delegates", methods=["GET"])
def get_delegates():
    try:
        with get_db_connection() as conn:
            delegates = [dict(row) for row in conn.execute(
                "SELECT id, public_id, full_name, email, phone, registration_number, faculty, year_of_study, is_verified, created_at FROM delegates"
            ).fetchall()]
        return jsonify(delegates)
    except Exception as e:
        return jsonify({"error": str(e)}), 500