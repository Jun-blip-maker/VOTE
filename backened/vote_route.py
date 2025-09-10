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
        # Check if votes table exists with the correct structure
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(votes)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add position column if it doesn't exist
        if 'position' not in columns:
            try:
                conn.execute('ALTER TABLE votes ADD COLUMN position TEXT')
                print("Added position column to votes table")
            except sqlite3.OperationalError as e:
                print(f"Could not add position column: {e}")
        
        # Ensure vote_results table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='vote_results'
        """)
        if not cursor.fetchone():
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
    print("Received vote data:", data)

    # Validate required fields
    required_fields = ["voter_name", "voter_reg_number", "voter_school"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field} is required"}), 400

    try:
        with get_db_connection() as conn:
            # Check if this student has already voted
            existing_vote = conn.execute(
                "SELECT id FROM votes WHERE voter_reg_number = ?",
                (data["voter_reg_number"],)
            ).fetchone()
            
            if existing_vote:
                return jsonify({"error": "You have already voted. Each student can only vote once."}), 400

            # Insert votes for each position
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
                if candidate_reg:  # Only insert if a candidate was selected
                    # Get candidate info from chosen_leaders
                    candidate = conn.execute(
                        "SELECT id, full_name, reg_number FROM chosen_leaders WHERE reg_number = ?",
                        (candidate_reg,)
                    ).fetchone()
                    
                    if candidate:
                        # Insert the vote with position
                        conn.execute(
                            "INSERT INTO votes (voter_id, candidate_id, voter_reg_number, voter_school, position) VALUES (?, ?, ?, ?, ?)",
                            (1, candidate["id"], data["voter_reg_number"], data["voter_school"], position)
                        )
                        
                        # Update vote results
                        conn.execute(
                            '''
                            INSERT INTO vote_results (position, candidate_reg_number, candidate_name, votes)
                            VALUES (?, ?, ?, 1)
                            ON CONFLICT(position, candidate_reg_number) 
                            DO UPDATE SET votes = votes + 1, last_updated = CURRENT_TIMESTAMP
                            ''',
                            (position, candidate_reg, candidate["full_name"])
                        )
                    else:
                        print(f"Candidate with reg number {candidate_reg} not found in chosen_leaders")
            
            conn.commit()

        response = jsonify({
            "message": "Vote submitted successfully!",
            "details": "Your vote has been recorded for all selected positions."
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 201

    except sqlite3.IntegrityError as e:
        print("Integrity error:", str(e))
        return jsonify({"error": "Database integrity error. You may have already voted."}), 400
    except Exception as e:
        print("Vote submission error:", str(e))
        return jsonify({"error": f"Vote submission failed: {str(e)}"}), 500

@vote_bp.route("/api/votes/results", methods=["GET"])
def get_vote_results():
    """Get voting results summary"""
    try:
        with get_db_connection() as conn:
            # Get total votes cast (count distinct voters)
            total_votes = conn.execute(
                "SELECT COUNT(DISTINCT voter_reg_number) as count FROM votes"
            ).fetchone()["count"]
            
            # Get results by position from vote_results table
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
                SELECT voter_school as school, COUNT(DISTINCT voter_reg_number) as votes 
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
                "SELECT id, voted_at FROM votes WHERE voter_reg_number = ? LIMIT 1",
                (reg_number,)
            ).fetchone()
            
            if vote:
                return jsonify({
                    "has_voted": True,
                    "voted_at": vote["voted_at"]
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
            # Get unique votes by voter (latest vote per voter)
            votes = conn.execute(
                """
                SELECT v1.* 
                FROM votes v1
                INNER JOIN (
                    SELECT voter_reg_number, MAX(voted_at) as latest_vote
                    FROM votes
                    GROUP BY voter_reg_number
                ) v2 ON v1.voter_reg_number = v2.voter_reg_number AND v1.voted_at = v2.latest_vote
                ORDER BY v1.voted_at DESC
                """
            ).fetchall()
            
            votes_list = []
            for vote in votes:
                vote_dict = dict(vote)
                # Get voter name from chosen_leaders or use reg number as fallback
                voter_info = conn.execute(
                    "SELECT full_name FROM chosen_leaders WHERE reg_number = ?",
                    (vote_dict["voter_reg_number"],)
                ).fetchone()
                
                vote_dict["voter_name"] = voter_info["full_name"] if voter_info else vote_dict["voter_reg_number"]
                votes_list.append(vote_dict)
            
        response = jsonify({"votes": votes_list})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        print(f"Error in get_all_votes: {str(e)}")
        return jsonify({"error": f"Failed to fetch votes: {str(e)}"}), 500

@vote_bp.route("/api/votes/count", methods=["GET"])
def get_vote_count():
    """Get total vote count (unique voters)"""
    try:
        with get_db_connection() as conn:
            count = conn.execute(
                "SELECT COUNT(DISTINCT voter_reg_number) as count FROM votes"
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
            unique_voters = conn.execute("SELECT COUNT(DISTINCT voter_reg_number) as count FROM votes").fetchone()["count"]
            vote_results_count = conn.execute("SELECT COUNT(*) as count FROM vote_results").fetchone()["count"]
            
            # Check chosen_leaders table
            chosen_leaders_count = conn.execute("SELECT COUNT(*) as count FROM chosen_leaders").fetchone()["count"]
            
            response_data = {
                "votes_table_columns": [dict(col) for col in votes_columns],
                "vote_results_table_columns": [dict(col) for col in vote_results_columns],
                "votes_count": votes_count,
                "unique_voters_count": unique_voters,
                "vote_results_count": vote_results_count,
                "chosen_leaders_count": chosen_leaders_count
            }
            
        response = jsonify(response_data)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200
        
    except Exception as e:
        return jsonify({"error": f"Debug failed: {str(e)}"}), 500

# Export the blueprint
__all__ = ['vote_bp']