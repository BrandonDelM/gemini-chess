import React, { useState, useCallback, useMemo } from 'react';
import './ChessGame.css'; // Import external CSS file

// Helper function to convert zero-indexed column/row to algebraic notation (e.g., [7, 0] -> "A1")
const toAlgebraic = (row, col) => {
    if (row === null || col === null || row === undefined || col === undefined) return null;
    const rank = 8 - row; // Rows 7(White) -> 0(Black) map to Ranks 1 -> 8
    const file = String.fromCharCode(65 + col);
    return `${file}${rank}`;
};

// Piece Definitions and Symbols (unchanged)
const initialBoard = [
    [{ piece: 'Rook', color: 'B' }, { piece: 'Knight', color: 'B' }, { piece: 'Bishop', color: 'B' }, { piece: 'Queen', color: 'B' }, { piece: 'King', color: 'B' }, { piece: 'Bishop', color: 'B' }, { piece: 'Knight', color: 'B' }, { piece: 'Rook', color: 'B' }],
    [{ piece: 'Pawn', color: 'B' }, { piece: 'Pawn', color: 'B' }, { piece: 'Pawn', color: 'B' }, { piece: 'Pawn', 'color': 'B' }, { piece: 'Pawn', color: 'B' }, { piece: 'Pawn', color: 'B' }, { piece: 'Pawn', color: 'B' }, { piece: 'Pawn', color: 'B' }],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [{ piece: 'Pawn', color: 'W' }, { piece: 'Pawn', color: 'W' }, { piece: 'Pawn', color: 'W' }, { piece: 'Pawn', color: 'W' }, { piece: 'Pawn', color: 'W' }, { piece: 'Pawn', color: 'W' }, { piece: 'Pawn', color: 'W' }, { piece: 'Pawn', color: 'W' }],
    [{ piece: 'Rook', color: 'W' }, { piece: 'Knight', color: 'W' }, { piece: 'Bishop', color: 'W' }, { piece: 'Queen', color: 'W' }, { piece: 'King', color: 'W' }, { piece: 'Bishop', color: 'W' }, { piece: 'Knight', color: 'W' }, { piece: 'Rook', color: 'W' }]
];

const pieceSymbols = {
    'Rook': { W: '♜', B: '♖' },
    'Knight': { W: '♞', B: '♘' },
    'Bishop': { W: '♝', B: '♗' },
    'Queen': { W: '♛', B: '♕' },
    'King': { W: '♚', B: '♔' },
    'Pawn': { W: '♟', B: '♙' },
};

// --- Move Validation Logic (from previous update, used for game state management) ---

const checkPathClearance = (board, sr, sc, tr, tc) => {
    const dr = Math.sign(tr - sr);
    const dc = Math.sign(tc - sc);
    let r = sr + dr;
    let c = sc + dc;

    while (r !== tr || c !== tc) {
        if (board[r][c] !== null) return false;
        r += dr;
        c += dc;
    }
    return true;
};

const isValidMoveBase = (board, sr, sc, tr, tc) => {
    const piece = board[sr][sc];
    if (!piece) return false;
    if (sr === tr && sc === tc) return false;

    const target = board[tr][tc];
    if (target && target.color === piece.color) return false;

    const dR = Math.abs(tr - sr);
    const dC = Math.abs(tc - sc);
    const direction = piece.color === 'W' ? -1 : 1;
    const rowDiff = tr - sr;

    switch (piece.piece) {
        case 'Pawn': {
            if (dC === 0) {
                if (rowDiff === direction && !target) return true;
                if (rowDiff === 2 * direction && sr === (piece.color === 'W' ? 6 : 1) && !target) return true;
            }
            if (dC === 1 && rowDiff === direction && target) return true;
            return false;
        }
        case 'Rook': return (dR === 0 && dC > 0) || (dC === 0 && dR > 0);
        case 'Bishop': return dR === dC && dR > 0;
        case 'Queen': return (dR === 0 && dC > 0) || (dC === 0 && dR > 0) || (dR === dC && dR > 0);
        case 'Knight': return (dR === 2 && dC === 1) || (dR === 1 && dC === 2);
        case 'King': return dR <= 1 && dC <= 1;
        default: return false;
    }
};

