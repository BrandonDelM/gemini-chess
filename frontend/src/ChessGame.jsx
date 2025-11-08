import './App.css';
import { useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

const ChessGame = () => {
    const [game, setGame] = useState(new Chess());
    const [moveLog, setMoveLog] = useState([]);

    const getGameStatus = () => {
        if (game.isGameOver()) {
            if (game.isCheckmate()) return 'Checkmate!';
            if (game.isDraw()) return 'Draw!';
            if (game.isStalemate()) return 'Stalemate!';

            return 'Game Over!';
        }
        if (game.inCheck()) return 'Check!';

        return `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
    };

    const resetGame = () => {
        setGame(new Chess());
        setMoveLog([]);
    };

    const onDrop = useCallback((sourceSquare, targetSquare) => {
        try {
            const move = game.move({
                from: sourceSquare,
                to: targetSquare, // <--- PRIMARY FIX: Changed 'tp' to 'to'
                promotion: 'q'
            });

            if (move) {
                // Set game with a new Chess instance based on the current FEN
                setGame(new Chess(game.fen()));
                // Log the move. Note: game.turn() here is the NEXT turn's color
                const moveNotation = `${move.color === 'w' ? 'White' : 'Black'}: ${move.san}`;
                setMoveLog(prev => [...prev, moveNotation]);

                return true;
            }
        } catch (error) {
            console.error(error);
            return false;
        }

        // Return false if game.move() returned null (illegal move)
        return false;
    }, [game]);

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
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
                    }}
                    customDarkSquareStyle={{ backgroundColor: "#779549" }} // <-- SECONDARY FIX: Valid hex color
                    customLightSquareStyle={{ backgroundColor: "#edeed1" }}
                />
            </div>
            <div className="move-log">
                <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>
                    Move History
                </h2>
            </div>

            <div className="move-list">
                {moveLog.length > 0 ? (
                    moveLog.map((move, index) => (
                        <div key={index} className="move-item"> {/* <-- SECONDARY FIX: Changed 'class' to 'className' */}
                            {`${Math.floor(index / 2) + 1}. ${move}`}
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                        No moves recorded yet.
                    </div>
                )}
            </div>

            <button onClick={resetGame}>
                Reset Game
            </button>
        </div>
    );
};

export default ChessGame;