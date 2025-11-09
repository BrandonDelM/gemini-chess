from flask import Flask, request, jsonify
from flask_cors import CORS
from gemini import gemini_move 

app = Flask(__name__)
CORS(app)

def board_to_fen(board_state):
    """Convert board state to FEN notation (Standard Rank 8 to 1 order)."""
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
    
    # FEN is standardized Rank 8 to Rank 1. We assume input array is also 8 to 1.
    return '/'.join(fen_rows)

def board_to_readable_text(board_state, player_color):
    """
    Convert board to human-readable format, reversing for Black's perspective.
    
    Args:
        board_state: 8x8 array (Row 0 = Rank 8, Row 7 = Rank 1)
        player_color: The color whose turn it is ("black" or "white").
    """
    piece_symbols = {
        ('Rook', 'W'): 'R', ('Knight', 'W'): 'N', ('Bishop', 'W'): 'B',
        ('Queen', 'W'): 'Q', ('King', 'W'): 'K', ('Pawn', 'W'): 'P',
        ('Rook', 'B'): 'r', ('Knight', 'B'): 'n', ('Bishop', 'B'): 'b',
        ('Queen', 'B'): 'q', ('King', 'B'): 'k', ('Pawn', 'B'): 'p'
    }
    
    # Ranks (8 down to 1)
    ranks_list = list(range(8, 0, -1))
    rows_to_display = list(board_state)
    
    # Flip the visualization for Black (AI) so Rank 1 is at the bottom of the diagram.
    if player_color == "black":
        rows_to_display.reverse()
        ranks_list.reverse() # Ranks 1 up to 8 (for side numbering)

    lines = ["  a b c d e f g h"]
    for idx, row in enumerate(rows_to_display):
        rank = ranks_list[idx]
        line = f"{rank} "
        for cell in row:
            if cell is None:
                line += ". "
            else:
                symbol = piece_symbols.get((cell['piece'], cell['color']), '?')
                line += f"{symbol} "
        lines.append(line)
    
    lines.append("  a b c d e f g h")
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
        # --- ELO Input ---
        elo_skill = data.get('eloSkill', 1800) # Use 1800 as fallback
        
        print(f"Received move history: {move_history}")
        print(f"Check state: {is_check_state}")
        print(f"Target ELO: {elo_skill}")
        
        # Convert board to FEN (standard) and readable format (flipped for black)
        fen = board_to_fen(board_state)
        readable_board = board_to_readable_text(board_state, "black") 
        
        print(f"FEN: {fen}")
        
        try:
            gemini_move_san = gemini_move(
                fen=fen,
                readable_board=readable_board,
                board_state=move_history,
                state=is_check_state,
                chess_skill=elo_skill, # Passed dynamic ELO
                color="black"
            )
            
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