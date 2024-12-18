from flask import Flask, send_from_directory
from flask_cors import CORS

def create_app():
    app = Flask(__name__, static_folder='../frontend/build', static_url_path='')
    
    # Configure CORS
    cors = CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "https://immense-harbor-33068-c51d1d2f7257.herokuapp.com"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Accept"]
        }
    })

    # Import and register the blueprint
    from app.routes import main
    app.register_blueprint(main)

    @app.route('/')
    def serve():
        return send_from_directory(app.static_folder, 'index.html')

    @app.errorhandler(404)
    def not_found(e):
        return send_from_directory(app.static_folder, 'index.html')

    return app
