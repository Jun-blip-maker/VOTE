from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)  # <-- allow React frontend to talk to Flask
DATABASE = "garissa_voting.db"


# ---------- Database Utilities ----------
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email_or_phone TEXT NOT NULL,
            registration_number TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            faculty TEXT,
            year_of_study INTEGER
        )
    ''')
    db.commit()
    db.close()


# ---------- Routes ----------
@app.route("/api/students/register", methods=["POST"])
def register_student():
    data = request.get_json()

    required_fields = ["full_name", "email_or_phone", "registration_number", "password"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field} is required"}), 400

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            '''
            INSERT INTO students (full_name, email_or_phone, registration_number, password, faculty, year_of_study)
            VALUES (?, ?, ?, ?, ?, ?)
            ''',
            (
                data.get("full_name"),
                data.get("email_or_phone"),
                data.get("registration_number"),
                data.get("password"),
                data.get("faculty"),
                data.get("year_of_study"),
            ),
        )
        db.commit()
        student_id = cursor.lastrowid
        db.close()

        return jsonify({"message": "Student registered successfully", "student_id": student_id}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Registration number already exists"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/students", methods=["GET"])
def get_students():
    db = get_db()
    cursor = db.execute("SELECT * FROM students")
    students = [dict(row) for row in cursor.fetchall()]
    db.close()
    return jsonify(students)


# ---------- Initialize DB ----------
init_db()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
