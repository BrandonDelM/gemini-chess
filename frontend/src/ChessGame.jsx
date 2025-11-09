import React, { useState, useCallback, useMemo } from 'react';
import './ChessGame.css';

// Multiplayer / AI choice
import { getSocket, emitMove, emitJoinRoom } from './SocketManager';
const socket = getSocket();

// Helper function to convert zero-indexed column/row to algebraic notation (e.g., [7, 0] -> "A1")
const toAlgebraic = (row, col) => {
    if (row === null || col === null || row === undefined || col === undefined) return null;
    const rank = 8 - row;
    const file = String.fromCharCode(65 + col);
    return `${file}${rank}`;
};

// Piece Definitions and Symbols
const initialBoardState = [
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
// --- CORE MOVE VALIDATION & HELPER LOGIC (Unchanged) ---
// ----------------------------------------------------------------------
// Helper functions (restored for full file integrity)

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
    // Check if the current player has any legal moves.
    for (let sr = 0; sr < 8; sr++) {
        for (let sc = 0; sc < 8; sc++) {
            const piece = board[sr][sc];
            if (piece && piece.color === turn) {
                if (getValidMoves(board, sr, sc, turn).length > 0) {
                    return { isOver: false, result: null };
                }
            }
        }
    }
    
    // If no legal moves:
    if (isKingInCheck(board, turn)) {
        // Checkmate
        return { isOver: true, result: turn === 'W' ? 'B Wins (Checkmate)' : 'W Wins (Checkmate)' };
    } else {
        // Stalemate
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

                    // --- UNIVERSAL COMPARISON LOGIC: Force UPPECASE ---
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
    const [board, setBoard] = useState(initialBoardState);
    const [turn, setTurn] = useState('W');
    const [selectedSquare, setSelectedSquare] = useState(null); 
    const [validMoves, setValidMoves] = useState([]);
    const [lastMove, setLastMove] = useState(null); 
    const [moveHistory, setMoveHistory] = useState([]); 
    const [gameStatus, setGameStatus] = useState({ isOver: false, result: 'Game On' });
    
    // Game mode selector (AI by default)
    const [gameMode, setGameMode] = useState('AI');
    const [myColor, setMyColor] = useState('W'); // Color of human player, W for AI mode assigned by server for Human
    const [roomId, setRoomId] = useState('ai_game_room'); // ID fixed for AI, dynamic for Human

    const [eloSkill, setEloSkill] = useState(1000); 
    const [analysis, setAnalysis] = useState('—'); // Store the analysis evaluation
    const [replayIndex, setReplayIndex] = useState(-1); // -1 is live, 0 is game start, 1 is after move 1

    // State history: Stores board state after each move for replay
    const [boardHistory, setBoardHistory] = useState([initialBoardState]);
    
    // Determine which board to display (live or replay)
    const currentBoard = replayIndex === -1 ? board : boardHistory[replayIndex];
    
    const inCheck = useMemo(() => isKingInCheck(currentBoard, turn), [currentBoard, turn]);
    
    const fetchAnalysis = useCallback(async (currentMoves, boardIndex) => {
        setAnalysis('Analyzing...');
        const isLive = boardIndex === -1 || boardIndex === currentMoves.length;
        
        // Find the board state for the requested index
        const boardToAnalyze = isLive ? board : boardHistory[boardIndex];
        
        // FEN generation needs the board array and the move list up to the target index
        const movesUpToIndex = isLive ? currentMoves : currentMoves.slice(0, boardIndex);
        
        const serializedBoard = boardToAnalyze.map(row => 
            row.map(cell => cell ? { piece: cell.piece, color: cell.color } : null)
        );

        const analyzeUrl = 'http://127.0.0.1:5000/api/analyze';

        try {
            const response = await fetch(analyzeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    boardState: serializedBoard,
                    moveHistory: movesUpToIndex
                }),
            });
            
            if (!response.ok) throw new Error('Analysis API failed');
            
            const data = await response.json();
            setAnalysis(data.evaluation);
            
        } catch (error) {
            setAnalysis('Analysis Error');
            console.error('Failed to fetch analysis:', error);
        }
    }, [board, boardHistory]);


    // --- ELO HANDLER ---
    const handleEloChange = (e) => {
        const rawValue = e.target.value;
        
        if (rawValue === '') {
             setEloSkill('');
             return;
        }

        const value = parseInt(rawValue, 10);
        
        if (isNaN(value) || value < 600 || value > 3000) return;
        
        if (value % 100 === 0) {
            setEloSkill(value);
        }
    };
    
    // --- Move History Click Handler ---
    const handleMoveClick = useCallback((index) => {
        setReplayIndex(index);
        
        // Pass the full move history to fetchAnalysis, letting it slice if needed.
        fetchAnalysis(moveHistory, index);
    }, [moveHistory, boardHistory, fetchAnalysis]);


    // --- sendMoveHistory (Async API call to Flask) ---
    const sendMoveHistory = useCallback(async (history, isCheck = false, currentBoard, skill) => {
        const apiUrl = 'http://127.0.0.1:5000/api/data'; 
        try {
            const serializedBoard = currentBoard.map(row => 
                row.map(cell => cell ? { piece: cell.piece, color: cell.color } : null)
            );
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    moveHistory: history, 
                    isCheck: isCheck, 
                    boardState: serializedBoard,
                    eloSkill: skill
                }),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.geminiMove; 
        } catch (error) { 
            // FIX: If the backend fails for *any reason*, treat it as an AI failure to move.
            console.error('Error sending move history to backend (Total Failure):', error); 
            return null; // Returning null forces the retry loop to continue or terminate.
        }
    }, []); 

    // --- executeGeminiMove (Handles Black's move execution) ---
    const executeGeminiMove = useCallback((sanMove, currentBoard) => {
        if (gameStatus.isOver || !sanMove || !currentBoard) return false;

        const coords = findMoveCoordinatesFromSAN(currentBoard, sanMove, 'B');

        if (!coords) {
            console.error(`Gemini move "${sanMove}" could not be executed.`);
            return false; // Return false on failure
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
            
            // --- Update Board History ---
            setBoardHistory(prevHistory => [...prevHistory, newBoard]);
            setReplayIndex(-1); // Return to live view
            fetchAnalysis([...moveHistory, sanMove], -1); // Analyze the new live position
            
            return newBoard; 
        });

        setMoveHistory(prevHistory => [...prevHistory, sanMove]);
        return true; // Return success

    }, [gameStatus.isOver, eloSkill, fetchAnalysis, moveHistory]);


    // --- handleSquareClick (Handles White's move and triggers Black's move) ---
    const handleSquareClick = useCallback(async (r, c) => { 
        if (gameStatus.isOver || turn !== 'W' || replayIndex !== -1) return; // Prevent move during replay mode
        
        const piece = board[r][c];

        if (selectedSquare) {
            const isMoveValid = validMoves.some(m => m.row === r && m.col === c);
            const isDeselect = selectedSquare.row === r && selectedSquare.col === c;

            if (isDeselect) {
                setSelectedSquare(null);
                setValidMoves([]);
                return;
            }
            
            // FIX: Check for illegal King capture *before* executing the move
            const targetPiece = board[r][c];
            if (targetPiece && targetPiece.piece === 'King' && targetPiece.color === 'B') {
                setGameStatus({ isOver: true, result: 'White Wins (Checkmate)' }); // Treat King capture as checkmate
                alert("Game Over! White Wins by Checkmate.");
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
                
                // --- Update Board History ---
                setBoardHistory(prevHistory => [...prevHistory, newBoard]);
                
                setTurn(nextTurn);
                setSelectedSquare(null);
                setValidMoves([]);
                
                fetchAnalysis(newMoveHistory, -1); // Analyze the new live position
                
                // --- ASYNC AI CALL WITH RETRY LOOP (MAX_RETRIES = 10) ---
                if (nextTurn === 'B' && !gameEndResult.isOver) {
                    const MAX_RETRIES = 10;
                    let moveExecuted = false;
                    
                    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                        const currentSkill = isNaN(eloSkill) ? 1000 : eloSkill;
                        const geminiMoveSan = await sendMoveHistory(newMoveHistory, isNextKingInCheck, newBoard, currentSkill);
                        
                        if (geminiMoveSan) {
                            moveExecuted = executeGeminiMove(geminiMoveSan, newBoard);
                            if (moveExecuted) {
                                break; 
                            }
                        } else {
                                // If backend fails to respond (null/error), we break immediately.
                            break;
                        }
                    }
                    
                    if (!moveExecuted) {
                        console.error(`AI failed to execute a legal move after ${MAX_RETRIES} attempts.`);
                        
                        // CRITICAL FIX: If AI failed all attempts, declare White the winner.
                        setGameStatus({ isOver: true, result: 'White Wins (AI Failure / Checkmate)' });
                        alert("Game Over! White wins by AI failure/Checkmate.");
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
    }, [board, selectedSquare, validMoves, moveHistory, sendMoveHistory, executeGeminiMove, gameStatus.isOver, eloSkill, replayIndex, fetchAnalysis]);

    // --- Reset and Render Functions ---
    const handleReset = useCallback(() => {
        const newInitialBoard = initialBoardState.map(row => row.map(cell => cell ? { ...cell } : null));
        setBoard(newInitialBoard);
        setBoardHistory([newInitialBoard]); // Reset board history
        setReplayIndex(-1);
        setTurn('W');
        setSelectedSquare(null);
        setValidMoves([]);
        setLastMove(null);
        setMoveHistory([]);
        setGameStatus({ isOver: false, result: 'Game On' });
        setAnalysis('—');
        
        const currentSkill = isNaN(eloSkill) ? 1000 : eloSkill;
        sendMoveHistory([], false, newInitialBoard, currentSkill);
    }, [sendMoveHistory, eloSkill]);

    const lastMoveDisplay = useMemo(() => { 
        if (!lastMove) return "—"; 
        return lastMove.san; 
    }, [lastMove]);
    
    const gameStarted = moveHistory.length > 0;
    
    const Square = ({ piece, r, c }) => {
        // Use the board corresponding to the replay index
        const currentPiece = currentBoard[r][c];
        const isLight = (r + c) % 2 === 0;
        const isSelected = selectedSquare && selectedSquare.row === r && selectedSquare.col === c;
        // Only show valid moves in live mode
        const isValid = replayIndex === -1 && validMoves.some(m => m.row === r && m.col === c);
        const isKing = currentPiece && currentPiece.piece === 'King';
        // Check only applies to the live turn
        const inCheckForSquare = replayIndex === -1 && inCheck;

        const squareClass = [
            'square',
            isLight ? 'light' : 'dark',
            isSelected ? 'selected' : '',
            isValid ? 'valid-move' : '',
            // 🐛 NEW CLASS ADDITION: Add 'king-in-check' class
            isKing && inCheckForSquare && currentPiece.color === turn ? 'king-in-check' : '',
        ].filter(Boolean).join(' ');

        const pieceClass = currentPiece 
            ? ['piece-symbol', currentPiece.color === 'W' ? 'piece-W' : 'piece-B'].join(' ')
            : '';

        return (
            <div className={squareClass} onClick={() => handleSquareClick(r, c)}>
                {currentPiece ? (
                    <span className={pieceClass}>
                        {pieceSymbols[currentPiece.piece][currentPiece.color]}
                    </span>
                ) : isValid && !currentPiece ? (
                    <div className="valid-move-dot"></div>
                ) : null}
            </div>
        );
    };
    
    const renderRanks = () => { return Array.from({ length: 8 }).map((_, i) => (<div key={i} className="coordinate">{8 - i}</div>)); };
    const renderFiles = () => { return Array.from({ length: 8 }).map((_, i) => (<div key={i} className="coordinate">{String.fromCharCode(65 + i)}</div>)); };
    
    const renderMoveHistory = () => {
        const moves = [];
        // Add move 0 (initial position)
        moves.push(
            <div 
                key={0} 
                // 🐛 NEW CLASS ADDITION: Use 'history-start' class
                className={`history-start ${replayIndex === 0 ? 'selected-move' : ''}`}
                onClick={() => handleMoveClick(0)}
            >
                <span>Start</span>
            </div>
        );
        
        for (let i = 0; i < moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = moveHistory[i];
            const blackMove = moveHistory[i + 1] || '...';
            
            // White's move
            moves.push(
                <div 
                    key={`w-${i + 1}`} // Use unique key
                    // 🐛 NEW CLASS ADDITION: Use 'history-move-wrapper' class
                    className={`history-move-wrapper ${replayIndex === i + 1 ? 'selected-move' : ''}`}
                    onClick={() => handleMoveClick(i + 1)}
                >
                    <span>{moveNumber}.</span>
                    <span className="history-move">{whiteMove}</span>
                </div>
            );
            
            // Black's move
            if (moveHistory[i + 1]) {
                moves.push(
                    <div 
                        key={`b-${i + 2}`} // Use unique key
                        // 🐛 NEW CLASS ADDITION: Use 'history-move-wrapper' class
                        className={`history-move-wrapper ${replayIndex === i + 2 ? 'selected-move' : ''}`}
                        onClick={() => handleMoveClick(i + 2)}
                    >
                        {/* We hide the move number for Black's move in this structure, letting the CSS handle spacing */}
                        <span style={{opacity: 0}}>{moveNumber}.</span> 
                        <span className="history-move">{blackMove}</span>
                    </div>
                );
            }
        }
        return moves;
    };

    return (
        <div className="container">
            <h1 className="game-title">♟️ Gemini Chess ♟️</h1>

            <div className="analysis-bar">
                <span className="evaluation-label">🗡️ Evaluation:</span>
                <span className={`evaluation-score ${analysis.includes('+') ? 'white-advantage' : analysis.includes('-') ? 'black-advantage' : analysis.includes('Wins') ? 'game-end' : ''}`}>
                    {analysis}
                </span>
                {replayIndex !== -1 && (
                    <button onClick={() => handleMoveClick(moveHistory.length)} className="live-button">
                        Return to Live
                    </button>
                )}
            </div>

            <div className="settings-panel">
                <label htmlFor="elo-input">🗡️ Set Opponent ELO (600-3000, increments of 100):</label>
                <input
                    id="elo-input"
                    type="number"
                    value={eloSkill}
                    onChange={handleEloChange}
                    min="600"
                    max="3000"
                    step="100" 
                    placeholder="1000"
                    disabled={gameStarted}
                />
            </div>
            
            <div className="status-panel">
                <div className={`status-item turn-${turn} ${gameStatus.isOver ? 'game-over' : ''}`}>
                    Turn: <strong>{gameStatus.isOver ? 'Game Over!' : (turn === 'W' ? 'White' : `Black (ELO: ${isNaN(eloSkill) ? 1800 : eloSkill})`)}</strong>
                </div>
                <div className="status-item result-display">
                    Result: <strong>{gameStatus.result}</strong>
                </div>
                <div className="status-item move-display">
                    Last Move: <strong>{lastMoveDisplay}</strong>
                </div>
            </div>

            <div className="game-area">
                <div className="board-wrapper">
                    <div className="coordinate-container ranks">
                        {renderRanks()}
                    </div>
                    <div className="board-grid">
                        {currentBoard.flatMap((row, r) => // Use currentBoard (live or replay)
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
                    <h2 className="history-title">⚔️ Move History ⚔️</h2>
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