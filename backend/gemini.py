import os
import config
import google.generativeai as genai

genai.configure(api_key=config.GEMINI_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-lite')

def gemini_move(board_state, state, color="black", chess_skill=1000):
    if state == True:
        etc = "in check"
    else:
        etc = "not in check"
    # Should know the board position, whether 
    response = model.generate_content(
        f"""You are a {chess_skill} elo chess player.
        It is move {len(board_state)+1} with the committed moves {board_state} and youre {etc}.
        It is {color}'s turn. Respond only with the single best move as a {chess_skill} elo player in standard algebraic notation (e.g., e4, Nf3, O-O).
        Do not add any other text, explanations, or analysis"""
    )

    print(response.text)