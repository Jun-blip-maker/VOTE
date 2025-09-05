from flask import Blueprint, request, jsonify
from flask_cors import CORS
import sqlite3
from contextlib import contextmanager
import datetime

# Create the Blueprint instance
vote_bp = Blueprint('vote', __name__)

# Enable CORS for this blueprint
CORS(vote_bp, resources={
    r"/api/votes/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Database context manager
@contextmanager
def get_db_connection():
    conn = sqlite3.connect("garissa_voting.db")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_vote_db():
    """Initialize the votes database tables"""
    with get_db_connection() as conn:
        # First check if votes table exists and get its structure
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(votes)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if not columns:
            # Create votes table if it doesn't exist
            conn.execute('''
                CREATE TABLE votes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    voter_name TEXT NOT NULL,
                    voter_reg_number TEXT NOT NULL,
                    voter_school TEXT NOT NULL,
                    chairperson TEXT,
                    vice_chair TEXT,
                    secretary TEXT,
                    treasurer TEXT,
                    academic TEXT,
                    welfare TEXT,
                    sports TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(voter_reg_number)  -- Ensure each student can only vote once
                )
            ''')
            print("Created votes table")
        else:
            # Check if voter_reg_number column exists
            if 'voter_reg_number' not in columns:
                # Add the missing column
                conn.execute('ALTER TABLE votes ADD COLUMN voter_reg_number TEXT NOT NULL DEFAULT ""')
                print("Added voter_reg_number column to votes table")
        
        # Check if vote_results table exists
        cursor.execute("PRAGMA table_info(vote_results)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if not columns:
            # Create votes summary table for faster results calculation
            conn.execute('''
                CREATE TABLE vote_results (
                    position TEXT NOT NULL,
                    candidate_reg_number TEXT NOT NULL,
                    candidate_name TEXT NOT NULL,
                    votes INTEGER DEFAULT 0,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (position, candidate_reg_number)
                )
            ''')
            print("Created vote_results table")
        
        # Create indexes for better performance (only if they don't exist)
        try:
            conn.execute('CREATE INDEX IF NOT EXISTS idx_votes_reg_number ON votes(voter_reg_number)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_votes_school ON votes(voter_school)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_vote_results_position ON vote_results(position)')
        except sqlite3.OperationalError as e:
            print(f"Index creation warning: {e}")
        
        conn.commit()
        print("Vote database initialization completed successfully!")

# Initialize vote database
init_vote_db()

@vote_bp.route("/api/votes", methods=["POST", "OPTIONS"])
def submit_vote():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        return response, 200

    data = request.get_json()

    # Validate required fields
    required_fields = ["name", "regnumber", "delegate"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field} is required"}), 400

    try:
        with get_db_connection() as conn:
            # Check if this student has already voted
            existing_vote = conn.execute(
                "SELECT id FROM votes WHERE voter_reg_number = ?",
                (data["regnumber"],)
            ).fetchone()
            
            if existing_vote:
                return jsonify({"error": "You have already voted. Each student can only vote once."}), 400

            # Insert the vote
            cursor = conn.cursor()
            cursor.execute(
                '''
                INSERT INTO votes (voter_name, voter_reg_number, voter_school, 
                                 chairperson, vice_chair, secretary, 
                                 treasurer, academic, welfare, sports)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    data["name"],
                    data["regnumber"],
                    data["delegate"],
                    data.get("chairperson", ""),
                    data.get("vice_chair", ""),
                    data.get("secretary", ""),
                    data.get("treasurer", ""),
                    data.get("academic", ""),
                    data.get("welfare", ""),
                    data.get("sports", "")
                )
            )
            
            # Update vote results
            positions = [
                ("chairperson", data.get("chairperson", "")),
                ("vice_chair", data.get("vice_chair", "")),
                ("secretary", data.get("secretary", "")),
                ("treasurer", data.get("treasurer", "")),
                ("academic", data.get("academic", "")),
                ("welfare", data.get("welfare", "")),
                ("sports", data.get("sports", ""))
            ]
            
            for position, candidate_reg in positions:
                if candidate_reg:  # Only update if a candidate was selected
                    # Get candidate name from chosen_leaders table
                    candidate = conn.execute(
                        "SELECT full_name FROM chosen_leaders WHERE reg_number = ?",
                        (candidate_reg,)
                    ).fetchone()
                    
                    candidate_name = candidate["full_name"] if candidate else "Unknown Candidate"
                    
                    # Update or insert vote count
                    conn.execute(
                        '''
                        INSERT INTO vote_results (position, candidate_reg_number, candidate_name, votes)
                        VALUES (?, ?, ?, 1)
                        ON CONFLICT(position, candidate_reg_number) 
                        DO UPDATE SET votes = votes + 1, last_updated = CURRENT_TIMESTAMP
                        ''',
                        (position, candidate_reg, candidate_name)
                    )
            
            conn.commit()
            vote_id = cursor.lastrowid

        response = jsonify({
            "message": "Vote submitted successfully!",
            "vote_id": vote_id
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 201

    except sqlite3.IntegrityError as e:
        return jsonify({"error": "Database integrity error. You may have already voted."}), 400
    except Exception as e:
        return jsonify({"error": f"Vote submission failed: {str(e)}"}), 500

@vote_bp.route("/api/votes/results", methods=["GET"])
def get_vote_results():
    """Get voting results summary"""
    try:
        with get_db_connection() as conn:
            # Get total votes cast
            total_votes = conn.execute(
                "SELECT COUNT(*) as count FROM votes"
            ).fetchone()["count"]
            
            # Get results by position
            results_by_position = {}
            positions = ["chairperson", "vice_chair", "secretary", "treasurer", "academic", "welfare", "sports"]
            
            for position in positions:
                results = conn.execute(
                    """
                    SELECT candidate_reg_number, candidate_name, votes 
                    FROM vote_results 
                    WHERE position = ? 
                    ORDER BY votes DESC
                    """,
                    (position,)
                ).fetchall()
                
                results_by_position[position] = [dict(result) for result in results]
            
            # Get votes by school
            votes_by_school = conn.execute(
                """
                SELECT voter_school as school, COUNT(*) as votes 
                FROM votes 
                GROUP BY voter_school 
                ORDER BY votes DESC
                """
            ).fetchall()
            
            response_data = {
                "total_votes": total_votes,
                "results_by_position": results_by_position,
                "votes_by_school": [dict(result) for result in votes_by_school]
            }
            
        response = jsonify(response_data)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch vote results: {str(e)}"}), 500

@vote_bp.route("/api/votes/check/<reg_number>", methods=["GET"])
def check_vote_status(reg_number):
    """Check if a student has already voted"""
    try:
        with get_db_connection() as conn:
            vote = conn.execute(
                "SELECT id, created_at FROM votes WHERE voter_reg_number = ?",
                (reg_number,)
            ).fetchone()
            
            if vote:
                return jsonify({
                    "has_voted": True,
                    "voted_at": vote["created_at"]
                }), 200
            else:
                return jsonify({
                    "has_voted": False
                }), 200
                
    except Exception as e:
        return jsonify({"error": f"Failed to check vote status: {str(e)}"}), 500

@vote_bp.route("/api/votes/all", methods=["GET"])
def get_all_votes():
    """Get all votes (for admin purposes)"""
    try:
        with get_db_connection() as conn:
            votes = conn.execute(
                "SELECT * FROM votes ORDER BY created_at DESC"
            ).fetchall()
            
            votes_list = [dict(vote) for vote in votes]
            
        response = jsonify({"votes": votes_list})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch votes: {str(e)}"}), 500

@vote_bp.route("/api/votes/count", methods=["GET"])
def get_vote_count():
    """Get total vote count"""
    try:
        with get_db_connection() as conn:
            count = conn.execute(
                "SELECT COUNT(*) as count FROM votes"
            ).fetchone()["count"]
            
        return jsonify({"total_votes": count}), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch vote count: {str(e)}"}), 500

@vote_bp.route("/api/votes/reset", methods=["POST", "OPTIONS"])
def reset_votes():
    """Reset all votes (for testing purposes only)"""
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        return response, 200

    # Add authentication/authorization check here in production
    # For example, check if the request is from an admin user
    
    try:
        with get_db_connection() as conn:
            conn.execute("DELETE FROM votes")
            conn.execute("DELETE FROM vote_results")
            conn.commit()
            
        response = jsonify({"message": "All votes have been reset"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to reset votes: {str(e)}"}), 500

# Debug endpoint to check database structure
@vote_bp.route("/api/votes/debug", methods=["GET"])
def debug_votes():
    """Debug endpoint to check database structure"""
    try:
        with get_db_connection() as conn:
            # Check votes table structure
            votes_columns = conn.execute("PRAGMA table_info(votes)").fetchall()
            vote_results_columns = conn.execute("PRAGMA table_info(vote_results)").fetchall()
            
            # Get some sample data
            votes_count = conn.execute("SELECT COUNT(*) as count FROM votes").fetchone()["count"]
            vote_results_count = conn.execute("SELECT COUNT(*) as count FROM vote_results").fetchone()["count"]
            
            response_data = {
                "votes_table_columns": [dict(col) for col in votes_columns],
                "vote_results_table_columns": [dict(col) for col in vote_results_columns],
                "votes_count": votes_count,
                "vote_results_count": vote_results_count
            }
            
        response = jsonify(response_data)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Debug failed: {str(e)}"}), 500

# Export the blueprint
__all__ = ['vote_bp']