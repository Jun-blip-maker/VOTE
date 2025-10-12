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
        # Create voter_records table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS voter_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                registration_number TEXT UNIQUE NOT NULL,
                vote_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes
        conn.execute('CREATE INDEX IF NOT EXISTS idx_voter_records_reg_number ON voter_records(registration_number)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_voter_records_time ON voter_records(vote_time)')
        
        conn.commit()

# Initialize database
init_delegate_db()

def map_faculty_name(faculty):
    """Map various faculty names to consistent frontend format"""
    if not faculty:
        return "Unknown"
    
    faculty = faculty.strip()
    
    mapping = {
        "Business And Economics": "School of Business and Economics",
        "Pure and Applied Science": "School of Pure and Applied Science",
        "Education Arts": "School of Education Arts",
        "Education Sciences": "School of Education Sciences",
        "Business and Economics": "School of Business and Economics",
        "Business": "School of Business and Economics",
        "Science": "School of Pure and Applied Science",
        "Pure and Applied Sciences": "School of Pure and Applied Science",
        "Education Art": "School of Education Arts",
        "Education Science": "School of Education Sciences",
        "Arts": "School of Education Arts",
        "Education": "School of Education Sciences",
        "School of Business and Economics": "School of Business and Economics",
        "School of Pure and Applied Science": "School of Pure and Applied Science",
        "School of Education Art": "School of Education Arts",
        "School of Education Science": "School of Education Sciences",
    }
    
    if faculty in mapping:
        return mapping[faculty]
    
    faculty_lower = faculty.lower()
    for key, value in mapping.items():
        if key.lower() in faculty_lower or faculty_lower in key.lower():
            return value
    
    if "business" in faculty_lower or "economic" in faculty_lower:
        return "School of Business and Economics"
    elif "pure" in faculty_lower and "applied" in faculty_lower and "science" in faculty_lower:
        return "School of Pure and Applied Science"
    elif "education" in faculty_lower and "art" in faculty_lower:
        return "School of Education Arts"
    elif "education" in faculty_lower and "science" in faculty_lower:
        return "School of Education Sciences"
    elif "art" in faculty_lower:
        return "School of Education Arts"
    elif "science" in faculty_lower and "education" not in faculty_lower:
        return "School of Pure and Applied Science"
    
    return faculty

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

            faculty = str(data["faculty"]).strip()
            print(f"Registering delegate with faculty: '{faculty}'")

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
                    faculty,
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

# Get approved candidates for voting
@delegate_bp.route("/api/candidates", methods=["GET"])
def get_candidates():
    """Get all approved candidates for voting"""
    try:
        with get_db_connection() as conn:
            query = """
                SELECT c.id, c.full_name, c.registration_number, c.faculty, 
                       c.position, c.votes
                FROM candidates c
                JOIN delegates d ON c.delegate_id = d.id
                WHERE d.is_approved = 1 AND d.is_active = 1
                ORDER BY c.votes DESC
            """
            
            rows = conn.execute(query).fetchall()
            candidates = []
            
            for row in rows:
                candidate = dict(row)
                original_faculty = candidate["faculty"]
                mapped_faculty = map_faculty_name(original_faculty)
                
                candidates.append({
                    "id": candidate["id"],
                    "full_name": candidate["full_name"],
                    "registration_number": candidate["registration_number"],
                    "faculty": mapped_faculty,
                    "original_faculty": original_faculty,
                    "position": candidate.get("position", "Delegate"),
                    "votes": candidate.get("votes", 0)
                })
            
            print(f"Returning {len(candidates)} approved candidates")
            return jsonify(candidates)
            
    except Exception as e:
        print(f"Error in get_candidates: {e}")
        return jsonify({"error": str(e)}), 500

# Get results endpoint
@delegate_bp.route("/api/results", methods=["GET"])
def get_results():
    """Get voting results with mapped faculties"""
    try:
        with get_db_connection() as conn:
            query = """
                SELECT c.id, c.full_name, c.registration_number, c.faculty, 
                       c.position, c.votes
                FROM candidates c
                ORDER BY COALESCE(votes, 0) DESC
            """
            
            rows = conn.execute(query).fetchall()
            results = []
            
            for row in rows:
                candidate = dict(row)
                original_faculty = candidate["faculty"]
                mapped_faculty = map_faculty_name(original_faculty)
                
                results.append({
                    "id": candidate["id"],
                    "full_name": candidate["full_name"],
                    "registration_number": candidate["registration_number"],
                    "faculty": mapped_faculty,
                    "original_faculty": original_faculty,
                    "position": candidate.get("position"),
                    "votes": candidate.get("votes", 0)
                })
                
            print(f"Returning {len(results)} candidates for results")
            return jsonify(results)
            
    except Exception as e:
        print(f"Error in get_results: {e}")
        return jsonify({"error": str(e)}), 500

