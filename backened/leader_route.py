from flask import Blueprint, request, jsonify
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
from contextlib import contextmanager
import re

# Create the Blueprint instance
leader_bp = Blueprint('leader', __name__)

# Enable CORS for this blueprint
CORS(leader_bp, resources={
    r"/api/leaders/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
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

def validate_phone(phone):
    """Validate phone number format"""
    phone = str(phone).strip()
    # Remove any non-digit characters except + at the beginning
    cleaned = re.sub(r'[^\d+]', '', phone)
    # Check if it's a valid phone number (basic validation)
    if len(cleaned) < 8 or len(cleaned) > 15:
        return False, "Phone number must be between 8-15 digits"
    return True, cleaned

def validate_email(email):
    """Validate email format"""
    if not email:
        return True, ""  # Email is optional
    
    email = str(email).strip()
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False, "Invalid email format"
    return True, email

def init_db():
    with get_db_connection() as conn:
        # Check if leaders table exists and get its structure
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(leaders)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if not columns:
            # Create new leaders table with status column
            conn.execute('''
                CREATE TABLE leaders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    full_name TEXT NOT NULL,
                    reg_number TEXT UNIQUE NOT NULL,
                    school TEXT,
                    position TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    email TEXT,
                    year_of_study TEXT,
                    photo_url TEXT,
                    password TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
        else:
            # Check if status column exists, if not add it
            if 'status' not in columns:
                conn.execute('ALTER TABLE leaders ADD COLUMN status TEXT DEFAULT "pending"')
                # Update existing records
                conn.execute('UPDATE leaders SET status = "pending" WHERE status IS NULL')
                
            # Remove any is_approved column if it exists (clean up old schema)
            if 'is_approved' in columns:
                try:
                    conn.execute('ALTER TABLE leaders DROP COLUMN is_approved')
                except:
                    pass  # Ignore if column doesn't exist
        
        # Create chosen_leaders table - FIXED THE COLUMN NAME
        conn.execute('''
            CREATE TABLE IF NOT EXISTS chosen_leaders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_leader_id INTEGER NOT NULL,
                full_name TEXT NOT NULL,
                reg_number TEXT UNIQUE NOT NULL,
                school TEXT,
                position TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                year_of_study TEXT,  -- FIXED: year_of_study instead of year_of study
                photo_url TEXT,
                password TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (original_leader_id) REFERENCES leaders (id)
            )
        ''')
        
        # Create indexes
        conn.execute('CREATE INDEX IF NOT EXISTS idx_leaders_reg_number ON leaders(reg_number)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_leaders_email ON leaders(email)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_leaders_status ON leaders(status)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_chosen_leaders_reg_number ON chosen_leaders(reg_number)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_chosen_leaders_email ON chosen_leaders(email)')
        
        conn.commit()
        print("Database initialization completed successfully!")

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

    # Validate required fields
    required_fields = ["fullName", "regNumber", "phone", "position"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field} is required"}), 400

    try:
        # Validate phone number
        is_valid, phone_or_error = validate_phone(data["phone"])
        if not is_valid:
            return jsonify({"error": phone_or_error}), 400
        
        # Validate email if provided
        if data.get("email"):
            is_valid, email_or_error = validate_email(data["email"])
            if not is_valid:
                return jsonify({"error": email_or_error}), 400
            email = email_or_error
        else:
            email = ""

        # Generate password from phone (last 4 digits)
        phone = phone_or_error
        password = phone[-4:] if len(phone) >= 4 else "1234"
        
        if not password:
            return jsonify({"error": "Password cannot be generated from phone number"}), 400

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO leaders (full_name, reg_number, school, position, phone, email, 
                                   year_of_study, photo_url, password, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                ''',
                (
                    str(data["fullName"]).strip(),
                    str(data["regNumber"]).strip().upper(),
                    str(data.get("school", "")).strip(),
                    str(data["position"]).strip(),
                    phone,
                    email,
                    str(data.get("yearOfStudy", "")).strip(),
                    None,  # photo_url placeholder
                    generate_password_hash(password)
                ),
            )
            conn.commit()
            leader_id = cursor.lastrowid

        response = jsonify({
            "message": "Leader registered successfully. Pending admin approval.", 
            "leader_id": leader_id,
            "temp_password": password,
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
        reg_number = str(data["registrationNumber"]).strip().upper()
        password = str(data["password"])

        # Check leaders table first for approved status
        with get_db_connection() as conn:
            row = conn.execute(
                "SELECT * FROM leaders WHERE reg_number = ? COLLATE NOCASE AND status = 'approved'",
                (reg_number,)
            ).fetchone()

            # If not found in leaders, check chosen_leaders
            if not row:
                row = conn.execute(
                    "SELECT * FROM chosen_leaders WHERE reg_number = ? COLLATE NOCASE",
                    (reg_number,)
                ).fetchone()

            if not row:
                return jsonify({
                    "error": "Leader not found or not approved",
                    "suggestion": "Please check your registration number or wait for admin approval"
                }), 404

            leader = dict(row)

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

            # Update last login timestamp (for chosen_leaders if applicable)
            if "chosen_leaders" in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chosen_leaders'").fetchone():
                conn.execute(
                    "UPDATE chosen_leaders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (leader["id"],)
                )
                conn.commit()

            response = jsonify({
                "message": "Login successful",
                "token": token,
                "leader": {
                    "id": leader["id"],
                    "fullName": leader["full_name"],
                    "regNumber": leader["reg_number"],
                    "school": leader["school"],
                    "position": leader["position"],
                    "phone": leader["phone"],
                    "email": leader["email"],
                    "yearOfStudy": leader["year_of_study"],
                    "photoUrl": leader["photo_url"],
                    "is_admin": bool(leader.get("is_admin", False))
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
        
        # Fetch leader data from chosen_leaders table
        with get_db_connection() as conn:
            row = conn.execute(
                "SELECT * FROM chosen_leaders WHERE id = ?",
                (payload["id"],)
            ).fetchone()
            
        if not row:
            return jsonify({"error": "Leader not found"}), 404
            
        leader = dict(row)
        
        # Format response with camelCase field names
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
            "is_admin": bool(leader["is_admin"]),
            "approved_at": leader["approved_at"],
            "created_at": leader["created_at"],
            "updated_at": leader["updated_at"]
        }
        
        response = jsonify({"leader": leader_response})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch profile: {str(e)}"}), 500

@leader_bp.route("/api/leaders/pending", methods=["GET"])
def get_pending_leaders():
    """Get all pending leaders for admin approval"""
    try:
        with get_db_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM leaders WHERE status = 'pending' ORDER BY created_at DESC"
            ).fetchall()
            
        # Format response
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
                "status": leader["status"],
                "created_at": leader["created_at"],
                "updated_at": leader["updated_at"]
            })
        
        response = jsonify({"leaders": leaders})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch pending leaders: {str(e)}"}), 500

@leader_bp.route("/api/leaders/approve/<int:leader_id>", methods=["POST", "OPTIONS"])
def approve_leader(leader_id):
    """Approve a leader and move them to chosen_leaders table"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        return response, 200

    try:
        with get_db_connection() as conn:
            # Begin transaction
            cursor = conn.cursor()
            # Get leader from pending table
            row = cursor.execute(
                "SELECT * FROM leaders WHERE id = ? AND status = 'pending'",
                (leader_id,)
            ).fetchone()
            
            if not row:
                return jsonify({"error": "Pending leader not found"}), 404
                
            leader = dict(row)
            
            # Check if leader already exists in chosen_leaders
            existing = cursor.execute(
                "SELECT id FROM chosen_leaders WHERE reg_number = ?",
                (leader["reg_number"],)
            ).fetchone()
            
            if existing:
                return jsonify({"error": "Leader already approved"}), 400
            
            # Insert into chosen_leaders table
            cursor.execute(
                '''
                INSERT INTO chosen_leaders (original_leader_id, full_name, reg_number, school, 
                                          position, phone, email, year_of_study, photo_url, password)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    leader["id"],
                    leader["full_name"],
                    leader["reg_number"],
                    leader["school"],
                    leader["position"],
                    leader["phone"],
                    leader["email"],
                    leader["year_of_study"],
                    leader["photo_url"],
                    leader["password"]
                )
            )
            
            # Update status in original leaders table
            cursor.execute(
                "UPDATE leaders SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (leader_id,)
            )
            
            conn.commit()
            print(f"Leader {leader_id} approved and moved to chosen_leaders")  # Debug log
            
        response = jsonify({
            "message": "Leader approved successfully",
            "leader_id": leader_id,
            "reg_number": leader["reg_number"]
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except sqlite3.IntegrityError as e:
        conn.rollback()
        return jsonify({"error": "Leader already approved or duplicate entry"}), 400
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Approval failed: {str(e)}"}), 500

@leader_bp.route("/api/leaders/reject/<int:leader_id>", methods=["POST", "OPTIONS"])
def reject_leader(leader_id):
    """Reject a leader application"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        return response, 200

    try:
        with get_db_connection() as conn:
            # Check if leader exists and is pending
            row = conn.execute(
                "SELECT * FROM leaders WHERE id = ?",
                (leader_id,)
            ).fetchone()
            
            if not row:
                return jsonify({"error": "Leader not found"}), 404
                
            leader = dict(row)
            
            # Update status to rejected (don't delete, keep for records)
            conn.execute(
                "UPDATE leaders SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (leader_id,)
            )
            
            # If they were approved, remove from chosen_leaders
            if leader["status"] == "approved":
                conn.execute(
                    "DELETE FROM chosen_leaders WHERE original_leader_id = ?",
                    (leader_id,)
                )
                
            conn.commit()
            
        response = jsonify({
            "message": "Leader application rejected",
            "leader_id": leader_id
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Rejection failed: {str(e)}"}), 500

@leader_bp.route("/api/leaders/chosen", methods=["GET"])
def get_chosen_leaders():
    """Get all approved/chosen leaders"""
    try:
        with get_db_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM chosen_leaders ORDER BY approved_at DESC"
            ).fetchall()
            
        # Format response
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
                "is_admin": bool(leader["is_admin"]),
                "approved_at": leader["approved_at"],
                "created_at": leader["created_at"],
                "updated_at": leader["updated_at"]
            })
        
        response = jsonify({"leaders": leaders})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch chosen leaders: {str(e)}"}), 500

@leader_bp.route("/api/leaders", methods=["GET"])
def get_all_leaders():
    """Get all leaders from original table (for admin overview)"""
    try:
        with get_db_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM leaders ORDER BY created_at DESC"
            ).fetchall()
            
        # Format response
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
                "status": leader["status"],
                "created_at": leader["created_at"],
                "updated_at": leader["updated_at"]
            })
        
        response = jsonify({"leaders": leaders})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch leaders: {str(e)}"}), 500

