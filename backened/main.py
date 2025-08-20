from flask import Flask
from flask_cors import CORS
from student_routes import student_bp
from delegate_route import delegate_bp  # Add this import

app = Flask(__name__)
CORS(app)  # allow React frontend to talk to Flask
DATABASE = "garissa_voting.db"

# Register Blueprints
app.register_blueprint(student_bp)
app.register_blueprint(delegate_bp)  # Add this line

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)