# Vote endpoint - PERFECTLY WORKING VERSION
@delegate_bp.route("/api/vote", methods=["POST"])
def submit_vote():
    try:
        data = request.get_json()
        print(f"Vote request received: {data}")

        if not data or not data.get("voterRegNumber") or not data.get("candidateId"):
            return jsonify({"error": "Voter registration number and candidate ID are required"}), 400

        with get_db_connection() as conn:
            clean_reg_number = str(data["voterRegNumber"]).strip().upper()
            candidate_id = int(data["candidateId"])
            print(f"Looking for voter: {clean_reg_number}, voting for candidate: {candidate_id}")

            voter_id = None
            user_type = None
            voter_name = None
            
            # Check students table
            try:
                student = conn.execute(
                    "SELECT id, full_name FROM students WHERE registration_number = ?",
                    [clean_reg_number]
                ).fetchone()
                if student:
                    voter_id = student["id"]
                    voter_name = student["full_name"]
                    user_type = "student"
                    print(f"✅ Found student: {clean_reg_number} - {voter_name}")
            except Exception as e:
                print(f"⚠️  Students table error: {e}")

            # Check delegates table
            if not voter_id:
                try:
                    delegate = conn.execute(
                        "SELECT id, full_name FROM delegates WHERE registration_number = ? AND is_approved = 1",
                        [clean_reg_number]
                    ).fetchone()
                    if delegate:
                        voter_id = delegate["id"]
                        voter_name = delegate["full_name"]
                        user_type = "delegate"
                        print(f"✅ Found delegate: {clean_reg_number} - {voter_name}")
                except Exception as e:
                    print(f"⚠️  Delegates table error: {e}")

            # Check chosen_leaders table
            if not voter_id:
                try:
                    leader = conn.execute(
                        "SELECT id, full_name FROM chosen_leaders WHERE reg_number = ?",
                        [clean_reg_number]
                    ).fetchone()
                    if leader:
                        voter_id = leader["id"]
                        voter_name = leader["full_name"]
                        user_type = "leader"
                        print(f"✅ Found leader: {clean_reg_number} - {voter_name}")
                except Exception as e:
                    print(f"⚠️  Leaders table error: {e}")

            if not voter_id:
                error_msg = "Voter not found. Please ensure you are registered in the system."
                print(f"❌ {error_msg}")
                return jsonify({"error": error_msg}), 404

            # Check if voter has already voted
            try:
                existing_voter_record = conn.execute(
                    "SELECT id FROM voter_records WHERE registration_number = ?",
                    [clean_reg_number]
                ).fetchone()
                
                if existing_voter_record:
                    error_msg = "You have already voted. Each voter can only vote once."
                    print(f"❌ {error_msg}")
                    return jsonify({"error": error_msg}), 400
            except Exception as e:
                print(f"⚠️  Voter records table check failed: {e}")

            # Check votes table for existing vote
            cursor = conn.execute("PRAGMA table_info(votes)")
            columns = [column['name'] for column in cursor.fetchall()]
            has_user_type = 'user_type' in columns
            
            if not has_user_type:
                existing_vote = conn.execute(
                    "SELECT id FROM votes WHERE voter_id = ?",
                    [voter_id]
                ).fetchone()
            else:
                existing_vote = conn.execute(
                    "SELECT id FROM votes WHERE voter_id = ? AND user_type = ?",
                    [voter_id, user_type]
                ).fetchone()

            if existing_vote:
                error_msg = "You have already voted. Each voter can only vote once."
                print(f"❌ {error_msg}")
                return jsonify({"error": error_msg}), 400

            # Create voter record
            try:
                conn.execute(
                    '''
                    INSERT INTO voter_records (full_name, registration_number)
                    VALUES (?, ?)
                    ''',
                    (voter_name, clean_reg_number)
                )
                print(f"✅ Voter record created: {voter_name} ({clean_reg_number})")
            except Exception as e:
                print(f"⚠️  Could not create voter record: {e}")

            # Record the vote
            try:
                if has_user_type:
                    conn.execute(
                        "INSERT INTO votes (voter_id, user_type, candidate_id) VALUES (?, ?, ?)",
                        [voter_id, user_type, candidate_id]
                    )
                    print(f"✅ Vote recorded with user_type: {user_type}")
                else:
                    conn.execute(
                        "INSERT INTO votes (voter_id, candidate_id) VALUES (?, ?)",
                        [voter_id, candidate_id]
                    )
                    print("✅ Vote recorded without user_type")
            except Exception as e:
                print(f"❌ Error recording vote: {e}")
                return jsonify({"error": "Failed to record vote. Please try again."}), 500

            # Update candidate vote count
            try:
                current_votes = conn.execute(
                    "SELECT votes FROM candidates WHERE id = ?",
                    [candidate_id]
                ).fetchone()
                
                if current_votes:
                    current_count = current_votes["votes"] or 0
                    new_count = current_count + 1
                    
                    conn.execute(
                        "UPDATE candidates SET votes = ? WHERE id = ?",
                        [new_count, candidate_id]
                    )
                    
                    print(f"✅ Candidate vote count updated: {current_count} → {new_count} for candidate ID: {candidate_id}")
                else:
                    print(f"❌ Candidate with ID {candidate_id} not found")
                    return jsonify({"error": "Candidate not found"}), 404
                    
            except Exception as e:
                print(f"❌ Could not update candidate votes: {e}")
                return jsonify({"error": "Failed to update candidate vote count"}), 500

            conn.commit()

            # Get final candidate info to return
            candidate_info = conn.execute(
                "SELECT full_name, faculty, votes FROM candidates WHERE id = ?",
                [candidate_id]
            ).fetchone()

            success_msg = f"Vote recorded successfully for {voter_name}! Thank you for voting."
            print(f"🎉 {success_msg}")

        return jsonify({
            "message": success_msg,
            "candidate": {
                "name": candidate_info["full_name"],
                "faculty": candidate_info["faculty"],
                "votes": candidate_info["votes"]
            }
        }), 200

    except ValueError as ve:
        error_msg = "Invalid candidate ID format. Please try again."
        print(f"❌ {error_msg}: {ve}")
        return jsonify({"error": error_msg}), 400
    except Exception as e:
        error_msg = "Server error during vote submission. Please try again."
        print(f"❌ {error_msg}: {e}")
        return jsonify({"error": error_msg}), 500

