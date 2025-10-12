from flask import Blueprint, request, jsonify
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
from contextlib import contextmanager

# Create the Blueprint instance
student_bp = Blueprint('student', __name__)

# Enable CORS for this blueprint
CORS(student_bp, resources={
    r"/api/students/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
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
        # Students table
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
        
        # SIMPLIFIED VOTER RECORDS TABLE - ONLY NAME, REG NUMBER & TIME
        conn.execute('''
            CREATE TABLE IF NOT EXISTS voter_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                registration_number TEXT UNIQUE NOT NULL,
                vote_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for faster queries
        conn.execute('CREATE INDEX IF NOT EXISTS idx_voter_records_reg_number ON voter_records(registration_number)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_voter_records_time ON voter_records(vote_time)')
        
        conn.commit()

# Initialize database
init_db()

@student_bp.route("/api/students/register", methods=["POST", "OPTIONS"])
def register_student():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200

    data = request.get_json()

    required_fields = ["full_name", "email_or_phone", "registration_number", "password"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field} is required"}), 400

    try:
        password = str(data["password"]).strip()
        if not password:
            return jsonify({"error": "Password cannot be empty"}), 400
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO students (full_name, email_or_phone, registration_number, password)
                VALUES (?, ?, ?, ?)
                ''',
                (
                    str(data["full_name"]).strip(),
                    str(data["email_or_phone"]).strip(),
                    str(data["registration_number"]).strip().upper(),
                    generate_password_hash(password),
                ),
            )
            conn.commit()
            student_id = cursor.lastrowid

        response = jsonify({
            "message": "Student registered successfully", 
            "student_id": student_id,
            "redirect": "/student-signin"
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 201

    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint failed" in str(e):
            return jsonify({"error": "Registration number already exists"}), 400
        return jsonify({"error": "Database integrity error"}), 400
    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500

@student_bp.route("/api/students/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200

    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400
    if not data.get("registration_number"):
        return jsonify({"error": "Registration number is required"}), 400
    if not data.get("password"):
        return jsonify({"error": "Password is required"}), 400

    try:
        # Standardize inputs
        reg_number = str(data["registration_number"]).strip().upper()
        password = str(data["password"])

        print(f"Login attempt for: {reg_number}")  # Debug logging

        # Fetch student row
        with get_db_connection() as conn:
            row = conn.execute(
                "SELECT * FROM students WHERE registration_number = ? COLLATE NOCASE",
                (reg_number,)
            ).fetchone()

        if not row:
            return jsonify({
                "error": "Student not registered",
                "suggestion": "Please check your registration number or register first"
            }), 404

        # Convert row to dict so it works outside DB connection
        student = dict(row)

        print(f"Found student: {student['registration_number']}")  # Debug

        # Verify password hash
        if not check_password_hash(student["password"], password):
            return jsonify({
                "error": "Invalid password",
                "suggestion": "Please check your password"
            }), 401

        # Generate JWT token
        token = jwt.encode({
            "id": student["id"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, JWT_SECRET_KEY, algorithm="HS256")

        response = jsonify({
            "message": "Login successful",
            "token": token,
            "student": {
                "id": student["id"],
                "full_name": student["full_name"],
                "registration_number": student["registration_number"],
            }
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200

    except Exception as e:
        print(f"Login error: {str(e)}")  # Detailed error logging
        return jsonify({"error": f"Login error: {str(e)}"}), 500

@student_bp.route("/api/students/debug", methods=["GET"])
def debug_students():
    try:
        with get_db_connection() as conn:
            students = conn.execute("SELECT id, registration_number FROM students").fetchall()
            voter_records = conn.execute("SELECT COUNT(*) as count FROM voter_records").fetchone()
            response = jsonify({
                "database": os.path.abspath("garissa_voting.db"),
                "students": [dict(student) for student in students],
                "voter_records_count": voter_records["count"]
            })
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# SIMPLIFIED: Get voter records endpoint
@student_bp.route("/api/voter-records", methods=["GET"])
def get_voter_records():
    """Get all voter records with essential details only"""
    try:
        with get_db_connection() as conn:
            records = conn.execute('''
                SELECT 
                    id,
                    full_name,
                    registration_number,
                    vote_time
                FROM voter_records 
                ORDER BY vote_time DESC
            ''').fetchall()
            
            voter_records = []
            for record in records:
                voter_records.append({
                    "id": record["id"],
                    "full_name": record["full_name"],
                    "registration_number": record["registration_number"],
                    "vote_time": record["vote_time"]
                })
            
            return jsonify({
                "voter_records": voter_records,
                "total_records": len(voter_records)
            }), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# SIMPLIFIED: Create voter record endpoint
@student_bp.route("/api/voter-records/create", methods=["POST"])
def create_voter_record():
    """Create a new voter record after voting - only name, reg number & time"""
    try:
        data = request.get_json()
        
        required_fields = ["full_name", "registration_number"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"{field} is required"}), 400
        
        with get_db_connection() as conn:
            # Check if voter has already voted
            existing_record = conn.execute(
                "SELECT id FROM voter_records WHERE registration_number = ?",
                (data["registration_number"].upper(),)
            ).fetchone()
            
            if existing_record:
                return jsonify({"error": "Voter has already cast a vote"}), 400
            
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO voter_records 
                (full_name, registration_number)
                VALUES (?, ?)
                ''',
                (
                    data["full_name"],
                    data["registration_number"].upper()
                )
            )
            conn.commit()
            record_id = cursor.lastrowid
            
            # Get the created record with timestamp
            new_record = conn.execute(
                "SELECT * FROM voter_records WHERE id = ?",
                (record_id,)
            ).fetchone()
            
        return jsonify({
            "message": "Voter record created successfully",
            "record_id": record_id,
            "vote_time": new_record["vote_time"]
        }), 201
        
    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint failed" in str(e):
            return jsonify({"error": "Voter has already cast a vote"}), 400
        return jsonify({"error": "Database integrity error"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to create voter record: {str(e)}"}), 500

# Check if voter has already voted
@student_bp.route("/api/voter-records/check/<registration_number>", methods=["GET"])
def check_voter_status(registration_number):
    """Check if a voter has already voted"""
    try:
        with get_db_connection() as conn:
            record = conn.execute(
                "SELECT * FROM voter_records WHERE registration_number = ?",
                (registration_number.upper(),)
            ).fetchone()
            
            if record:
                return jsonify({
                    "has_voted": True,
                    "vote_time": record["vote_time"],
                    "full_name": record["full_name"]
                }), 200
            else:
                return jsonify({
                    "has_voted": False
                }), 200
                
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get voting statistics
@student_bp.route("/api/voting-statistics", methods=["GET"])
def get_voting_statistics():
    """Get voting statistics"""
    try:
        with get_db_connection() as conn:
            # Total votes
            total_votes = conn.execute("SELECT COUNT(*) as count FROM voter_records").fetchone()["count"]
            
            # Recent votes (last 24 hours)
            recent_votes = conn.execute('''
                SELECT COUNT(*) as count 
                FROM voter_records 
                WHERE vote_time >= datetime('now', '-1 day')
            ''').fetchone()["count"]
            
            # Votes today
            votes_today = conn.execute('''
                SELECT COUNT(*) as count 
                FROM voter_records 
                WHERE date(vote_time) = date('now')
            ''').fetchone()["count"]
            
            statistics = {
                "total_votes": total_votes,
                "recent_votes_24h": recent_votes,
                "votes_today": votes_today
            }
            
            return jsonify(statistics), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Export the blueprint
__all__ = ['student_bp']