import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

function ChessGame() {
  const [game, setGame] = useState(new Chess());

  function onDrop(sourceSquare, targetSquare) {
    let move = null;
    try {
      move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity in this example
      });
    } catch (error) {
      // Handle invalid moves if needed
      return false; // Return false to indicate an invalid move
    }

    if (move === null) return false; // Illegal move

    setGame(new Chess(game.fen())); // Update state to trigger re-render

    // Optional: Add logic for computer moves or other game interactions here
    // For example, a simple random move after a delay:
    // setTimeout(() => {
    //   const possibleMoves = game.moves();
    //   if (game.game_over() || game.in_draw() || possibleMoves.length === 0) return;
    //   const randomIndex = Math.floor(Math.random() * possibleMoves.length);
    //   game.move(possibleMoves[randomIndex]);
    //   setGame(new Chess(game.fen()));
    // }, 200);

    return true; // Return true to indicate a valid move
  }

  return (
    <div>
      <h1>React Chessboard</h1>
      <Chessboard position={game.fen()} onPieceDrop={onDrop} />
      {game.game_over() && <p>Game Over!</p>}
      {game.in_draw() && <p>Draw!</p>}
    </div>
  );
}

export default ChessGame;