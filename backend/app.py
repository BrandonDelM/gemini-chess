from flask import Flask, request, jsonify
from flask_cors import CORS # Import CORS to handle cross-origin requests
# Assuming 'gemini.py' contains your gemini_move function definition
from gemini import gemini_move 

app = Flask(__name__)
CORS(app) # Enable CORS for your Flask app

@app.route('/api/data', methods=['POST'])
def receive_data():
    if request.method == 'POST':
        #fake content
        data = request.get_json()  # Get JSON data; data is a Python dictionary
        
        # --- Safely Extract Required Data ---
        move_history = data.get('moveHistory') 
        is_check_state = data.get('isCheck', False) # Default to False if key missing
        
        print(f"Received data from frontend: {data}")

        # --- Call Gemini for Black's Move ---
        # Note: We must pass all required arguments (board_state, state, chess_skill).
        # Assuming we set the opponent color to "black" and a skill level of 1200.
        try:
            gemini_move_san = gemini_move(
                board_state=move_history, 
                state=is_check_state, 
                chess_skill=1200, 
                color="black"
            )
        except Exception as e:
            print(f"Error during gemini_move call: {e}")
            # Return an error or a fallback move if the AI call fails
            return jsonify({'error': f'AI move generation failed: {e}', 'geminiMove': None}), 500

        print(f"Gemini move generated: {gemini_move_san}")
        
        # --- Return the move to the frontend ---
        return jsonify({
            'message': 'Data received and move generated successfully!', 
            'received_data': data,
            'geminiMove': gemini_move_san # The SAN move string for the frontend to execute
        })

if __name__ == '__main__':
    # Make sure to run the file with its correct, non-conflicting name (e.g., app.py)
    app.run(debug=True)