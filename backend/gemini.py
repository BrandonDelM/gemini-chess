import os
import time
import config as config
import google.generativeai as genai

genai.configure(api_key=config.GEMINI_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-lite')

def gemini_move(fen, readable_board, board_state, state, color="black", chess_skill=1000):
    """
    Generate a chess move using Gemini AI
    
    Args:
        fen: Board position in FEN notation
        readable_board: Human-readable board representation
        board_state: List of moves in SAN notation
        state: Whether the current player is in check
        color: Which color to play ("black" or "white")
        chess_skill: ELO rating to simulate
    """
    check_status = "in check" if state else "not in check"
    
    # Build the move history string
    move_history_str = ""
    for i in range(0, len(board_state), 2):
        move_num = (i // 2) + 1
        white_move = board_state[i] if i < len(board_state) else ""
        black_move = board_state[i + 1] if i + 1 < len(board_state) else ""
        if black_move:
            move_history_str += f"{move_num}. {white_move} {black_move}\n"
        else:
            move_history_str += f"{move_num}. {white_move} ...\n"
    
    # Determine whose turn it is based on move count
    move_number = len(board_state) + 1
    is_white_to_move = len(board_state) % 2 == 0
    
    # Add clarification about the last move
    last_move_info = ""
    if board_state:
        last_move_info = f"\nLast move played: {board_state[-1]}"
        if is_white_to_move:
            last_move_info += " (Black's last move)"
        else:
            last_move_info += " (White's last move - you must respond)"
    
    prompt = f"""You are a chess engine playing at {chess_skill} ELO strength.

CRITICAL: The board position shown below is AFTER White's last move. You must respond as BLACK.

CURRENT POSITION (FEN): {fen}

BOARD VISUALIZATION (White pieces: UPPERCASE, Black pieces: lowercase):
{readable_board}

MOVE HISTORY:
{move_history_str if move_history_str else "Game start"}{last_move_info}

CURRENT SITUATION:
- Move #{move_number}
- It is BLACK's turn to move (you are BLACK)
- Black is {check_status}

CRITICAL RULES:
1. Look ONLY at the board position above - this shows which pieces BLACK currently has
2. BLACK pieces are shown in lowercase (r, n, b, q, k, p)
3. You can ONLY move BLACK pieces that are currently on the board
4. If Black's queen was captured, you CANNOT play queen moves
5. The position shown is AFTER White's move {board_state[-1] if board_state else ""}

INSTRUCTIONS:
1. Analyze the current position carefully
2. Consider all legal moves for {color}
3. Look for captures, threats, and tactical opportunities
4. Choose the BEST move for a {chess_skill} ELO player
5. Respond with ONLY the move in standard algebraic notation (SAN)

EXAMPLES OF VALID SAN:
- Pawn moves: e4, d5, e8=Q (promotion)
- Piece moves: Nf3, Bb5, Qh5
- Captures: exd5, Nxf7, Qxh7
- Castling: O-O (kingside), O-O-O (queenside)
- Check: Qh5+, Nf7+
- Checkmate: Qh7#

RESPOND WITH ONLY THE MOVE - NO EXPLANATION, NO ANALYSIS, NO EXTRA TEXT.

Your move:"""
    
    # Add 2-second delay to avoid rate limiting
    print("Waiting 2 seconds before calling Gemini API...")
    time.sleep(2)
    
    response = model.generate_content(prompt)
    
    # Extract and clean the move
    move = response.text.strip()
    
    # Remove any markdown formatting, quotes, or extra text
    move = move.replace('```', '').replace('`', '').strip()
    
    # Remove common prefixes that Gemini might add
    prefixes_to_remove = [
        "Move:", "move:", "My move:", "Best move:", 
        "I play", "I suggest", "The move is"
    ]
    for prefix in prefixes_to_remove:
        if move.startswith(prefix):
            move = move[len(prefix):].strip()
    
    # Take only the first word (the actual move notation)
    move = move.split()[0] if move.split() else move
    
    print(f"Raw Gemini response: {response.text}")
    print(f"Cleaned move: {move}")
    
    return move