import os
import time
import config as config
import google.generativeai as genai

# Assuming config.py is in the same directory and contains GEMINI_KEY
genai.configure(api_key=config.GEMINI_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-lite')

def gemini_move(fen, readable_board, board_state, state, chess_skill, color="black"):
    """
    Generate a chess move using Gemini AI
    
    Args:
        fen: Board position in FEN notation
        readable_board: Human-readable board representation (FLIPPED for Black's view)
        board_state: List of moves in SAN notation
        state: Whether the current player is in check (True/False)
        chess_skill: ELO rating to simulate (REQUIRED from frontend)
        color: Which color to play ("black" or "white")
    """
    # CRITICAL FIX: Make the check status extremely urgent
    check_status = "IN CHECK. MUST DEFEND KING IMMEDIATELY" if state else "not in check"
    
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
    
    move_number = len(board_state) + 1
    
    # Determine last move info
    last_move_info = ""
    if board_state:
        last_move_info = f"\nLast move played: {board_state[-1]}"
        last_move_info += " (White's last move - you must respond)"

    prompt = f"""You are a chess engine playing at {chess_skill} ELO strength.

CRITICAL: The board position is presented below from BLACK's perspective, meaning the **8th Rank (White's back rank)** is at the **TOP** and the **1st Rank (Black's current front line)** is at the **BOTTOM** of the visual diagram. You must respond as BLACK.

CURRENT POSITION (FEN): {fen}

BOARD VISUALIZATION (Black is at the bottom, Rank 1 is near you):
{readable_board}

MOVE HISTORY:
{move_history_str if move_history_str else "Game start"}{last_move_info}

CURRENT SITUATION:
- Move #{move_number}
- It is BLACK's turn to move (you are BLACK)
- Black is {check_status}

CRITICAL RULES:
1. Only consider the current FEN and board state.
2. The board visualization has ranks 1 through 8 running BOTTOM to TOP.
3. You can ONLY move BLACK pieces.
4. If the situation is 'IN CHECK', your move MUST be a legal move that resolves the check.
5. If you dont see a BLACK piece (ex: no bishops, queen, etc.) on the board, then that piece isn't available and you CANT use it.

INSTRUCTIONS:
1. Analyze the current position carefully.
2. Choose the BEST move for a {chess_skill} ELO player.
3. Respond with ONLY the move in standard algebraic notation (SAN).

EXAMPLES OF VALID SAN:
- Pawn moves: e5, c6
- Piece moves: Nc6, Bb4, Re8
- Captures: exd5, Nxf7, Qxh7
- Castling: O-O (kingside), O-O-O (queenside)

RESPOND WITH ONLY THE MOVE - NO EXPLANATION, NO ANALYSIS, NO EXTRA TEXT.

Your move:"""
    
    # Add 2-second delay to avoid rate limiting
    print("Waiting 2 seconds before calling Gemini API...")
    time.sleep(2)
    
    # Use exponential backoff for API call
    for attempt in range(4): # 4 attempts here means 3 retries, typical for API calls
        try:
            response = model.generate_content(prompt)
            break
        except Exception as e:
            if attempt < 3:
                delay = 2 ** attempt
                print(f"Rate limit hit. Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                raise Exception(f"API call failed after multiple retries: {e}")
    
    # Extract and clean the move
    move = response.text.strip()
    
    # Clean the output string
    move = move.replace('```', '').replace('`', '').strip()
    
    prefixes_to_remove = [
        "Move:", "move:", "My move:", "Best move:", 
        "I play", "I suggest", "The move is"
    ]
    for prefix in prefixes_to_remove:
        if move.lower().startswith(prefix.lower()):
            move = move[len(prefix):].strip()
    
    # Take only the first word (the actual move notation)
    move = move.split()[0] if move.split() else move
    
    print(f"Raw Gemini response: {response.text}")
    print(f"Cleaned move: {move}")
    
    return move