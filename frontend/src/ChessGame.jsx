import './App.css';
import { useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

const  ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [moveLog, setMoveLog] = useState([]);

  const getGameStatus = () => {
    if (game.isGameOver()) {
      if (game.isCheckmate()) return 'Checkmate!'
      if (game.isDraw()) return 'Draw!'
      if (game.isStalemate()) return 'Stalemate!'

      return 'Game Over!'
    }
    if (game.inCheck()) return 'Check!'

    return `${game.turn() === 'w' ? 'White' : 'Black'} to move`
  }

  const resetGame = () => {
    setGame(new Chess());
    setMoveLog([]);
  }

  const onDrop = useCallback((sourceSquare, targetSquare) => {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      })

      if (move) {
        setGame(new Chess(game.fen()))
        const moveNotation = `${game.turn() === 'w' ? 'Black' : 'White'}: ${move.san}`
        setMoveLog(prev => [...prev, moveNotation])

        return true;
      }
    } catch(error) {
      return false;
    }

    return true;
  }, [game])

  return (
    <div className="app">
      <div className="border">
        <div className="status">
          {getGameStatus()}
        </div>
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          customBorderStyle={{
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(00,0, 0.3)'
          }}
          customDarkSquareStyle={{backgroundColor: "#779549"}}
          customLightSquareStyle={{backgroundColor: "#edeed1"}}
        />
      </div>
      <div className="move-log">
        <h2 style={{marginBottom: '15px', fontSize: '18px'}}>
          Move History
        </h2>
      </div>

      <div className="move-list">
        {moveLog.length > 0 ? (
          moveLog.map((move, index) => (
            <div key={index} class="move-item">
              {`${Math.floor(index/2) + 1}. ${move}`}
            </div>
          ) )
        ) : (
          <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>

          </div>
        )}
      </div>

      <button onClick={resetGame}></button>
    </div>
  );
}

export default ChessGame;