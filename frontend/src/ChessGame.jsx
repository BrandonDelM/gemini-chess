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
    [{ piece: 'Pawn', color: 'B' }, { piece: 'Pawn', color: 'B' }, { piece: 'Pawn', color: 'B' }, { piece: 'Pawn', color: 'B' }, { piece: 'Pawn', color: 'B' }, { piece: 'Pawn', color: 'B' }, { piece: 'Pawn', color: 'B' }, { piece: 'Pawn', color: 'B' }],
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

// --- Move Validation Logic (Updated with Check/Checkmate/Stalemate) ---

// Path clearance is still needed for pieces moving in straight lines
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

// Checks if a square is attacked by the 'attackingColor'
const isSquareAttacked = (board, tr, tc, attackingColor) => {
    const opponentColor = attackingColor;
    
    for (let sr = 0; sr < 8; sr++) {
        for (let sc = 0; sc < 8; sc++) {
            const piece = board[sr][sc];
            if (piece && piece.color === opponentColor) {
                // Use a simplified validation function that ignores castling/en passant/pin checks
                if (isValidMoveBase(board, sr, sc, tr, tc)) {
                    // Path clearance is crucial for long-range pieces
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

// Base move validation logic without checking for king safety or turn/color
const isValidMoveBase = (board, sr, sc, tr, tc) => {
    const piece = board[sr][sc];
    if (!piece) return false;
    if (sr === tr && sc === tc) return false;

    const target = board[tr][tc];
    // Check if target square holds a piece of the same color (not allowed for attack checks)
    if (target && target.color === piece.color) return false;

    const dR = Math.abs(tr - sr);
    const dC = Math.abs(tc - sc);
    const direction = piece.color === 'W' ? -1 : 1;
    const rowDiff = tr - sr;

    switch (piece.piece) {
        case 'Pawn': {
            // Standard moves (forward 1 or 2)
            if (dC === 0) {
                if (rowDiff === direction && !target) return true;
                if (rowDiff === 2 * direction && sr === (piece.color === 'W' ? 6 : 1) && !target) return true;
            }
            // Capture move
            if (dC === 1 && rowDiff === direction && target) return true;
            
            // NOTE: En passant and two-step blocking are ignored here for simplicity in check logic
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

// Finds the King's position for the given color
const findKing = (board, color) => {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.piece === 'King' && piece.color === color) {
                return { r, c };
            }
        }
    }
    return null; // Should not happen in a valid game
};

// Checks if the King of 'color' is in check
const isKingInCheck = (board, color) => {
    const kingPos = findKing(board, color);
    if (!kingPos) return false;
    const opponentColor = color === 'W' ? 'B' : 'W';
    return isSquareAttacked(board, kingPos.r, kingPos.c, opponentColor);
};

// Simulates a move and checks if the King is safe afterwards
const doesMoveLeaveKingSafe = (board, sr, sc, tr, tc, turn) => {
    // 1. Simulate the move
    const newBoard = board.map(row => [...row]);
    newBoard[tr][tc] = newBoard[sr][sc];
    newBoard[sr][sc] = null;

    // 2. Check if the current player's King is in check on the new board
    return !isKingInCheck(newBoard, turn);
};


// --- Core Validation Function (Re-used from before, but now calls King safety check) ---
const isValidMove = (board, sr, sc, tr, tc, turn) => {
    const piece = board[sr][sc];
    const target = board[tr][tc];

    if (!piece) return false;
    if (sr === tr && sc === tc) return false;
    if (piece.color !== turn) return false; // Must be the player's turn
    if (target && target.color === piece.color) return false;

    // First, check basic piece movement rule using the existing logic (simplified/base)
    if (!isValidMoveBase(board, sr, sc, tr, tc)) return false;

    // Second, check path clearance for long-range pieces
    const dR = Math.abs(tr - sr);
    const dC = Math.abs(tc - sc);
    const pieceType = piece.piece;

    if (['Rook', 'Bishop', 'Queen'].includes(pieceType) && (dR > 1 || dC > 1)) {
        if (!checkPathClearance(board, sr, sc, tr, tc)) return false;
    }

    // Third, check if the move leaves the King in check (The essential chess rule!)
    return doesMoveLeaveKingSafe(board, sr, sc, tr, tc, turn);
};

// Gets all *legal* moves for the current player
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

// Checks for Checkmate/Stalemate
const checkGameEnd = (board, turn) => {
    // 1. Find all possible *legal* moves for the current player
    for (let sr = 0; sr < 8; sr++) {
        for (let sc = 0; sc < 8; sc++) {
            const piece = board[sr][sc];
            if (piece && piece.color === turn) {
                // If any piece has at least one legal move, the game is not over
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidMove(board, sr, sc, tr, tc, turn)) {
                            return { isOver: false, result: null }; // Game continues
                        }
                    }
                }
            }
        }
    }

    // 2. If no legal moves are found, check if it's checkmate or stalemate
    if (isKingInCheck(board, turn)) {
        return { isOver: true, result: turn === 'W' ? 'B Wins (Checkmate)' : 'W Wins (Checkmate)' };
    } else {
        return { isOver: true, result: 'Draw (Stalemate)' };
    }
};


const ChessGame = () => {
    const [board, setBoard] = useState(initialBoard);
    const [turn, setTurn] = useState('W');
    const [selectedSquare, setSelectedSquare] = useState(null); // {row, col}
    const [validMoves, setValidMoves] = useState([]);
    const [lastMove, setLastMove] = useState(null); // { start: {row, col}, end: {row, col}, san: string }
    const [moveHistory, setMoveHistory] = useState([]); // Array of strings (SAN)
    const [gameStatus, setGameStatus] = useState({ isOver: false, result: 'Game On' });
    
    // Determine if the current player is in check
    const inCheck = useMemo(() => isKingInCheck(board, turn), [board, turn]);

    // Send history to backend (unchanged)
    const sendMoveHistory = useCallback((history) => {
        // ... (API call logic remains the same)
        const apiUrl = 'http://127.0.0.1:5000/api/data'; 

        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moveHistory: history }),
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => { console.log('Success sending move history:', data); })
        .catch((error) => { console.error('Error sending move history to backend:', error); });
    }, []); 

    const handleSquareClick = useCallback((r, c) => {
        if (gameStatus.isOver) return; // Ignore clicks if game is over

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
                // Execute the move
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

                // Check for pawn promotion (simplified to Queen)
                if (movingPiece.piece === 'Pawn' && (r === 0 || r === 7)) {
                    movingPiece.piece = 'Queen';
                    sanNotation += '=Q'; // Add promotion indicator
                }

                // 3. Update States
                const nextTurn = turn === 'W' ? 'B' : 'W';
                const newMoveHistory = [...moveHistory, sanNotation];
                
                setBoard(newBoard);
                setLastMove({ start: selectedSquare, end: { row: r, col: c }, san: sanNotation });
                setMoveHistory(newMoveHistory); 
                sendMoveHistory(newMoveHistory); 
                setTurn(nextTurn);
                setSelectedSquare(null);
                setValidMoves([]);

                // 4. Check for Checkmate/Stalemate *for the NEXT player*
                const gameEndResult = checkGameEnd(newBoard, nextTurn);
                if (gameEndResult.isOver) {
                    // Update SAN with check/checkmate indicator
                    sanNotation = gameEndResult.result.includes('Checkmate') ? sanNotation + '#' : sanNotation;
                    setLastMove(prev => ({ ...prev, san: sanNotation }));
                    setGameStatus(gameEndResult);
                } else if (isKingInCheck(newBoard, nextTurn)) {
                    // Update SAN with check indicator
                    sanNotation += '+';
                    setLastMove(prev => ({ ...prev, san: sanNotation }));
                }

                return;
            }

            if (piece && piece.color === turn) {
                // Select a new piece of the current player's color
                setSelectedSquare({ row: r, col: c });
                setValidMoves(getValidMoves(board, r, c, turn));
                return;
            }

            setSelectedSquare(null);
            setValidMoves([]);

        } else {
            // No piece selected: Attempt to select a piece
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
        sendMoveHistory([]); // Send empty history on reset
    }, [sendMoveHistory]);

    const lastMoveDisplay = useMemo(() => {
        if (!lastMove) return "—";
        return `${lastMove.san}`;
    }, [lastMove]);
    
    // --- Display Components (Square, Ranks, Files, History) remain largely the same ---

    const Square = ({ piece, r, c }) => {
        const isLight = (r + c) % 2 === 0;
        const isSelected = selectedSquare && selectedSquare.row === r && selectedSquare.col === c;
        const isValid = validMoves.some(m => m.row === r && m.col === c);
        const isKing = piece && piece.piece === 'King';

        // Conditional classes based on state
        const squareClass = [
            'square',
            isLight ? 'light' : 'dark',
            isSelected ? 'selected' : '',
            isValid ? 'valid-move' : '',
            isKing && inCheck && piece.color === turn ? 'king-in-check' : '', // Highlight King in Check
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
    
    // ... renderRanks, renderFiles, and renderMoveHistory functions are omitted for brevity ...
    // ... they remain the same as the user's initial code ...

    const renderRanks = () => { /* ... unchanged ... */ return Array.from({ length: 8 }).map((_, i) => (<div key={i} className="coordinate">{8 - i}</div>)); };
    const renderFiles = () => { /* ... unchanged ... */ return Array.from({ length: 8 }).map((_, i) => (<div key={i} className="coordinate">{String.fromCharCode(65 + i)}</div>)); };
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