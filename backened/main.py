from flask import Flask
from flask_cors import CORS
from student_routes import student_bp
from delegate_route import delegate_bp
from admin_route import admin_bp
from leader_route import leader_bp 
from vote_route import vote_bp
from auth_bp import auth_bp

app = Flask(__name__)

# Safe CORS configuration - applies to ALL routes
CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

DATABASE = "garissa_voting.db"

# Register Blueprints
app.register_blueprint(student_bp)
app.register_blueprint(delegate_bp)  
app.register_blueprint(admin_bp)
app.register_blueprint(leader_bp) 
app.register_blueprint(vote_bp) 
app.register_blueprint(auth_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)