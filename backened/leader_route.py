from flask import Blueprint, request, jsonify
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
from contextlib import contextmanager
import re
from werkzeug.utils import secure_filename
from flask import send_file
import io


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
DB_PATH = os.path.join(os.getcwd(), "garissa_voting.db")

# Database context manager
@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
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

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def normalize_position_name(position):
    """Normalize position names to handle variations consistently"""
    if not position:
        return position
    
    position_lower = position.lower().strip()
    
    # Handle Sports and Entertainment Director variations
    if 'sport' in position_lower and 'entertainment' in position_lower and 'director' in position_lower:
        return 'Sports and Entertainment Director'
    
    # Handle other potential variations
    variations = {
        'chairperson': 'ChairPerson',
        'vice chairperson': 'Vice ChairPerson', 
        'vice-chairperson': 'Vice ChairPerson',
        'secretary general': 'Secretary General',
        'finance secretary': 'Finance Secretary',
        'academic director': 'Academic Director',
        'welfare director': 'Welfare Director'
    }
    
    for variation, standard in variations.items():
        if variation in position_lower:
            return standard
    
    # Return original if no variations matched
    return position

def init_db():
    with get_db_connection() as conn:
        # Check if leaders table exists and get its structure
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(leaders)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add missing photo columns if they don't exist
        if 'photo' not in columns:
            conn.execute('ALTER TABLE leaders ADD COLUMN photo BLOB')
            print("Added 'photo' column to leaders table")
        
        if 'photo_filename' not in columns:
            conn.execute('ALTER TABLE leaders ADD COLUMN photo_filename TEXT')
            print("Added 'photo_filename' column to leaders table")
        
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
                    is_approved BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
 
        
        # Create chosen_leaders table
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
                year_of_study TEXT,
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
        conn.execute('CREATE INDEX IF NOT EXISTS idx_leaders_is_approved ON leaders(is_approved)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_chosen_leaders_reg_number ON chosen_leaders(reg_number)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_chosen_leaders_email ON chosen_leaders(email)')
        
        # Clean up existing position name variations
        try:
            conn.execute(
                "UPDATE leaders SET position = ? WHERE position LIKE ?",
                ('Sports and Entertainment Director', '%Sport%Entertainment%Director%')
            )
            conn.execute(
                "UPDATE chosen_leaders SET position = ? WHERE position LIKE ?",
                ('Sports and Entertainment Director', '%Sport%Entertainment%Director%')
            )
            print("Cleaned up position name variations in database")
        except Exception as e:
            print(f"Note: Could not clean up position names: {e}")
        
        conn.commit()
        print("Database initialization completed successfully!")

# Initialize database
init_db()

