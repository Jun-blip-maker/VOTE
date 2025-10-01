from flask import Blueprint, request, jsonify
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import jwt
import datetime
from contextlib import contextmanager
import os
from flask_cors import CORS

delegate_bp = Blueprint('delegate', __name__)

CORS(delegate_bp)

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
                position TEXT DEFAULT 'Delegate',
                votes INTEGER DEFAULT 0,
                FOREIGN KEY (delegate_id) REFERENCES delegates (id)
            )
        ''')
        # Create votes table with user_type
        conn.execute('''
            CREATE TABLE IF NOT EXISTS votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                voter_id INTEGER NOT NULL,
                user_type TEXT NOT NULL,  -- 'student', 'delegate', or 'leader'
                candidate_id INTEGER NOT NULL,
                voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ENSURE all required columns exist in candidates table
        cursor = conn.execute("PRAGMA table_info(candidates)")
        columns = [column['name'] for column in cursor.fetchall()]
        
        if 'position' not in columns:
            conn.execute("ALTER TABLE candidates ADD COLUMN position TEXT DEFAULT 'Delegate'")
            print("Added position column to candidates table")
        
        if 'votes' not in columns:
            conn.execute("ALTER TABLE candidates ADD COLUMN votes INTEGER DEFAULT 0")
            print("Added votes column to candidates table")
            
        if 'faculty' not in columns:
            conn.execute("ALTER TABLE candidates ADD COLUMN faculty TEXT")
            print("Added faculty column to candidates table")
        
        conn.commit()

# Initialize database
init_delegate_db()

