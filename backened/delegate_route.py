from flask import Blueprint, request, jsonify
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import jwt
import datetime
from contextlib import contextmanager
import os

delegate_bp = Blueprint('delegate', __name__)

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

def init_delegate_db():
    with get_db_connection() as conn:
        # Create delegates table
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
                is_approved BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # Create candidates table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                delegate_id INTEGER NOT NULL,
                full_name TEXT NOT NULL,
                registration_number TEXT UNIQUE NOT NULL,
                faculty TEXT NOT NULL,
                position TEXT,
                votes INTEGER DEFAULT 0,
                FOREIGN KEY (delegate_id) REFERENCES delegates (id)
            )
        ''')
        # Create votes table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                voter_id INTEGER NOT NULL,
                candidate_id INTEGER NOT NULL,
                voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (voter_id) REFERENCES delegates (id),
                FOREIGN KEY (candidate_id) REFERENCES candidates (id)
            )
        ''')
        conn.commit()

# Initialize database
init_delegate_db()

# ------------------ ROUTES ------------------

# Register delegate
@delegate_bp.route("/api/delegates/register", methods=["POST"])
def register_delegate():
    data = request.get_json()

    required_fields = ["fullName", "emailOrPhone", "registrationNumber", "faculty", "yearOfStudy", "password"]
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
            existing_delegate = conn.execute(
                "SELECT * FROM delegates WHERE registration_number = ?",
                [clean_reg_number]
            ).fetchone()
            if existing_delegate:
                return jsonify({"error": "Delegate with this registration number already exists"}), 409

            public_id = str(uuid.uuid4())
            cursor = conn.cursor()

            email = None
            phone = None
            email_or_phone = str(data["emailOrPhone"]).strip()
            if "@" in email_or_phone:
                email = email_or_phone
            else:
                phone = email_or_phone

            cursor.execute(
                '''
                INSERT INTO delegates (public_id, full_name, email, phone, registration_number, faculty, year_of_study, password)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    public_id,
                    str(data["fullName"]).strip(),
                    email,
                    phone,
                    clean_reg_number,
                    str(data["faculty"]).strip(),
                    int(data["yearOfStudy"]),
                    generate_password_hash(password),
                ),
            )
            conn.commit()
            delegate_id = cursor.lastrowid

        return jsonify({
            "message": "Delegate registered successfully. Waiting for admin approval.",
            "delegate_id": delegate_id,
            "public_id": public_id,
        }), 201

    except sqlite3.IntegrityError:
        return jsonify({"error": "Registration number already exists"}), 409
    except ValueError:
        return jsonify({"error": "Invalid year of study format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Login delegate
@delegate_bp.route("/api/delegates/login", methods=["POST"])
def login_delegate():
    data = request.get_json()

    if not data or not data.get("registrationNumber") or not data.get("password"):
        return jsonify({"error": "Registration number and password required"}), 400

    try:
        reg_number = str(data["registrationNumber"]).strip().upper().replace(" ", "")
        password = str(data["password"]).strip()

        with get_db_connection() as conn:
            delegate = conn.execute(
                "SELECT * FROM delegates WHERE registration_number = ? AND is_active = TRUE",
                [reg_number]
            ).fetchone()

        if not delegate:
            return jsonify({"error": "Delegate not found. Please check your registration number or register first."}), 404

        if not delegate["is_approved"]:
            return jsonify({"error": "Your account is pending admin approval. Please wait for approval."}), 403

        if check_password_hash(delegate["password"], password):
            token = jwt.encode({
                'id': delegate['id'],
                'public_id': delegate['public_id'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, JWT_SECRET_KEY, algorithm='HS256')

            return jsonify({
                "message": "Login successful",
                "token": token,
                "delegate": {
                    "id": delegate["id"],
                    "public_id": delegate["public_id"],
                    "full_name": delegate["full_name"],
                    "registration_number": delegate["registration_number"],
                    "faculty": delegate["faculty"],
                    "year_of_study": delegate["year_of_study"],
                    "is_approved": bool(delegate["is_approved"])  
                }
            }), 200

        return jsonify({"error": "Wrong password. Please try again."}), 401

    except Exception as e:
        return jsonify({"error": "Server error during login. Please try again later."}), 500

# Get all delegates
@delegate_bp.route("/api/delegates", methods=["GET"])
def get_delegates():
    try:
        with get_db_connection() as conn:
            delegates = []
            rows = conn.execute(
                "SELECT id, public_id, full_name, email, phone, registration_number, faculty, year_of_study, is_approved, created_at FROM delegates"
            ).fetchall()
            
            for row in rows:
                delegate = dict(row)
                delegate_formatted = {
                    "_id": delegate["id"],  
                    "id": delegate["id"],
                    "public_id": delegate["public_id"],
                    "fullName": delegate["full_name"],  
                    "emailOrPhone": delegate["email"] or delegate["phone"],  
                    "registrationNumber": delegate["registration_number"],  
                    "faculty": delegate["faculty"],
                    "yearOfStudy": delegate["year_of_study"],  
                    "isApproved": bool(delegate["is_approved"]), 
                    "created_at": delegate["created_at"]
                }
                delegates.append(delegate_formatted)
                
        return jsonify(delegates)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Debug delegates
@delegate_bp.route("/api/debug/delegates", methods=["GET"])
def debug_delegates():
    try:
        with get_db_connection() as conn:
            delegates = [dict(row) for row in conn.execute(
                "SELECT id, registration_number, full_name, is_approved FROM delegates"
            ).fetchall()]
        return jsonify(delegates)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get all candidates - FIXED: Handle missing columns
@delegate_bp.route("/api/candidates", methods=["GET"])
def get_candidates():
    try:
        with get_db_connection() as conn:
            # Check which columns exist in the candidates table
            cursor = conn.execute("PRAGMA table_info(candidates)")
            columns = [column['name'] for column in cursor.fetchall()]
            
            # Build query based on available columns
            select_fields = ["c.id", "c.full_name", "c.registration_number", "c.faculty"]
            
            if 'position' in columns:
                select_fields.append("c.position")
            else:
                select_fields.append("NULL as position")
                
            if 'votes' in columns:
                select_fields.append("c.votes")
            else:
                select_fields.append("0 as votes")
            
            query = f"""
                SELECT {', '.join(select_fields)}
                FROM candidates c
                JOIN delegates d ON c.delegate_id = d.id
                WHERE d.is_approved = 1
            """
            
            candidates = []
            rows = conn.execute(query).fetchall()
            
            for row in rows:
                candidate = dict(row)
                candidates.append({
                    "id": candidate["id"],
                    "full_name": candidate["full_name"],
                    "registration_number": candidate["registration_number"],
                    "faculty": candidate["faculty"],
                    "position": candidate["position"],
                    "votes": candidate.get("votes", 0)
                })
                
        return jsonify(candidates)
    except Exception as e:
        print(f"Error fetching candidates: {e}")
        return jsonify({"error": str(e)}), 500

# Submit a vote
@delegate_bp.route("/api/vote", methods=["POST"])
def submit_vote():
    try:
        data = request.get_json()

        if not data or not data.get("voterRegNumber") or not data.get("candidateId"):
            return jsonify({"error": "Voter registration number and candidate ID are required"}), 400

        with get_db_connection() as conn:
            clean_reg_number = str(data["voterRegNumber"]).strip().upper()

            # Check if voter exists and is approved
            voter = conn.execute(
                "SELECT id FROM delegates WHERE registration_number = ? AND is_approved = 1",
                [clean_reg_number]
            ).fetchone()

            if not voter:
                return jsonify({"error": "Voter not found or not approved"}), 404

            # Check if voter has already voted
            existing_vote = conn.execute(
                "SELECT id FROM votes WHERE voter_id = ?",
                [voter["id"]]
            ).fetchone()

            if existing_vote:
                return jsonify({"error": "You have already voted"}), 400

            # Record the vote
            conn.execute(
                "INSERT INTO votes (voter_id, candidate_id) VALUES (?, ?)",
                [voter["id"], int(data["candidateId"])]
            )

            # Update candidate vote count
            conn.execute(
                "UPDATE candidates SET votes = COALESCE(votes, 0) + 1 WHERE id = ?",
                [int(data["candidateId"])]
            )

            conn.commit()

        return jsonify({"message": "Vote recorded successfully"}), 200

    except ValueError:
        return jsonify({"error": "Invalid candidate ID format"}), 400
    except Exception as e:
        print(f"Error submitting vote: {e}")
        return jsonify({"error": str(e)}), 500

# COMBINED: Approve delegate AND create candidate
# In your approve_delegate function, make sure the faculty is correctly mapped:
@delegate_bp.route("/api/delegates/<delegate_id>/approve", methods=["PUT"])
def approve_delegate(delegate_id):
    try:
        with get_db_connection() as conn:
            # Get delegate info
            delegate = conn.execute(
                "SELECT id, full_name, registration_number, faculty FROM delegates WHERE id = ?",
                [delegate_id]
            ).fetchone()
            
            if not delegate:
                return jsonify({"error": "Delegate not found"}), 404
                
            # Check if candidate already exists
            existing_candidate = conn.execute(
                "SELECT id FROM candidates WHERE delegate_id = ?",
                [delegate_id]
            ).fetchone()
            
            # Create candidate if doesn't exist
            if not existing_candidate:
                # Map faculty to the correct school names that match your frontend
                faculty = delegate["faculty"]
                
                # Ensure the faculty names match exactly what your frontend expects
                faculty_mapping = {
                    "Business": "School of Business and Economics",
                    "Science": "School of Pure and Applied Science", 
                    "Arts": "School of Education of Art",
                    "Education": "School of Education Science"
                }
                
                # Use mapped faculty name or original if not in mapping
                mapped_faculty = faculty_mapping.get(faculty, faculty)
                
                # Check if position column exists
                cursor = conn.execute("PRAGMA table_info(candidates)")
                columns = [column['name'] for column in cursor.fetchall()]
                
                if 'position' in columns:
                    conn.execute(
                        "INSERT INTO candidates (delegate_id, full_name, registration_number, faculty, position) VALUES (?, ?, ?, ?, ?)",
                        [delegate["id"], delegate["full_name"], delegate["registration_number"], mapped_faculty, "Delegate"]
                    )
                else:
                    conn.execute(
                        "INSERT INTO candidates (delegate_id, full_name, registration_number, faculty) VALUES (?, ?, ?, ?)",
                        [delegate["id"], delegate["full_name"], delegate["registration_number"], mapped_faculty]
                    )
            
            # Update delegate approval status
            conn.execute(
                "UPDATE delegates SET is_approved = 1 WHERE id = ?",
                [delegate_id]
            )
            
            conn.commit()
            
        return jsonify({"message": "Delegate approved and added as candidate successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get voting results - FIXED: Handle missing columns
@delegate_bp.route("/api/results", methods=["GET"])
def get_results():
    try:
        with get_db_connection() as conn:
            # Check which columns exist in the candidates table
            cursor = conn.execute("PRAGMA table_info(candidates)")
            columns = [column['name'] for column in cursor.fetchall()]
            
            # Build query based on available columns
            select_fields = ["c.id", "c.full_name", "c.registration_number", "c.faculty"]
            
            if 'position' in columns:
                select_fields.append("c.position")
            else:
                select_fields.append("NULL as position")
                
            if 'votes' in columns:
                select_fields.append("c.votes")
            else:
                select_fields.append("0 as votes")
            
            query = f"""
                SELECT {', '.join(select_fields)}
                FROM candidates c
                ORDER BY COALESCE(votes, 0) DESC
            """
            
            results = [dict(row) for row in conn.execute(query).fetchall()]
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Fix database schema - Add missing columns
@delegate_bp.route("/api/fix-database", methods=["POST"])
def fix_database():
    try:
        with get_db_connection() as conn:
            # Check if position column exists
            cursor = conn.execute("PRAGMA table_info(candidates)")
            columns = [column['name'] for column in cursor.fetchall()]
            
            if 'position' not in columns:
                print("Adding position column to candidates table")
                conn.execute("ALTER TABLE candidates ADD COLUMN position TEXT")
            
            if 'votes' not in columns:
                print("Adding votes column to candidates table")
                conn.execute("ALTER TABLE candidates ADD COLUMN votes INTEGER DEFAULT 0")
                
            conn.commit()
            
        return jsonify({"message": "Database schema updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Reject/Delete delegate
@delegate_bp.route("/api/delegates/<delegate_id>/reject", methods=["DELETE"])
def reject_delegate(delegate_id):
    try:
        with get_db_connection() as conn:
            # Delete delegate
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM delegates WHERE id = ?",
                [delegate_id]
            )
            
            if cursor.rowcount == 0:
                return jsonify({"error": "Delegate not found"}), 404
                
            conn.commit()
            
        return jsonify({"message": "Delegate rejected successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get pending delegates for admin approval
@delegate_bp.route("/api/delegates/pending", methods=["GET"])
def get_pending_delegates():
    try:
        with get_db_connection() as conn:
            delegates = [dict(row) for row in conn.execute(
                "SELECT id, full_name, registration_number, faculty, created_at FROM delegates WHERE is_approved = 0"
            ).fetchall()]
        return jsonify(delegates)
    except Exception as e:
        return jsonify({"error": str(e)}), 500