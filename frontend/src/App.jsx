// App.js

import './App.css';
import { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

function App() {
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

    return `${game.turn()} === 'w' ? 'White' : 'Black'} to move`
  }

  const resetGame = () => {
    setGame(new Chess());
    setMoveLog([]);
  }

  const onDrop = useCallback((sourceSquare, targetSquare) => {
    try {
      const move = game.move({
        from: sourceSquare,
        tp: targetSquare,
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
      <div style="border">
        <div style="status">
          {getGameStatus()}
        </div>
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          customBorderStyle={"chess-border"}
          customDarkSquareStyle={{backgroundColor: "#77952"}}
          customLightSquareStyle={{backgroundColor: "#edeed1"}}
        />
      </div>
      <div style="move-log">
        <h2 style={{marginBottom: '15px', fontSize: '18px'}}>
          Move History
        </h2>
      </div>

      <div style="move-list">
        {moveLog.length > 0 ? (
          moveLog.map((move, index) => (
            <div key={index} style={move-item}>
              {`${Math.floor(index/2) + 1}. ${move}`}
            </div>
          ) )
        ) : (
          <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>

          </div>
        )}
      </div>

      <button onClick={resetGame()}></button>
    </div>
  );
}

export default App;