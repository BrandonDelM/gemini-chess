import os
import config
import google.generativeai as genai

genai.configure(api_key=config.GEMINI_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-lite')
board_state = ['d4', 'c5']
turn = 'white'
chess_skill = 3000
response = model.generate_content(
    f"""You are a {chess_skill} elo chess player.
    The current board state is {board_state}.
    It is {turn}'s turn. Respond only with the single best move as a {chess_skill} elo player in standard algebraic notation (e.g., e4, Nf3, O-O).
    Do not add any other text, explanations, or analysis"""
)
print(response.text)