@leader_bp.route("/api/leaders/register", methods=["POST", "OPTIONS"])
def register_leader():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
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

        # Normalize position name to handle variations
        normalized_position = normalize_position_name(data["position"])
        print(f"Original position: {data['position']}, Normalized: {normalized_position}")

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO leaders (full_name, reg_number, school, position, phone, email, 
                                   year_of_study, password, status, is_approved)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
                ''',
                (
                    str(data["fullName"]).strip(),
                    str(data["regNumber"]).strip().upper(),
                    str(data.get("school", "")).strip(),
                    normalized_position,  # Use normalized position
                    phone,
                    email,
                    str(data.get("yearOfStudy", "")).strip(),
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


@leader_bp.route('/api/leaders/upload-photo', methods=['POST', 'OPTIONS'])
def upload_leader_photo():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        return response, 200

    try:
        leader_id = request.form.get('leader_id')
        photo = request.files.get('photo')
        
        print(f"Photo upload request - Leader ID: {leader_id}, File: {photo}")
        
        if not leader_id:
            return jsonify({'error': 'Leader ID is required'}), 400
        if not photo:
            return jsonify({'error': 'Photo file is required'}), 400
        
        # Validate file
        if not allowed_file(photo.filename):
            return jsonify({'error': 'Invalid file type. Only PNG, JPG, JPEG allowed'}), 400
        
        # Check file size (5MB max)
        photo.seek(0, 2)  # Seek to end to get file size
        file_size = photo.tell()
        photo.seek(0)  # Reset seek position
        if file_size > 5 * 1024 * 1024:
            return jsonify({'error': 'File size too large. Maximum 5MB allowed'}), 400
        
        # Read photo data
        photo_filename = secure_filename(photo.filename)
        photo_data = photo.read()
        
        print(f"Updating photo for leader {leader_id}, filename: {photo_filename}, size: {len(photo_data)} bytes")
        
        # Update leader record with photo
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Check if leader exists
            cursor.execute('SELECT id FROM leaders WHERE id = ?', (leader_id,))
            if not cursor.fetchone():
                return jsonify({'error': 'Leader not found'}), 404
            
            # Update photo AND set photo_url for future approval
            photo_url = f"/api/leaders/photo/{leader_id}"
            cursor.execute('''
                UPDATE leaders 
                SET photo = ?, photo_filename = ?, photo_url = ?
                WHERE id = ?
            ''', (photo_data, photo_filename, photo_url, leader_id))
            
            conn.commit()
        
        print(f"Photo uploaded successfully for leader {leader_id}")
        return jsonify({'message': 'Photo uploaded successfully'}), 200
        
    except Exception as e:
        print(f"Photo upload error: {str(e)}")
        return jsonify({'error': f'Photo upload failed: {str(e)}'}), 500


@leader_bp.route('/api/leaders/photo/<int:leader_id>')
def get_leader_photo(leader_id):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Allow both approved and pending leaders to have photos
            cursor.execute('''
                SELECT photo FROM leaders WHERE id = ?
            ''', (leader_id,))
            
            result = cursor.fetchone()
            
            if not result or not result[0]:
                return jsonify({'error': 'Photo not found'}), 404
            
            photo_data = result[0]
            
            return send_file(
                io.BytesIO(photo_data),
                mimetype='image/jpeg',
                as_attachment=False
            )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@leader_bp.route("/api/leaders/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
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
                "SELECT * FROM leaders WHERE reg_number = ? COLLATE NOCASE AND is_approved = 1",
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

@leader_bp.route("/api/leaders/profile", methods=["GET", "OPTIONS"])
def get_profile():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
        return response, 200

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

@leader_bp.route("/api/leaders/pending", methods=["GET", "OPTIONS"])
def get_pending_leaders():
    """Get all pending leaders for admin approval"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
        return response, 200

    try:
        with get_db_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM leaders WHERE is_approved = 0 ORDER BY created_at DESC"
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
                "is_approved": bool(leader["is_approved"]),
                "created_at": leader["created_at"],
                "updated_at": leader["updated_at"]
            })
        
        response = jsonify({"leaders": leaders})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch pending leaders: {str(e)}"}), 500

@leader_bp.route("/api/leaders/update/<int:leader_id>", methods=["PUT", "OPTIONS"])
def update_leader(leader_id):
    """Update leader information"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "PUT, OPTIONS")
        return response, 200

    data = request.get_json()

    if not data:
        response = jsonify({"error": "No data received"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 400

    try:
        # Validate phone number if provided
        if data.get("phone"):
            is_valid, phone_or_error = validate_phone(data["phone"])
            if not is_valid:
                response = jsonify({"error": phone_or_error})
                response.headers.add("Access-Control-Allow-Origin", "*")
                return response, 400
            phone = phone_or_error
        else:
            phone = None

        # Validate email if provided
        if data.get("email"):
            is_valid, email_or_error = validate_email(data["email"])
            if not is_valid:
                response = jsonify({"error": email_or_error})
                response.headers.add("Access-Control-Allow-Origin", "*")
                return response, 400
            email = email_or_error
        else:
            email = ""

        with get_db_connection() as conn:
            # Check if leader exists
            row = conn.execute(
                "SELECT * FROM leaders WHERE id = ?",
                (leader_id,)
            ).fetchone()
            
            if not row:
                response = jsonify({"error": "Leader not found"})
                response.headers.add("Access-Control-Allow-Origin", "*")
                return response, 404

            # Update leader information
            conn.execute(
                '''
                UPDATE leaders 
                SET full_name = ?, school = ?, position = ?, phone = ?, 
                    email = ?, year_of_study = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                ''',
                (
                    str(data.get("fullName", "")).strip(),
                    str(data.get("school", "")).strip(),
                    str(data.get("position", "")).strip(),
                    phone or str(data.get("phone", "")).strip(),
                    email,
                    str(data.get("yearOfStudy", "")).strip(),
                    leader_id
                )
            )

            # If leader is approved, also update chosen_leaders table
            if row["is_approved"] == 1:
                conn.execute(
                    '''
                    UPDATE chosen_leaders 
                    SET full_name = ?, school = ?, position = ?, phone = ?, 
                        email = ?, year_of_study = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE original_leader_id = ?
                    ''',
                    (
                        str(data.get("fullName", "")).strip(),
                        str(data.get("school", "")).strip(),
                        str(data.get("position", "")).strip(),
                        phone or str(data.get("phone", "")).strip(),
                        email,
                        str(data.get("yearOfStudy", "")).strip(),
                        leader_id
                    )
                )

            conn.commit()

        response = jsonify({
            "message": "Leader updated successfully",
            "leader_id": leader_id
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200

    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint failed: leaders.reg_number" in str(e):
            response = jsonify({"error": "Registration number already exists"})
        else:
            response = jsonify({"error": "Database integrity error"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 400
    except Exception as e:
        response = jsonify({"error": f"Update failed: {str(e)}"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500

@leader_bp.route("/api/leaders/approve/<int:leader_id>", methods=["POST", "OPTIONS"])
def approve_leader(leader_id):
    """Approve a leader and move them to chosen_leaders table"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        return response, 200

    try:
        with get_db_connection() as conn:
            # Begin transaction
            cursor = conn.cursor()
            
            # Get leader details
            row = cursor.execute(
                "SELECT * FROM leaders WHERE id = ?",
                (leader_id,)
            ).fetchone()
            
            if not row:
                response = jsonify({"error": "Leader not found"})
                response.headers.add("Access-Control-Allow-Origin", "*")
                return response, 404
                
            leader = dict(row)
            
            # Check if already approved
            if leader["is_approved"] == 1:
                response = jsonify({
                    "message": "Leader is already approved",
                    "already_approved": True
                })
                response.headers.add("Access-Control-Allow-Origin", "*")
                return response, 200
            
            # Check for duplicates in chosen_leaders
            existing = cursor.execute(
                "SELECT id FROM chosen_leaders WHERE reg_number = ?",
                (leader["reg_number"],)
            ).fetchone()
            
            if existing:
                # Update approval status without inserting duplicate
                cursor.execute(
                    "UPDATE leaders SET status = 'approved', is_approved = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (leader_id,)
                )
                conn.commit()
                
                response = jsonify({
                    "message": "Leader approval status updated (already in chosen_leaders)",
                    "leader_id": leader_id
                })
                response.headers.add("Access-Control-Allow-Origin", "*")
                return response, 200
            
            # Use the original school name
            school_name = leader["school"] if leader["school"] else "School of Education Science"
            
            # Generate proper photo_url - use the one from leaders table or create default
            photo_url = leader["photo_url"] if leader["photo_url"] else f"/api/leaders/photo/{leader_id}"
            
            # Update the original leader record with approval status and ensure photo_url is set
            cursor.execute(
                "UPDATE leaders SET status = 'approved', is_approved = 1, photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (photo_url, leader_id)
            )
            
            # Insert into chosen_leaders with correct photo_url
            cursor.execute(
                '''
                INSERT INTO chosen_leaders (
                    original_leader_id, full_name, reg_number, school, 
                    position, phone, email, year_of_study, photo_url, password
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    leader["id"],
                    leader["full_name"],
                    leader["reg_number"],
                    school_name,
                    leader["position"],  # This will be the normalized position
                    leader["phone"],
                    leader["email"],
                    leader["year_of_study"],
                    photo_url,
                    leader["password"]
                )
            )
            
            conn.commit()
            print(f"Leader {leader_id} approved with school: {school_name} and photo_url: {photo_url}")
            
        response = jsonify({
            "message": "Leader approved successfully",
            "leader_id": leader_id,
            "reg_number": leader["reg_number"]
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except sqlite3.IntegrityError as e:
        print(f"Integrity error: {e}")
        # Try to just update the approval status
        try:
            with get_db_connection() as conn:
                conn.execute(
                    "UPDATE leaders SET status = 'approved', is_approved = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (leader_id,)
                )
                conn.commit()
                
            response = jsonify({
                "message": "Leader approval status updated",
                "leader_id": leader_id
            })
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 200
        except Exception as inner_error:
            response = jsonify({"error": f"Failed to update approval status: {str(inner_error)}"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400
            
    except Exception as e:
        print(f"Approval error: {e}")
        response = jsonify({"error": f"Approval failed: {str(e)}"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500

@leader_bp.route("/api/leaders/reject/<int:leader_id>", methods=["POST", "OPTIONS"])
def reject_leader(leader_id):
    """Reject a leader application"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        return response, 200

    try:
        with get_db_connection() as conn:
            # Check if leader exists and is pending
            row = conn.execute(
                "SELECT * FROM leaders WHERE id = ?",
                (leader_id,)
            ).fetchone()
            
            if not row:
                response = jsonify({"error": "Leader not found"})
                response.headers.add("Access-Control-Allow-Origin", "*")
                return response, 404
                
            leader = dict(row)
            
            # Update status to rejected (don't delete, keep for records)
            conn.execute(
                "UPDATE leaders SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (leader_id,)
            )
            
            # If they were approved, remove from chosen_leaders
            if leader["is_approved"] == 1:
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
        response = jsonify({"error": f"Rejection failed: {str(e)}"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500

@leader_bp.route("/api/leaders/chosen", methods=["GET", "OPTIONS"])
def get_chosen_leaders():
    """Get all approved/chosen leaders"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
        return response, 200

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

@leader_bp.route("/api/leaders", methods=["GET", "OPTIONS"])
def get_all_leaders():
    """Get all leaders from original table (for admin overview)"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
        return response, 200

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
                "is_approved": bool(leader["is_approved"]),
                "created_at": leader["created_at"],
                "updated_at": leader["updated_at"]
            })
        
        response = jsonify({"leaders": leaders})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        response = jsonify({"error": f"Failed to fetch leaders: {str(e)}"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500

@leader_bp.route("/api/leaders/by-position/<position>", methods=["GET", "OPTIONS"])
def get_leaders_by_position(position):
    """Get all approved leaders for a specific position"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
        return response, 200

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
                "regNumber": leader["reg_number"],
                "school": leader["school"],
                "position": leader["position"],
                "phone": leader["phone"],
                "email": leader["email"],
                "yearOfStudy": leader["year_of_study"],
                "photoUrl": leader["photo_url"]
            })
        
        response = jsonify({"candidates": leaders})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        response = jsonify({"error": f"Failed to fetch leaders: {str(e)}"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500

@leader_bp.route("/api/leaders/approved", methods=["GET", "OPTIONS"])
def get_approved_leaders():
    """Get all approved leaders from chosen_leaders table"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
        return response, 200

    try:
        with get_db_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM chosen_leaders ORDER BY position, full_name"
            ).fetchall()
            
        # Format response
        leaders = []
        for row in rows:
            leader = dict(row)
            leaders.append({
                "id": leader["id"],
                "original_leader_id": leader["original_leader_id"],  # ADDED: For photo access
                "fullName": leader["full_name"],
                "regNumber": leader["reg_number"],
                "school": leader["school"],
                "position": leader["position"],
                "phone": leader["phone"],
                "email": leader["email"],
                "yearOfStudy": leader["year_of_study"],
                "photoUrl": f"/api/leaders/photo/{leader['original_leader_id']}"  # FIXED: Use original_leader_id for photos
            })
        
        response = jsonify({"candidates": leaders})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        response = jsonify({"error": f"Failed to fetch approved leaders: {str(e)}"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500

@leader_bp.route("/api/leaders/debug", methods=["GET", "OPTIONS"])
def debug_leaders():
    """Debug endpoint to see all tables"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, OPTIONS")
        return response, 200

    try:
        with get_db_connection() as conn:
            pending_leaders = conn.execute("SELECT id, reg_number, full_name, position, status, is_approved, photo_url FROM leaders").fetchall()
            chosen_leaders = conn.execute("SELECT id, original_leader_id, reg_number, full_name, position, photo_url, approved_at FROM chosen_leaders").fetchall()
            
            response = jsonify({
                "database": os.path.abspath("garissa_voting.db"),
                "pending_leaders": [dict(leader) for leader in pending_leaders],
                "chosen_leaders": [dict(leader) for leader in chosen_leaders]
            })
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 200
    except Exception as e:
        response = jsonify({"error": str(e)})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500

# Export the blueprint
__all__ = ['leader_bp']