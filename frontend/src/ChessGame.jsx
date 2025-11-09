import React, { useState, useCallback, useMemo } from 'react';
import './ChessGame.css';

// Helper function to convert zero-indexed column/row to algebraic notation (e.g., [7, 0] -> "A1")
const toAlgebraic = (row, col) => {
    if (row === null || col === null || row === undefined || col === undefined) return null;
    const rank = 8 - row;
    const file = String.fromCharCode(65 + col);
    return `${file}${rank}`;
};

// Piece Definitions and Symbols
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

// ----------------------------------------------------------------------
// --- CORE MOVE VALIDATION & HELPER LOGIC ---
// ----------------------------------------------------------------------

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
            const startRow = piece.color === 'W' ? 6 : 1;
            if (dC === 0 && rowDiff === direction && !target) return true;
            if (dC === 0 && rowDiff === 2 * direction && sr === startRow && !target) return true;
            if (dC === 1 && rowDiff === direction && target) return true;
            return false;
        }
        case 'Rook': return (dR === 0 && dC > 0) || (dC === 0 && dR > 0);
        case 'Bishop': return dR === dC && dR > 0;
        case 'Queen': return (dR === 0 && dC > 0) || (dC === 0 && dR > 0) || (dR === dC && dR > 0);
        case 'Knight': return (dR === 2 && dC === 1) || (dR === 1 && dC === 2);
        case 'King': {
            if (dR <= 1 && dC <= 1) return true;
            if (dR === 0 && dC === 2 && (sr === 7 || sr === 0)) return true;
            return false;
        }
        default: return false;
    }
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

    if (!piece || piece.color !== turn) return false;
    if (sr === tr && sc === tc) return false;
    if (target && target.color === piece.color) return false;

    if (!isValidMoveBase(board, sr, sc, tr, tc)) return false;

    const dR = Math.abs(tr - sr);
    const dC = Math.abs(tc - sc);
    const pieceType = piece.piece;

    // Castling Validation
    const isKing = pieceType === 'King';
    const isTwoSquareHorizontal = (Math.abs(sc - tc) === 2 && sr === tr);
    
    if (isKing && isTwoSquareHorizontal) {
        const backRank = turn === 'W' ? 7 : 0;
        if (sr !== backRank) return false;
        
        if (isKingInCheck(board, turn)) return false; 

        const passingSquareCol = (sc + tc) / 2;
        
        if (isSquareAttacked(board, sr, passingSquareCol, turn === 'W' ? 'B' : 'W')) return false;
        if (isSquareAttacked(board, tr, tc, turn === 'W' ? 'B' : 'W')) return false;
        
        if (!checkPathClearance(board, sr, sc, tr, tc)) return false;

        const rookCol = tc > sc ? 7 : 0; 
        const rookPiece = board[backRank][rookCol];
        if (!rookPiece || rookPiece.piece !== 'Rook' || rookPiece.color !== turn) return false;
        
        return true; 
    }

    // Path clearance for standard moves
    if (
        (['Rook', 'Bishop', 'Queen'].includes(pieceType) && (dR > 1 || dC > 1)) || 
        (pieceType === 'Pawn' && dR === 2)
    ) {
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

// --- SAN Generation ---
const generateSanFromCoords = (board, sr, sc, tr, tc) => {
    const movingPiece = board[sr][sc];
    if (!movingPiece) return '';

    const pieceType = movingPiece.piece;
    const destination = toAlgebraic(tr, tc); 
    const isCapture = board[tr][tc] !== null; 
    let sanNotation;
    
    const PieceDesignators = {
        'Rook': 'R', 'Knight': 'N', 'Bishop': 'B', 'Queen': 'Q', 'King': 'K'
    };
    const pieceDesignator = PieceDesignators[pieceType];

    // Check for castling
    const isKing = pieceType === 'King';
    const dC = Math.abs(tc - sc);
    if (isKing && dC === 2) {
        return dC === 2 && tc > sc ? 'O-O' : 'O-O-O';
    }

    if (pieceType === 'Pawn') {
        sanNotation = isCapture 
            ? `${toAlgebraic(sr, sc).charAt(0).toLowerCase()}x${destination}` 
            : destination;
    } else {
        sanNotation = `${pieceDesignator}${isCapture ? 'x' : ''}${destination}`;
    }
    
    // Pawn Promotion
    if (movingPiece.piece === 'Pawn' && (tr === 0 || tr === 7)) {
        sanNotation += '=Q';
    }

    return sanNotation;
};

const findMoveCoordinatesFromSAN = (board, sanMove, turn) => {
    // 1. Handle Castling First 
    if (sanMove === 'O-O' || sanMove === '0-0') {
        const backRank = turn === 'W' ? 7 : 0;
        return { sr: backRank, sc: 4, tr: backRank, tc: 6 }; 
    }
    if (sanMove === 'O-O-O' || sanMove === '0-0-0') {
        const backRank = turn === 'W' ? 7 : 0;
        return { sr: backRank, sc: 4, tr: backRank, tc: 2 };
    }
    
    // 2. Normalize received SAN: strip check/mate
    const receivedSan = sanMove.replace(/[+#]/g, '');

    for (let sr = 0; sr < 8; sr++) {
        for (let sc = 0; sc < 8; sc++) {
            const piece = board[sr][sc];
            if (piece && piece.color === turn) {
                
                const targetMoves = getValidMoves(board, sr, sc, turn);

                for (const target of targetMoves) {
                    let moveSan = generateSanFromCoords(board, sr, sc, target.row, target.col);

                    if (moveSan.toUpperCase() === receivedSan.toUpperCase()) {
                        return { sr, sc, tr: target.row, tc: target.col };
                    }
                }
            }
        }
    }
    return null; 
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

    // --- sendMoveHistory (Async API call to Flask) ---
    const sendMoveHistory = useCallback(async (history, isCheck = false, currentBoard) => {
        const apiUrl = 'http://127.0.0.1:5000/api/data'; 
        try {
            // Convert board to simple serializable format
            const serializedBoard = currentBoard.map(row => 
                row.map(cell => cell ? { piece: cell.piece, color: cell.color } : null)
            );
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    moveHistory: history, 
                    isCheck: isCheck, 
                    boardState: serializedBoard 
                }),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log('Backend response:', data);
            return data.geminiMove; 
        } catch (error) { 
            console.error('Error sending move history to backend:', error); 
            return null;
        }
    }, []); 

    // --- executeGeminiMove (Handles Black's move execution) ---
    const executeGeminiMove = useCallback((sanMove, currentBoard) => {
        if (gameStatus.isOver || !sanMove || !currentBoard) {
            console.error('Invalid parameters:', { sanMove, currentBoard, gameStatus });
            return false;
        }

        console.log(`Attempting to execute Gemini move: "${sanMove}"`);
        console.log('Using board state:', currentBoard);
        const coords = findMoveCoordinatesFromSAN(currentBoard, sanMove, 'B');

        if (!coords) {
            console.error(`Gemini move "${sanMove}" could not be executed.`);
            console.log('Current board state:', currentBoard);
            console.log('Searching for valid Black moves...');
            // Debug: Show all valid Black moves
            for (let sr = 0; sr < 8; sr++) {
                for (let sc = 0; sc < 8; sc++) {
                    const piece = currentBoard[sr][sc];
                    if (piece && piece.color === 'B') {
                        const validMoves = getValidMoves(currentBoard, sr, sc, 'B');
                        if (validMoves.length > 0) {
                            console.log(`${piece.piece} at ${toAlgebraic(sr, sc)}:`, 
                                validMoves.map(m => generateSanFromCoords(currentBoard, sr, sc, m.row, m.col)));
                        }
                    }
                }
            }
            return false;
        }

        const { sr, sc, tr, tc } = coords;

        setBoard(prevBoard => {
            const newBoard = prevBoard.map(row => [...row]);
            const movingPiece = newBoard[sr][sc];
            
            const pieceToMove = movingPiece ? { ...movingPiece } : null;

            if (!pieceToMove) return prevBoard;

            // CASTLING EXECUTION LOGIC (Black)
            const isCastling = (pieceToMove.piece === 'King' && Math.abs(sc - tc) === 2);
            
            if (isCastling) {
                let rookSrcCol, rookDestCol;
                if (tc === 6) {
                    rookSrcCol = 7; 
                    rookDestCol = 5; 
                } else if (tc === 2) {
                    rookSrcCol = 0; 
                    rookDestCol = 3; 
                }
                if (rookSrcCol !== undefined) {
                    newBoard[sr][rookDestCol] = newBoard[sr][rookSrcCol];
                    newBoard[sr][rookSrcCol] = null;
                }
            }

            // Handle promotion
            if (pieceToMove.piece === 'Pawn' && (tr === 0 || tr === 7)) {
                pieceToMove.piece = 'Queen';
            }

            // Execute King's move or standard move
            newBoard[tr][tc] = pieceToMove;
            newBoard[sr][sc] = null;

            // Execute Check/Checkmate Logic on the new board
            const nextTurn = 'W'; 
            const gameEndResult = checkGameEnd(newBoard, nextTurn);
            let finalSan = sanMove;
            
            if (gameEndResult.isOver) {
                finalSan = sanMove + (gameEndResult.result.includes('Checkmate') ? '#' : '');
                setGameStatus(gameEndResult);
            } else if (isKingInCheck(newBoard, nextTurn)) {
                finalSan = sanMove + '+';
            }
            
            // Update dependent states
            setLastMove({ start: {row: sr, col: sc}, end: {row: tr, col: tc}, san: finalSan });
            setTurn(nextTurn);
            
            return newBoard; 
        });

        setMoveHistory(prevHistory => [...prevHistory, sanMove]);
        return true;

    }, [gameStatus.isOver]);

    // --- handleSquareClick (Handles White's move and triggers Black's move) ---
    const handleSquareClick = useCallback(async (r, c) => { 
        if (gameStatus.isOver || turn !== 'W') return; 
        
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
                // --- White's Move Execution ---
                const newBoard = board.map(row => [...row]);
                const movingPiece = newBoard[selectedSquare.row][selectedSquare.col];
                let sanNotation = generateSanFromCoords(board, selectedSquare.row, selectedSquare.col, r, c);
                
                // CASTLING EXECUTION LOGIC (White)
                const movedPiece = board[selectedSquare.row][selectedSquare.col];
                const isWhiteCastling = (movedPiece.piece === 'King' && Math.abs(selectedSquare.col - c) === 2);
    
                if (isWhiteCastling) {
                    let rookSrcCol, rookDestCol;
                    if (c === 6) { 
                        rookSrcCol = 7; 
                        rookDestCol = 5; 
                        sanNotation = 'O-O'; 
                    } else if (c === 2) { 
                        rookSrcCol = 0; 
                        rookDestCol = 3; 
                        sanNotation = 'O-O-O'; 
                    }
                    
                    const rank = selectedSquare.row; 
                    if (rookSrcCol !== undefined) {
                        newBoard[rank][rookDestCol] = newBoard[rank][rookSrcCol];
                        newBoard[rank][rookSrcCol] = null;
                    }
                }

                // Perform King's move or standard piece move and Promotion for White
                newBoard[r][c] = movingPiece;
                newBoard[selectedSquare.row][selectedSquare.col] = null;
                if (movingPiece.piece === 'Pawn' && (r === 0 || r === 7)) {
                    movingPiece.piece = 'Queen';
                    sanNotation += '=Q';
                }
                
                const nextTurn = 'B';
                const newMoveHistory = [...moveHistory, sanNotation];
                
                const isNextKingInCheck = isKingInCheck(newBoard, nextTurn);
                const gameEndResult = checkGameEnd(newBoard, nextTurn);
                
                // Add Check/Checkmate Notation to White's SAN
                if (gameEndResult.isOver) {
                    sanNotation = gameEndResult.result.includes('Checkmate') ? sanNotation + '#' : sanNotation;
                    setGameStatus(gameEndResult);
                } else if (isNextKingInCheck) {
                    sanNotation += '+';
                }

                // Update States for White's move
                setBoard(newBoard);
                setLastMove({ start: selectedSquare, end: { row: r, col: c }, san: sanNotation });
                setMoveHistory(newMoveHistory); 
                setTurn(nextTurn);
                setSelectedSquare(null);
                setValidMoves([]);
                
                console.log('White move executed. New board state:', newBoard);
                console.log('Move history:', newMoveHistory);
                
                // --- ASYNC AI CALL WITH RETRY LOOP ---
                if (nextTurn === 'B' && !gameEndResult.isOver) {
                    const MAX_RETRIES = 3;
                    let moveExecuted = false;
                    
                    // CRITICAL: Use the updated newBoard that has White's move applied
                    console.log('Sending board to AI:', newBoard);
                    
                    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                        console.log(`Requesting Gemini move (Attempt ${attempt + 1}/${MAX_RETRIES})...`);
                        const geminiMoveSan = await sendMoveHistory(newMoveHistory, isNextKingInCheck, newBoard);
                        
                        if (geminiMoveSan) {
                            moveExecuted = executeGeminiMove(geminiMoveSan, newBoard);
                            if (moveExecuted) {
                                console.log(`Gemini move ${geminiMoveSan} executed successfully.`);
                                break;
                            }
                        } else {
                            break;
                        }
                    }
                    
                    if (!moveExecuted) {
                        console.error(`AI failed to execute a legal move after ${MAX_RETRIES} attempts. Player White must move again.`);
                        setTurn('W'); 
                        alert("AI failed to find a legal move. It's your turn again!");
                    }
                }
                
                return;
            }

            // Deselect or Reselect a White piece
            if (piece && piece.color === turn) {
                setSelectedSquare({ row: r, col: c });
                setValidMoves(getValidMoves(board, r, c, turn));
                return;
            }
            
            setSelectedSquare(null);
            setValidMoves([]);

        } else {
            // Initial selection: Only allow selection of White pieces
            if (piece && piece.color === turn) {
                setSelectedSquare({ row: r, col: c });
                setValidMoves(getValidMoves(board, r, c, turn));
            }
        }
    }, [board, turn, selectedSquare, validMoves, moveHistory, sendMoveHistory, executeGeminiMove, gameStatus.isOver]);

    // --- Render Functions ---
    const handleReset = useCallback(() => {
        setBoard(initialBoard.map(row => row.map(cell => cell ? { ...cell } : null)));
        setTurn('W');
        setSelectedSquare(null);
        setValidMoves([]);
        setLastMove(null);
        setMoveHistory([]);
        setGameStatus({ isOver: false, result: 'Game On' });
        sendMoveHistory([], false, initialBoard);
    }, [sendMoveHistory]);

    const lastMoveDisplay = useMemo(() => { if (!lastMove) return "—"; return `${lastMove.san}`; }, [lastMove]);
    
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
    
    const renderRanks = () => { return Array.from({ length: 8 }).map((_, i) => (<div key={i} className="coordinate">{8 - i}</div>)); };
    const renderFiles = () => { return Array.from({ length: 8 }).map((_, i) => (<div key={i} className="coordinate">{String.fromCharCode(65 + i)}</div>)); };
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
                    Result: <strong>{gameStatus.result}</strong>
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