const isSquareAttacked = (board, tr, tc, attackingColor) => {
    const opponentColor = attackingColor;
    
    for (let sr = 0; sr < 8; sr++) {
        for (let sc = 0; sc < 8; sc++) {
            const piece = board[sr][sc];
            if (piece && piece.color === opponentColor) {
                if (isValidMoveBase(board, sr, sc, tr, tc)) {
                    const pieceType = piece.piece;
                    if (['Rook', 'Bishop', 'Queen'].includes(pieceType)) {
                        if (!checkPathClearance(board, sr, sc, tr, tc)) continue;
                    }
                    return true;
                }
            }
        }
    }
    return false;
};

const findKing = (board, color) => {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.piece === 'King' && piece.color === color) {
                return { r, c };
            }
        }
    }
    return null; 
};

const isKingInCheck = (board, color) => {
    const kingPos = findKing(board, color);
    if (!kingPos) return false;
    const opponentColor = color === 'W' ? 'B' : 'W';
    return isSquareAttacked(board, kingPos.r, kingPos.c, opponentColor);
};

const doesMoveLeaveKingSafe = (board, sr, sc, tr, tc, turn) => {
    const newBoard = board.map(row => [...row]);
    newBoard[tr][tc] = newBoard[sr][sc];
    newBoard[sr][sc] = null;
    return !isKingInCheck(newBoard, turn);
};

const isValidMove = (board, sr, sc, tr, tc, turn) => {
    const piece = board[sr][sc];
    const target = board[tr][tc];

    if (!piece) return false;
    if (sr === tr && sc === tc) return false;
    if (piece.color !== turn) return false;
    if (target && target.color === piece.color) return false;

    if (!isValidMoveBase(board, sr, sc, tr, tc)) return false;

    const dR = Math.abs(tr - sr);
    const dC = Math.abs(tc - sc);
    const pieceType = piece.piece;

    if (['Rook', 'Bishop', 'Queen'].includes(pieceType) && (dR > 1 || dC > 1)) {
        if (!checkPathClearance(board, sr, sc, tr, tc)) return false;
    }

    return doesMoveLeaveKingSafe(board, sr, sc, tr, tc, turn);
};

const getValidMoves = (board, sr, sc, turn) => {
    const moves = [];
    for (let tr = 0; tr < 8; tr++) {
        for (let tc = 0; tc < 8; tc++) {
            if (isValidMove(board, sr, sc, tr, tc, turn)) {
                moves.push({ row: tr, col: tc });
            }
        }
    }
    return moves;
};

const checkGameEnd = (board, turn) => {
    for (let sr = 0; sr < 8; sr++) {
        for (let sc = 0; sc < 8; sc++) {
            const piece = board[sr][sc];
            if (piece && piece.color === turn) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidMove(board, sr, sc, tr, tc, turn)) {
                            return { isOver: false, result: null };
                        }
                    }
                }
            }
        }
    }

    if (isKingInCheck(board, turn)) {
        return { isOver: true, result: turn === 'W' ? 'B Wins (Checkmate)' : 'W Wins (Checkmate)' };
    } else {
        return { isOver: true, result: 'Draw (Stalemate)' };
    }
};

// ----------------------------------------------------------------------
// --- Main Component ---
// ----------------------------------------------------------------------