def map_faculty_name(faculty):
    """Map various faculty names to consistent frontend format"""
    if not faculty:
        return "Unknown"
    
    faculty = faculty.strip()
    mapping = {
        "business": "School of Business and Economics",
        "science": "School of Pure and Applied Science",
        "arts": "School of Education Art", 
        "education": "School of Education Science",
        "school of business": "School of Business and Economics",
        "school of science": "School of Pure and Applied Science",
        "school of arts": "School of Education Art",
        "school of education": "School of Education Science",
    }
    
    lower_faculty = faculty.lower()
    for key, value in mapping.items():
        if key in lower_faculty:
            return value
    
    return faculty  # Return original if no mapping found

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
            # UPDATED: Added ORDER BY created_at DESC to show most recent first
            rows = conn.execute(
                "SELECT id, public_id, full_name, email, phone, registration_number, faculty, year_of_study, is_approved, created_at FROM delegates WHERE full_name != 'Voter' ORDER BY created_at DESC"
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

# FIXED: NEW CANDIDATES ENDPOINT - This is what your frontend needs
@delegate_bp.route("/api/candidates", methods=["GET"])
def get_candidates():
    """Get all approved candidates for voting"""
    try:
        with get_db_connection() as conn:
            # Check which columns exist
            cursor = conn.execute("PRAGMA table_info(candidates)")
            columns = [column['name'] for column in cursor.fetchall()]
            
            # Build query based on available columns
            select_fields = ["c.id", "c.full_name", "c.registration_number", "c.faculty"]
            
            if 'position' in columns:
                select_fields.append("c.position")
            else:
                select_fields.append("'Delegate' as position")
                
            if 'votes' in columns:
                select_fields.append("c.votes")
            else:
                select_fields.append("0 as votes")
            
            query = f"""
                SELECT {', '.join(select_fields)}
                FROM candidates c
                JOIN delegates d ON c.delegate_id = d.id
                WHERE d.is_approved = 1 AND d.is_active = 1
                ORDER BY c.full_name
            """
            
            rows = conn.execute(query).fetchall()
            candidates = []
            
            for row in rows:
                candidate = dict(row)
                candidates.append({
                    "id": candidate["id"],
                    "full_name": candidate["full_name"],
                    "registration_number": candidate["registration_number"],
                    "faculty": candidate["faculty"],
                    "position": candidate.get("position", "Delegate"),
                    "votes": candidate.get("votes", 0)
                })
            
            print(f"Returning {len(candidates)} approved candidates")
            for candidate in candidates:
                print(f"Candidate: {candidate['full_name']} - Faculty: {candidate['faculty']}")
                
            return jsonify(candidates)
            
    except Exception as e:
        print(f"Error in get_candidates: {e}")
        return jsonify({"error": str(e)}), 500

# FIXED: Vote endpoint - Check all user tables
@delegate_bp.route("/api/vote", methods=["POST"])
def submit_vote():
    try:
        data = request.get_json()

        if not data or not data.get("voterRegNumber") or not data.get("candidateId"):
            return jsonify({"error": "Voter registration number and candidate ID are required"}), 400

        with get_db_connection() as conn:
            clean_reg_number = str(data["voterRegNumber"]).strip().upper()

            # FIXED: Check ALL user tables for the voter
            voter_id = None
            user_type = None
            
            # 1. Check students table (general voters)
            student = conn.execute(
                "SELECT id FROM students WHERE registration_number = ?",
                [clean_reg_number]
            ).fetchone()
            if student:
                voter_id = student["id"]
                user_type = "student"
            
            # 2. Check delegates table (approved delegates can vote)
            if not voter_id:
                delegate = conn.execute(
                    "SELECT id FROM delegates WHERE registration_number = ? AND is_approved = 1",
                    [clean_reg_number]
                ).fetchone()
                if delegate:
                    voter_id = delegate["id"]
                    user_type = "delegate"
            
            # 3. Check chosen_leaders table (approved leaders can vote)
            if not voter_id:
                leader = conn.execute(
                    "SELECT id FROM chosen_leaders WHERE reg_number = ?",
                    [clean_reg_number]
                ).fetchone()
                if leader:
                    voter_id = leader["id"]
                    user_type = "leader"

            if not voter_id:
                return jsonify({"error": "Voter not found. Please register as a student, delegate, or leader first."}), 404

            # Check if this user has already voted
            existing_vote = conn.execute(
                "SELECT id FROM votes WHERE voter_id = ? AND user_type = ?",
                [voter_id, user_type]
            ).fetchone()

            if existing_vote:
                return jsonify({"error": "You have already voted"}), 400

            # Record the vote with user type
            conn.execute(
                "INSERT INTO votes (voter_id, user_type, candidate_id) VALUES (?, ?, ?)",
                [voter_id, user_type, int(data["candidateId"])]
            )

            # Update candidate vote count
            conn.execute(
                "UPDATE candidates SET votes = COALESCE(votes, 0) + 1 WHERE id = ?",
                [int(data["candidateId"])]
            )

            conn.commit()

            print(f"Vote recorded successfully for {user_type}: {clean_reg_number}")

        return jsonify({"message": "Vote recorded successfully"}), 200

    except ValueError:
        return jsonify({"error": "Invalid candidate ID format"}), 400
    except Exception as e:
        print(f"Error submitting vote: {e}")
        return jsonify({"error": str(e)}), 500

# FIXED: Voter records endpoint to show all user types
@delegate_bp.route("/api/voter-records", methods=["GET"])
def get_voter_records():
    """Get all users who voted with their voting timestamp and who they voted for"""
    try:
        with get_db_connection() as conn:
            # Get voter records - join with all user tables
            voter_records = conn.execute('''
                SELECT 
                    v.voted_at as vote_time,
                    v.user_type,
                    COALESCE(
                        s.registration_number,
                        d.registration_number, 
                        l.reg_number
                    ) as registration_number,
                    COALESCE(
                        s.full_name,
                        d.full_name, 
                        l.full_name
                    ) as voter_name,
                    COALESCE(
                        d.faculty,  -- delegates have faculty
                        l.school,   -- leaders have school  
                        'General'   -- students don't have faculty/school
                    ) as voter_faculty,
                    c.full_name as candidate_name,
                    c.faculty as candidate_faculty
                FROM votes v
                LEFT JOIN students s ON v.user_type = 'student' AND v.voter_id = s.id
                LEFT JOIN delegates d ON v.user_type = 'delegate' AND v.voter_id = d.id
                LEFT JOIN chosen_leaders l ON v.user_type = 'leader' AND v.voter_id = l.id
                JOIN candidates c ON v.candidate_id = c.id
                ORDER BY v.voted_at DESC
            ''').fetchall()
            
            records = []
            for record in voter_records:
                records.append({
                    "vote_time": record["vote_time"],
                    "user_type": record["user_type"],
                    "registration_number": record["registration_number"],
                    "voter_name": record["voter_name"],
                    "voter_faculty": record["voter_faculty"],
                    "candidate_name": record["candidate_name"],
                    "candidate_faculty": record["candidate_faculty"]
                })
            
            return jsonify({"voter_records": records}), 200
            
    except Exception as e:
        print(f"Error getting voter records: {e}")
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

# Debug candidates - FIXED: Handle missing columns
@delegate_bp.route("/api/debug/candidates", methods=["GET"])
def debug_candidates():
    """Debug endpoint to see all candidates and their faculties"""
    try:
        with get_db_connection() as conn:
            query = """
                SELECT c.id, c.full_name, c.registration_number, c.faculty, 
                       c.position, c.votes, d.is_approved
                FROM candidates c
                JOIN delegates d ON c.delegate_id = d.id
            """
            
            rows = conn.execute(query).fetchall()
            candidates = [dict(row) for row in rows]
            
        return jsonify({
            "total_candidates": len(candidates),
            "candidates": candidates,
            "approved_candidates": [c for c in candidates if c["is_approved"] == 1]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# NEW: Enhanced debug endpoint
@delegate_bp.route("/api/debug/all-data", methods=["GET"])
def debug_all_data():
    """Debug endpoint to see all data and relationships"""
    try:
        with get_db_connection() as conn:
            # Get all delegates
            delegates = [dict(row) for row in conn.execute(
                "SELECT id, full_name, registration_number, faculty, is_approved FROM delegates"
            ).fetchall()]
            
            # Get all candidates with delegate info
            candidates_query = """
                SELECT c.id, c.full_name, c.registration_number, c.faculty as candidate_faculty,
                       c.position, c.votes, d.faculty as delegate_faculty, d.is_approved
                FROM candidates c
                JOIN delegates d ON c.delegate_id = d.id
            """
            candidates = [dict(row) for row in conn.execute(candidates_query).fetchall()]
            
            # Get voting stats
            vote_count = conn.execute("SELECT COUNT(*) as count FROM votes").fetchone()["count"]
            
            return jsonify({
                "delegates_total": len(delegates),
                "delegates_approved": len([d for d in delegates if d["is_approved"] == 1]),
                "candidates_total": len(candidates),
                "candidates_from_approved_delegates": len([c for c in candidates if c["is_approved"] == 1]),
                "total_votes": vote_count,
                "delegates": delegates,
                "candidates": candidates
            })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# FIXED: Improved approve delegate function
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
                
            print(f"Approving delegate: {delegate['full_name']} from faculty: {delegate['faculty']}")
                
            # Check if candidate already exists
            existing_candidate = conn.execute(
                "SELECT id FROM candidates WHERE delegate_id = ?",
                [delegate_id]
            ).fetchone()
            
            # Create candidate if doesn't exist
            if not existing_candidate:
                # FIXED: Use faculty mapping
                faculty = delegate["faculty"].strip() if delegate["faculty"] else "Unknown"
                mapped_faculty = map_faculty_name(faculty)
                
                print(f"Original faculty: '{faculty}' -> Mapped faculty: '{mapped_faculty}'")
                
                # Insert candidate with correct faculty mapping
                conn.execute(
                    "INSERT INTO candidates (delegate_id, full_name, registration_number, faculty, position, votes) VALUES (?, ?, ?, ?, ?, ?)",
                    [delegate["id"], delegate["full_name"], delegate["registration_number"], mapped_faculty, "Delegate", 0]
                )
                
                print(f"Candidate created: {delegate['full_name']} with faculty: '{mapped_faculty}'")
            else:
                print(f"Candidate already exists for delegate {delegate['full_name']}")
            
            # Update delegate approval status
            conn.execute(
                "UPDATE delegates SET is_approved = 1 WHERE id = ?",
                [delegate_id]
            )
            
            conn.commit()
            print(f"Delegate {delegate['full_name']} approved successfully")
            
        return jsonify({"message": "Delegate approved and added as candidate successfully"}), 200
        
    except Exception as e:
        print(f"Error in approve_delegate: {e}")
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
                conn.execute("ALTER TABLE candidates ADD COLUMN position TEXT DEFAULT 'Delegate'")
            
            if 'votes' not in columns:
                print("Adding votes column to candidates table")
                conn.execute("ALTER TABLE candidates ADD COLUMN votes INTEGER DEFAULT 0")
                
            # Check if user_type column exists in votes table
            cursor = conn.execute("PRAGMA table_info(votes)")
            vote_columns = [column['name'] for column in cursor.fetchall()]
            
            if 'user_type' not in vote_columns:
                print("Adding user_type column to votes table")
                conn.execute("ALTER TABLE votes ADD COLUMN user_type TEXT DEFAULT 'delegate'")
                
            conn.commit()
            
        return jsonify({"message": "Database schema updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# NEW: Fix existing candidate faculties to match frontend
@delegate_bp.route("/api/fix-candidate-faculties", methods=["POST"])
def fix_candidate_faculties():
    """Fix existing candidates' faculty names to match frontend expectations"""
    try:
        with get_db_connection() as conn:
            # Faculty mapping
            faculty_mapping = {
                "Business": "School of Business and Economics",
                "Science": "School of Pure and Applied Science", 
                "Arts": "School of Education Art",
                "Education": "School of Education Science"
            }
            
            updated_count = 0
            
            for old_faculty, new_faculty in faculty_mapping.items():
                result = conn.execute(
                    "UPDATE candidates SET faculty = ? WHERE faculty = ?",
                    [new_faculty, old_faculty]
                )
                updated_count += result.rowcount
                
                print(f"Updated {result.rowcount} candidates from '{old_faculty}' to '{new_faculty}'")
            
            conn.commit()
            
            return jsonify({
                "message": f"Successfully updated {updated_count} candidate faculty names",
                "mapping": faculty_mapping
            }), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# NEW: Cleanup voter records from delegates table
@delegate_bp.route("/api/cleanup-voter-records", methods=["POST"])
def cleanup_voter_records():
    """Remove voter records that were incorrectly created in delegates table"""
    try:
        with get_db_connection() as conn:
            # Delete records that were created by the old vote endpoint logic
            result = conn.execute(
                "DELETE FROM delegates WHERE full_name = 'Voter'"
            )
            
            deleted_count = result.rowcount
            conn.commit()
            
            return jsonify({
                "message": f"Successfully removed {deleted_count} incorrectly created voter records from delegates table"
            }), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# NEW: Migrate existing votes to include user_type
@delegate_bp.route("/api/migrate-existing-votes", methods=["POST"])
def migrate_existing_votes():
    """Migrate existing votes to include user_type"""
    try:
        with get_db_connection() as conn:
            # For existing votes, determine user_type based on which table the voter_id comes from
            # This assumes existing votes are from delegates (for backward compatibility)
            conn.execute('''
                UPDATE votes 
                SET user_type = 'delegate'
                WHERE user_type IS NULL
            ''')
            
            conn.commit()
            
            return jsonify({"message": "Existing votes migrated to include user_type"}), 200
            
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

# NEW: Test faculty mapping endpoint
@delegate_bp.route("/api/test-faculty-mapping", methods=["GET"])
def test_faculty_mapping():
    """Test endpoint to check faculty mapping"""
    test_cases = [
        "business",
        "Science", 
        "Arts",
        "Education",
        "School of Business",
        "school of science",
        "unknown faculty"
    ]
    
    results = {}
    for faculty in test_cases:
        results[faculty] = map_faculty_name(faculty)
    
    return jsonify(results), 200

# NEW: Get voting statistics
@delegate_bp.route("/api/voting-stats", methods=["GET"])
def get_voting_stats():
    """Get voting statistics by user type"""
    try:
        with get_db_connection() as conn:
            stats = conn.execute('''
                SELECT 
                    user_type,
                    COUNT(*) as vote_count
                FROM votes 
                GROUP BY user_type
                ORDER BY vote_count DESC
            ''').fetchall()
            
            total_votes = conn.execute("SELECT COUNT(*) as count FROM votes").fetchone()["count"]
            
            stats_data = [{"user_type": row["user_type"], "vote_count": row["vote_count"]} for row in stats]
            
            return jsonify({
                "total_votes": total_votes,
                "stats_by_user_type": stats_data
            }), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

