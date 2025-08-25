from flask import Blueprint, request, jsonify
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from contextlib import contextmanager

admin_bp = Blueprint('admin', __name__)

# Configuration
JWT_SECRET_KEY = 'your-secret-key-here'

# Database context manager
@contextmanager
def get_db_connection():
    conn = sqlite3.connect("garissa_voting.db")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_admin_db():
    with get_db_connection() as conn:
        # Admin table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Candidates table (approved delegates who can be voted for)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                delegate_id INTEGER,
                faculty TEXT NOT NULL,
                full_name TEXT NOT NULL,
                registration_number TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (delegate_id) REFERENCES delegates (id)
            )
        ''')
        
        # Create default admin if doesn't exist
        admin_exists = conn.execute("SELECT * FROM admins WHERE username = ?", ["admin"]).fetchone()
        if not admin_exists:
            conn.execute(
                "INSERT INTO admins (username, password) VALUES (?, ?)",
                ["admin", generate_password_hash("admin123")]
            )
        
        conn.commit()

# Initialize admin database
init_admin_db()

# Admin login endpoint
@admin_bp.route("/api/admin/login", methods=["POST", "OPTIONS"])
def admin_login():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200
        
    data = request.get_json()
    
    if not data or not data.get("username") or not data.get("password"):
        return jsonify({"error": "Username and password required"}), 400

    try:
        with get_db_connection() as conn:
            admin = conn.execute(
                "SELECT * FROM admins WHERE username = ?",
                [data["username"]]
            ).fetchone()

        if not admin:
            return jsonify({"error": "Admin not found"}), 404

        if check_password_hash(admin["password"], data["password"]):
            token = jwt.encode({
                'admin_id': admin['id'],
                'username': admin['username'],
                'is_admin': True,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, JWT_SECRET_KEY, algorithm='HS256')
            
            return jsonify({
                "message": "Admin login successful",
                "token": token,
                "admin": {
                    "id": admin["id"],
                    "username": admin["username"]
                }
            }), 200
        
        return jsonify({"error": "Wrong password"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get pending delegates (for admin approval)
@admin_bp.route("/api/admin/delegates/pending", methods=["GET", "OPTIONS"])
def get_pending_delegates():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200
        
    try:
        with get_db_connection() as conn:
            delegates = [dict(row) for row in conn.execute(
                "SELECT id, public_id, full_name, email, phone, registration_number, faculty, year_of_study, created_at FROM delegates WHERE is_approved = FALSE"
            ).fetchall()]
        return jsonify(delegates)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Approve delegate
@admin_bp.route("/api/admin/delegates/<int:delegate_id>/approve", methods=["POST", "OPTIONS"])
def approve_delegate(delegate_id):
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200
        
    try:
        with get_db_connection() as conn:
            # Get delegate info
            delegate = conn.execute(
                "SELECT * FROM delegates WHERE id = ?",
                [delegate_id]
            ).fetchone()
            
            if not delegate:
                return jsonify({"error": "Delegate not found"}), 404
                
            # Approve delegate
            conn.execute(
                "UPDATE delegates SET is_approved = TRUE WHERE id = ?",
                [delegate_id]
            )
            
            # Add to candidates table
            conn.execute(
                '''
                INSERT INTO candidates (delegate_id, faculty, full_name, registration_number)
                VALUES (?, ?, ?, ?)
                ''',
                (delegate_id, delegate['faculty'], delegate['full_name'], delegate['registration_number'])
            )
            
            conn.commit()
            
        return jsonify({"message": "Delegate approved successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Remove delegate
@admin_bp.route("/api/admin/delegates/<int:delegate_id>/remove", methods=["DELETE", "OPTIONS"])
def remove_delegate(delegate_id):
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200
        
    try:
        with get_db_connection() as conn:
            conn.execute("DELETE FROM delegates WHERE id = ?", [delegate_id])
            conn.commit()
            
        return jsonify({"message": "Delegate removed successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get candidates by faculty (for voting)
@admin_bp.route("/api/candidates", methods=["GET", "OPTIONS"])
def get_candidates():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200
        
    try:
        with get_db_connection() as conn:
            candidates = [dict(row) for row in conn.execute(
                "SELECT * FROM candidates ORDER BY faculty, full_name"
            ).fetchall()]
        return jsonify(candidates)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get voting results
@admin_bp.route("/api/results", methods=["GET", "OPTIONS"])
def get_results():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200
        
    try:
        with get_db_connection() as conn:
            results = [dict(row) for row in conn.execute(
                '''
                SELECT c.faculty, c.full_name, c.registration_number, COUNT(v.id) as vote_count
                FROM candidates c
                LEFT JOIN votes v ON c.id = v.candidate_id
                GROUP BY c.id, c.faculty, c.full_name, c.registration_number
                ORDER BY c.faculty, vote_count DESC
                '''
            ).fetchall()]
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500