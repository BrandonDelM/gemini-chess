from flask import Flask, request, jsonify
from flask_cors import CORS # Import CORS to handle cross-origin requests
from gemini import gemini_move

app = Flask(__name__)
CORS(app) # Enable CORS for your Flask app

@app.route('/api/data', methods=['POST'])
def receive_data():
    if request.method == 'POST':
        data = request.get_json()  # Get JSON data from the request body
        # Process the data (e.g., save to database, perform calculations)
        move_history = data.get('moveHistory')
        is_check = data.get('isCheck')
        print(f"Received data from frontend: {data}")
        gemini_move(
            board_state=move_history, 
            state=is_check, 
            chess_skill=1200,
            color="black"
        )
        return jsonify({'message': 'Data received successfully!', 'received_data': data})

if __name__ == '__main__':
    app.run(debug=True)