const ChessGame = () => {
    const [board, setBoard] = useState(initialBoard);
    const [turn, setTurn] = useState('W');
    const [selectedSquare, setSelectedSquare] = useState(null); 
    const [validMoves, setValidMoves] = useState([]);
    const [lastMove, setLastMove] = useState(null); 
    const [moveHistory, setMoveHistory] = useState([]); 
    const [gameStatus, setGameStatus] = useState({ isOver: false, result: 'Game On' });
    
    const inCheck = useMemo(() => isKingInCheck(board, turn), [board, turn]);

    // --- UPDATED sendMoveHistory: Now accepts isCheck boolean ---
    const sendMoveHistory = useCallback((history, isCheck = false) => {
        const apiUrl = 'http://127.0.0.1:5000/api/data'; 

        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                moveHistory: history,
                isCheck: isCheck // <-- NEW: Explicit Check status
            }),
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => { console.log('Success sending move history:', data); })
        .catch((error) => { console.error('Error sending move history to backend:', error); });
    }, []); 

    const handleSquareClick = useCallback((r, c) => {
        if (gameStatus.isOver) return;

        const piece = board[r][c];

        if (selectedSquare) {
            const isMoveValid = validMoves.some(m => m.row === r && m.col === c);
            const isDeselect = selectedSquare.row === r && selectedSquare.col === c;

            if (isDeselect) {
                setSelectedSquare(null);
                setValidMoves([]);
                return;
            }

            if (isMoveValid) {
                const newBoard = board.map(row => [...row]);
                const movingPiece = newBoard[selectedSquare.row][selectedSquare.col];

                // 1. Generate Standard Algebraic Notation (SAN)
                const pieceType = movingPiece.piece;
                const destination = toAlgebraic(r, c);
                const isCapture = newBoard[r][c] !== null; 
                
                let sanNotation;
                
                if (pieceType === 'Pawn') {
                    sanNotation = isCapture ? `${toAlgebraic(selectedSquare.row, selectedSquare.col).charAt(0).toLowerCase()}x${destination}` : destination;
                } else {
                    const pieceInitial = pieceType.charAt(0);
                    const pieceDesignator = pieceType === 'Knight' ? 'N' : pieceInitial;
                    sanNotation = `${pieceDesignator}${isCapture ? 'x' : ''}${destination}`;
                }

                // 2. Perform Board Update
                newBoard[r][c] = movingPiece;
                newBoard[selectedSquare.row][selectedSquare.col] = null;

                // Handle promotion
                if (movingPiece.piece === 'Pawn' && (r === 0 || r === 7)) {
                    movingPiece.piece = 'Queen';
                    sanNotation += '=Q';
                }

                // 3. Prepare for Next Turn
                const nextTurn = turn === 'W' ? 'B' : 'W';
                const newMoveHistory = [...moveHistory, sanNotation];
                
                // 4. Check for Check/Checkmate/Stalemate *for the NEXT player*
                const gameEndResult = checkGameEnd(newBoard, nextTurn);
                const isNextKingInCheck = isKingInCheck(newBoard, nextTurn); // Check status for next player

                if (gameEndResult.isOver) {
                    // Checkmate or Stalemate
                    sanNotation = gameEndResult.result.includes('Checkmate') ? sanNotation + '#' : sanNotation;
                    setGameStatus(gameEndResult);
                } else if (isNextKingInCheck) {
                    // Simple Check
                    sanNotation += '+';
                }
                
                // 5. Update States
                setBoard(newBoard);
                setLastMove({ start: selectedSquare, end: { row: r, col: c }, san: sanNotation });
                setMoveHistory(newMoveHistory); 
                setTurn(nextTurn);
                setSelectedSquare(null);
                setValidMoves([]);
                
                // *** API CALL: Pass the move history and the explicit check status ***
                sendMoveHistory(newMoveHistory, isNextKingInCheck); 
                // ********************************************************************

                return;
            }

            if (piece && piece.color === turn) {
                setSelectedSquare({ row: r, col: c });
                setValidMoves(getValidMoves(board, r, c, turn));
                return;
            }

            setSelectedSquare(null);
            setValidMoves([]);

        } else {
            if (piece && piece.color === turn) {
                setSelectedSquare({ row: r, col: c });
                setValidMoves(getValidMoves(board, r, c, turn));
            }
        }
    }, [board, turn, selectedSquare, validMoves, moveHistory, sendMoveHistory, gameStatus.isOver]);

    const handleReset = useCallback(() => {
        setBoard(initialBoard.map(row => row.map(cell => cell ? { ...cell } : null)));
        setTurn('W');
        setSelectedSquare(null);
        setValidMoves([]);
        setLastMove(null);
        setMoveHistory([]);
        setGameStatus({ isOver: false, result: 'Game On' });
        sendMoveHistory([], false); // Send empty history and false check status
    }, [sendMoveHistory]);

    const lastMoveDisplay = useMemo(() => {
        if (!lastMove) return "—";
        return `${lastMove.san}`;
    }, [lastMove]);


    const Square = ({ piece, r, c }) => {
        const isLight = (r + c) % 2 === 0;
        const isSelected = selectedSquare && selectedSquare.row === r && selectedSquare.col === c;
        const isValid = validMoves.some(m => m.row === r && m.col === c);
        const isKing = piece && piece.piece === 'King';

        const squareClass = [
            'square',
            isLight ? 'light' : 'dark',
            isSelected ? 'selected' : '',
            isValid ? 'valid-move' : '',
            isKing && inCheck && piece.color === turn ? 'king-in-check' : '',
        ].filter(Boolean).join(' ');

        const pieceClass = piece 
            ? ['piece-symbol', piece.color === 'W' ? 'piece-W' : 'piece-B'].join(' ')
            : '';

        return (
            <div className={squareClass} onClick={() => handleSquareClick(r, c)}>
                {piece ? (
                    <span className={pieceClass}>
                        {pieceSymbols[piece.piece][piece.color]}
                    </span>
                ) : isValid && !piece ? (
                    <div className="valid-move-dot"></div>
                ) : null}
            </div>
        );
    };
    
    const renderRanks = () => {
        return Array.from({ length: 8 }).map((_, i) => (<div key={i} className="coordinate">{8 - i}</div>));
    };

    const renderFiles = () => {
        return Array.from({ length: 8 }).map((_, i) => (<div key={i} className="coordinate">{String.fromCharCode(65 + i)}</div>));
    };

    const renderMoveHistory = () => {
        const moves = [];
        for (let i = 0; i < moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = moveHistory[i];
            const blackMove = moveHistory[i + 1] || '...';
            moves.push(
                <div key={i} className="history-item">
                    <span>{moveNumber}.</span>
                    <span className="history-move">{whiteMove}</span>
                    <span className="history-move">{blackMove}</span>
                </div>
            );
        }
        return moves;
    };


    return (
        <div className="container">
            <h1 className="game-title">Pure React Chess</h1>

            <div className="status-panel">
                <div className={`status-item turn-${turn} ${gameStatus.isOver ? 'game-over' : ''}`}>
                    {gameStatus.isOver ? 'Game Over!' : `Turn: ${turn === 'W' ? 'White' : 'Black'}`}
                </div>
                <div className="status-item result-display">
                    Result: **{gameStatus.result}**
                </div>
                <div className="status-item move-display">
                    Last Move: {lastMoveDisplay}
                </div>
            </div>

            <div className="game-area">
                <div className="board-wrapper">
                    <div className="coordinate-container ranks">
                        {renderRanks()}
                    </div>
                    <div className="board-grid">
                        {board.flatMap((row, r) =>
                            row.map((piece, c) => (
                                <Square key={`${r}-${c}`} piece={piece} r={r} c={c} />
                            ))
                        )}
                    </div>
                    <div className="coordinate-container files">
                        {renderFiles()}
                    </div>
                </div>
                
                <div className="history-panel">
                    <h2 className="history-title">Move History</h2>
                    <div className="history-list">
                        {renderMoveHistory()}
                    </div>
                </div>
            </div>

            <button className="reset-button" onClick={handleReset}>
                Reset Game
            </button>
        </div>
    );
};

export default ChessGame;