@leader_bp.route("/api/leaders/update/<int:leader_id>", methods=["PUT", "OPTIONS"])
def update_leader(leader_id):
    """Update a leader's information in the leaders table (for pending/rejected leaders)"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "PUT, OPTIONS")
        return response, 200

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        with get_db_connection() as conn:
            # Check if leader exists in leaders table
            row = conn.execute(
                "SELECT * FROM leaders WHERE id = ?",
                (leader_id,)
            ).fetchone()
            
            if not row:
                return jsonify({"error": "Leader not found"}), 404
            
            # Validate and prepare update data
            update_data = {}
            
            # Validate required fields if provided
            if "fullName" in data:
                if not data["fullName"].strip():
                    return jsonify({"error": "Full name cannot be empty"}), 400
                update_data["full_name"] = data["fullName"].strip()
            
            if "position" in data:
                if not data["position"].strip():
                    return jsonify({"error": "Position cannot be empty"}), 400
                update_data["position"] = data["position"].strip()
            
            if "phone" in data:
                is_valid, phone_or_error = validate_phone(data["phone"])
                if not is_valid:
                    return jsonify({"error": phone_or_error}), 400
                update_data["phone"] = phone_or_error
            
            if "email" in data:
                is_valid, email_or_error = validate_email(data["email"])
                if not is_valid:
                    return jsonify({"error": email_or_error}), 400
                update_data["email"] = email_or_error
            
            # Optional fields
            if "school" in data:
                update_data["school"] = data["school"].strip() if data["school"] else ""
            
            if "yearOfStudy" in data:
                update_data["year_of_study"] = data["yearOfStudy"].strip() if data["yearOfStudy"] else ""
            
            if not update_data:
                return jsonify({"error": "No valid fields to update"}), 400
            
            # Build update query
            set_clauses = []
            values = []
            
            for field, value in update_data.items():
                set_clauses.append(f"{field} = ?")
                values.append(value)
            
            set_clauses.append("updated_at = CURRENT_TIMESTAMP")
            values.append(leader_id)
            
            query = f"UPDATE leaders SET {', '.join(set_clauses)} WHERE id = ?"
            
            # Execute update
            conn.execute(query, values)
            conn.commit()
            
        response = jsonify({
            "message": "Leader updated successfully",
            "leader_id": leader_id
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except sqlite3.Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Update failed: {str(e)}"}), 500

@leader_bp.route("/api/leaders/update-chosen/<int:leader_id>", methods=["PUT", "OPTIONS"])
def update_chosen_leader(leader_id):
    """Update an approved leader's information in the chosen_leaders table"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "PUT, OPTIONS")
        return response, 200

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        with get_db_connection() as conn:
            # Check if leader exists in chosen_leaders table
            row = conn.execute(
                "SELECT * FROM chosen_leaders WHERE original_leader_id = ?",
                (leader_id,)
            ).fetchone()
            
            if not row:
                return jsonify({"error": "Approved leader not found"}), 404
            
            # Validate and prepare update data
            update_data = {}
            
            # Validate required fields if provided
            if "fullName" in data:
                if not data["fullName"].strip():
                    return jsonify({"error": "Full name cannot be empty"}), 400
                update_data["full_name"] = data["fullName"].strip()
            
            if "position" in data:
                if not data["position"].strip():
                    return jsonify({"error": "Position cannot be empty"}), 400
                update_data["position"] = data["position"].strip()
            
            if "phone" in data:
                is_valid, phone_or_error = validate_phone(data["phone"])
                if not is_valid:
                    return jsonify({"error": phone_or_error}), 400
                update_data["phone"] = phone_or_error
            
            if "email" in data:
                is_valid, email_or_error = validate_email(data["email"])
                if not is_valid:
                    return jsonify({"error": email_or_error}), 400
                update_data["email"] = email_or_error
            
            # Optional fields
            if "school" in data:
                update_data["school"] = data["school"].strip() if data["school"] else ""
            
            if "yearOfStudy" in data:
                update_data["year_of_study"] = data["yearOfStudy"].strip() if data["yearOfStudy"] else ""
            
            if not update_data:
                return jsonify({"error": "No valid fields to update"}), 400
            
            # Build update query for chosen_leaders
            set_clauses = []
            values = []
            
            for field, value in update_data.items():
                set_clauses.append(f"{field} = ?")
                values.append(value)
            
            set_clauses.append("updated_at = CURRENT_TIMESTAMP")
            values.append(leader_id)
            
            query = f"UPDATE chosen_leaders SET {', '.join(set_clauses)} WHERE original_leader_id = ?"
            
            # Execute update
            conn.execute(query, values)
            
            # Also update the original leaders table to keep them in sync
            original_set_clauses = []
            original_values = []
            
            for field, value in update_data.items():
                original_set_clauses.append(f"{field} = ?")
                original_values.append(value)
            
            original_set_clauses.append("updated_at = CURRENT_TIMESTAMP")
            original_values.append(leader_id)
            
            original_query = f"UPDATE leaders SET {', '.join(original_set_clauses)} WHERE id = ?"
            conn.execute(original_query, original_values)
            
            conn.commit()
            
        response = jsonify({
            "message": "Approved leader updated successfully",
            "leader_id": leader_id
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except sqlite3.Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Update failed: {str(e)}"}), 500

@leader_bp.route("/api/leaders/debug", methods=["GET"])
def debug_leaders():
    """Debug endpoint to see all tables"""
    try:
        with get_db_connection() as conn:
            pending_leaders = conn.execute("SELECT id, reg_number, full_name, status FROM leaders").fetchall()
            chosen_leaders = conn.execute("SELECT id, original_leader_id, reg_number, full_name, approved_at FROM chosen_leaders").fetchall()
            
            response = jsonify({
                "database": os.path.abspath("garissa_voting.db"),
                "pending_leaders": [dict(leader) for leader in pending_leaders],
                "chosen_leaders": [dict(leader) for leader in chosen_leaders]
            })
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@leader_bp.route("/api/leaders/chosen-login", methods=["POST"])
def chosen_leaders_login():
    """Login for leaders who have been approved and moved to chosen_leaders table"""
    data = request.get_json()
    
    if not data or 'registrationNumber' not in data or 'password' not in data:
        return jsonify({"error": "Registration number and password required"}), 400
    
    try:
        with get_db_connection() as conn:
            # Check if leader exists in chosen_leaders table
            leader = conn.execute(
                "SELECT * FROM chosen_leaders WHERE reg_number = ?",
                (data['registrationNumber'],)
            ).fetchone()
            
            if not leader:
                return jsonify({"error": "Leader not found"}), 404
            
            # Verify password (you should use proper password hashing)
            if leader['password'] != data['password']:
                return jsonify({"error": "Wrong password"}), 401
            
            # Return leader data
            leader_data = {
                "id": leader['id'],
                "fullName": leader['full_name'],
                "regNumber": leader['reg_number'],
                "school": leader['school'],
                "position": leader['position'],
                "phone": leader['phone'],
                "email": leader['email'],
                "yearOfStudy": leader['year_of_study'],
                "is_approved": True
            }
            
            # Generate token (you should use proper JWT implementation)
            token = f"chosen_leader_{leader['id']}"
            
            return jsonify({
                "message": "Login successful",
                "token": token,
                "leader": leader_data
            }), 200
            
    except Exception as e:
        return jsonify({"error": f"Login failed: {str(e)}"}), 500
    
@leader_bp.route("/api/leaders/by-position/<position>", methods=["GET"])
def get_leaders_by_position(position):
    """Get all approved leaders for a specific position"""
    try:
        with get_db_connection() as conn:
            # Get from chosen_leaders table (approved leaders)
            rows = conn.execute(
                "SELECT * FROM chosen_leaders WHERE position = ? ORDER BY full_name",
                (position,)
            ).fetchall()
            
        # Format response
        leaders = []
        for row in rows:
            leader = dict(row)
            leaders.append({
                "id": leader["id"],
                "fullName": leader["full_name"],
                "regNumber": leader["reg_number"]
            })
        
        response = jsonify({"leaders": leaders})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch leaders: {str(e)}"}), 500

# Export the blueprint
__all__ = ['leader_bp']