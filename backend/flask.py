    from flask import Flask, request, jsonify
    from flask_cors import CORS # Import CORS to handle cross-origin requests

    app = Flask(__name__)
    CORS(app) # Enable CORS for your Flask app

    @app.route('/api/data', methods=['POST'])
    def receive_data():
        if request.method == 'POST':
            data = request.get_json()  # Get JSON data from the request body
            # Process the data (e.g., save to database, perform calculations)
            print(f"Received data from frontend: {data}")
            return jsonify({'message': 'Data received successfully!', 'received_data': data})

    if __name__ == '__main__':
        app.run(debug=True)