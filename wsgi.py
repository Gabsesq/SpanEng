from flask import Flask
from flask_cors import CORS
from app import create_app  # Import create_app from app/__init__.py

app = create_app()
CORS(app)  # Enable CORS for all routes

if __name__ == "__main__":
    app.run(debug=True, host='127.0.0.1', port=5000)
