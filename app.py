from flask import Flask, send_from_directory
from flask_cors import CORS
from backend.routes.layers import layers_bp
import os

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

app.register_blueprint(layers_bp)

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(debug=True)