# Approve delegate
@delegate_bp.route("/api/delegates/<delegate_id>/approve", methods=["PUT"])
def approve_delegate(delegate_id):
    try:
        with get_db_connection() as conn:
            delegate = conn.execute(
                "SELECT id, full_name, registration_number, faculty FROM delegates WHERE id = ?",
                [delegate_id]
            ).fetchone()
            
            if not delegate:
                return jsonify({"error": "Delegate not found"}), 404
                
            print(f"Approving delegate: {delegate['full_name']} from faculty: '{delegate['faculty']}'")
                
            existing_candidate = conn.execute(
                "SELECT id FROM candidates WHERE delegate_id = ?",
                [delegate_id]
            ).fetchone()
            
            if not existing_candidate:
                original_faculty = delegate["faculty"].strip() if delegate["faculty"] else "Unknown"
                mapped_faculty = map_faculty_name(original_faculty)
                
                print(f"Original faculty: '{original_faculty}' -> Mapped faculty: '{mapped_faculty}'")
                
                conn.execute(
                    "INSERT INTO candidates (delegate_id, full_name, registration_number, faculty, position, votes) VALUES (?, ?, ?, ?, ?, ?)",
                    [delegate["id"], delegate["full_name"], delegate["registration_number"], mapped_faculty, "Delegate", 0]
                )
                
                print(f"Candidate created: {delegate['full_name']} with mapped faculty: '{mapped_faculty}'")
            else:
                print(f"Candidate already exists for delegate {delegate['full_name']}")
            
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

# Get voter records
@delegate_bp.route("/api/voter-records", methods=["GET"])
def get_voter_records():
    """Get all voter records"""
    try:
        with get_db_connection() as conn:
            records = conn.execute('''
                SELECT id, full_name, registration_number, vote_time
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
            
            return jsonify({"voter_records": voter_records, "total_records": len(voter_records)}), 200
            
    except Exception as e:
        print(f"Error getting voter records: {e}")
        return jsonify({"error": str(e)}), 500

# Get voting statistics
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
            total_voter_records = conn.execute("SELECT COUNT(*) as count FROM voter_records").fetchone()["count"]
            
            stats_data = [{"user_type": row["user_type"], "vote_count": row["vote_count"]} for row in stats]
            
            return jsonify({
                "total_votes": total_votes,
                "total_voter_records": total_voter_records,
                "stats_by_user_type": stats_data
            }), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Recount votes endpoint
@delegate_bp.route("/api/recount-votes", methods=["POST"])
def recount_votes():
    """Force recount all votes from votes table to candidates table"""
    try:
        with get_db_connection() as conn:
            candidates = conn.execute("SELECT id FROM candidates").fetchall()
            
            updated_count = 0
            for candidate in candidates:
                candidate_id = candidate["id"]
                
                vote_count = conn.execute(
                    "SELECT COUNT(*) as count FROM votes WHERE candidate_id = ?",
                    [candidate_id]
                ).fetchone()["count"]
                
                conn.execute(
                    "UPDATE candidates SET votes = ? WHERE id = ?",
                    [vote_count, candidate_id]
                )
                
                print(f"Updated candidate {candidate_id}: {vote_count} votes")
                updated_count += 1
            
            conn.commit()
            
            return jsonify({
                "message": f"Successfully recounted votes for {updated_count} candidates",
                "updated_count": updated_count
            }), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get pending delegates
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

# Reject/Delete delegate
@delegate_bp.route("/api/delegates/<delegate_id>/reject", methods=["DELETE"])
def reject_delegate(delegate_id):
    try:
        with get_db_connection() as conn:
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