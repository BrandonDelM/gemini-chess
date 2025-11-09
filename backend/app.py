from flask import Flask, request, jsonify
from flask_cors import CORS
from gemini import gemini_move 

app = Flask(__name__)
CORS(app)

def board_to_fen(board_state):
    """Convert board state to FEN notation for better AI understanding"""
    fen_rows = []
    
    for row in board_state:
        empty_count = 0
        fen_row = ""
        
        for cell in row:
            if cell is None:
                empty_count += 1
            else:
                if empty_count > 0:
                    fen_row += str(empty_count)
                    empty_count = 0
                
                piece_map = {
                    'Pawn': 'p', 'Rook': 'r', 'Knight': 'n',
                    'Bishop': 'b', 'Queen': 'q', 'King': 'k'
                }
                piece_char = piece_map[cell['piece']]
                if cell['color'] == 'W':
                    piece_char = piece_char.upper()
                fen_row += piece_char
        
        if empty_count > 0:
            fen_row += str(empty_count)
        fen_rows.append(fen_row)
    
    return '/'.join(fen_rows)

def board_to_readable_text(board_state):
    """Convert board to human-readable format"""
    piece_symbols = {
        ('Rook', 'W'): 'R', ('Knight', 'W'): 'N', ('Bishop', 'W'): 'B',
        ('Queen', 'W'): 'Q', ('King', 'W'): 'K', ('Pawn', 'W'): 'P',
        ('Rook', 'B'): 'r', ('Knight', 'B'): 'n', ('Bishop', 'B'): 'b',
        ('Queen', 'B'): 'q', ('King', 'B'): 'k', ('Pawn', 'B'): 'p'
    }
    
    lines = ["  a b c d e f g h"]
    for idx, row in enumerate(board_state):
        rank = 8 - idx
        line = f"{rank} "
        for cell in row:
            if cell is None:
                line += ". "
            else:
                symbol = piece_symbols.get((cell['piece'], cell['color']), '?')
                line += f"{symbol} "
        lines.append(line)
    
    lines.append("\nWhite pieces: UPPERCASE (R N B Q K P)")
    lines.append("Black pieces: lowercase (r n b q k p)")
    
    return '\n'.join(lines)

@app.route('/api/data', methods=['POST'])
def receive_data():
    if request.method == 'POST':
        data = request.get_json()
        
        move_history = data.get('moveHistory', [])
        is_check_state = data.get('isCheck', False)
        board_state = data.get('boardState', [])
        
        print(f"Received move history: {move_history}")
        print(f"Check state: {is_check_state}")
        
        # Convert board to FEN and readable format
        fen = board_to_fen(board_state)
        readable_board = board_to_readable_text(board_state)
        
        print(f"FEN: {fen}")
        print(f"Board:\n{readable_board}")
        
        try:
            gemini_move_san = gemini_move(
                fen=fen,
                readable_board=readable_board,
                board_state=move_history,
                state=is_check_state,
                chess_skill=1200,
                color="black"
            )
            
            # Clean up the response - remove any extra whitespace or newlines
            gemini_move_san = gemini_move_san.strip()
            
        except Exception as e:
            print(f"Error during gemini_move call: {e}")
            return jsonify({
                'error': f'AI move generation failed: {e}',
                'geminiMove': None
            }), 500

        print(f"Gemini move generated: {gemini_move_san}")
        
        return jsonify({
            'message': 'Data received and move generated successfully!',
            'received_data': {
                'moveHistory': move_history,
                'isCheck': is_check_state,
                'fen': fen
            },
            'geminiMove': gemini_move_san
        })

if __name__ == '__main__':
    app.run(debug=True)