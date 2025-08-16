import os
from flask import Blueprint, request, jsonify
import sqlite3
import jwt
import datetime
from contextlib import contextmanager

student_bp = Blueprint('student', __name__)

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
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email_or_phone TEXT NOT NULL,
                registration_number TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                is_delegate BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

# Initialize database
init_db()

@student_bp.route("/api/students/register", methods=["POST"])
def register_student():
    data = request.get_json()

    required_fields = ["full_name", "email_or_phone", "registration_number", "password"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field} is required"}), 400

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO students (full_name, email_or_phone, registration_number, password)
                VALUES (?, ?, ?, ?)
                ''',
                (
                    data["full_name"],
                    data["email_or_phone"],
                    data["registration_number"],
                    data["password"],  # Storing plaintext password
                ),
            )
            conn.commit()
            student_id = cursor.lastrowid

        return jsonify({
            "message": "Student registered successfully", 
            "student_id": student_id
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Registration number already exists"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@student_bp.route("/api/students/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
        
    data = request.get_json()
    
    if not data or not data.get("registration_number") or not data.get("password"):
        return jsonify({"error": "Registration number and password required"}), 400

    try:
        with get_db_connection() as conn:
            student = conn.execute(
                "SELECT * FROM students WHERE registration_number = ?",
                [data["registration_number"]]
            ).fetchone()

        if not student:
            return jsonify({"error": "Student not found"}), 404

        # Direct comparison without hashing
        if student["password"] == data["password"]:
            token = jwt.encode({
                'id': student['id'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, JWT_SECRET_KEY, algorithm='HS256')
            
            return jsonify({
                "message": "Login successful",
                "token": token,
                "student": {
                    "id": student["id"],
                    "full_name": student["full_name"],
                    "registration_number": student["registration_number"],
                    "is_delegate": bool(student["is_delegate"])
                }
            }), 200
        return jsonify({"error": "Invalid password"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@student_bp.route("/api/students", methods=["GET"])
def get_students():
    try:
        with get_db_connection() as conn:
            # Exclude passwords from the response
            students = [dict(row) for row in conn.execute("SELECT id, full_name, email_or_phone, registration_number, is_delegate, created_at FROM students").fetchall()]
        return jsonify(students)
    except Exception as e:
        return jsonify({"error": str(e)}), 500