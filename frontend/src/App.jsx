import React, { useState, useCallback, useMemo } from 'react';

// --- Configuration and Constants ---

// Unicode Chess Pieces (White/Black)
const PIECES = {
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙', // White
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟', // Black
    '.': null // Empty square
};

const STARTING_BOARD = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

// --- Helper Functions ---

// Converts [row, col] (0-7, 0-7) to algebraic notation (A1-H8)
const toAlgebraicNotation = (r, c) => {
    if (r === undefined || c === undefined) return '';
    const colChar = String.fromCharCode(97 + c); // 97 is 'a'
    const rowNum = 8 - r;
    return `${colChar}${rowNum}`;
};

const getPieceColor = (piece) => {
    if (!piece || piece === '.') return null;
    return piece === piece.toUpperCase() ? 'w' : 'b';
};

// Check if a move is within bounds
const isWithinBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

// Check if the path is clear between two squares (for Rooks, Bishops, Queens)
const isPathClear = (board, r1, c1, r2, c2) => {
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);

    let r = r1 + dr;
    let c = c1 + dc;
    while (r !== r2 || c !== c2) {
        if (board[r][c] !== '.') {
            return false;
        }
        r += dr;
        c += dc;
    }
    return true;
};

// --- Move Validation Logic ---

const validateMove = (board, r1, c1, r2, c2) => {
    const piece = board[r1][c1];
    if (!piece || piece === '.' || !isWithinBounds(r2, c2)) return false;

    const pieceType = piece.toLowerCase();
    const targetPiece = board[r2][c2];
    const pieceColor = getPieceColor(piece);
    const targetColor = getPieceColor(targetPiece);

    // 1. Cannot move to a square occupied by your own piece
    if (targetColor === pieceColor) return false;

    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);

    switch (pieceType) {
        case 'k': // King
            return dr <= 1 && dc <= 1;

        case 'q': // Queen (Rook + Bishop)
            if ((r1 === r2 || c1 === c2 || dr === dc) && (r1 !== r2 || c1 !== c2)) {
                return isPathClear(board, r1, c1, r2, c2);
            }
            return false;

        case 'r': // Rook
            if ((r1 === r2 && c1 !== c2) || (c1 === c2 && r1 !== r2)) {
                return isPathClear(board, r1, c1, r2, c2);
            }
            return false;

        case 'b': // Bishop
            if (dr === dc && dr !== 0) {
                return isPathClear(board, r1, c1, r2, c2);
            }
            return false;

        case 'n': // Knight
            return (dr === 1 && dc === 2) || (dr === 2 && dc === 1);

        case 'p': // Pawn
            const direction = pieceColor === 'w' ? -1 : 1; // White moves up (r-1), Black moves down (r+1)

            // Forward movement (no capture)
            if (c1 === c2) {
                // 1 square forward
                if (r2 === r1 + direction && targetPiece === '.') {
                    return true;
                }
                // 2 squares forward on first move
                if (r1 === (pieceColor === 'w' ? 6 : 1) && r2 === r1 + 2 * direction && targetPiece === '.') {
                    // Check if the square in between is clear
                    if (board[r1 + direction][c1] === '.') {
                        return true;
                    }
                }
            }
            // Capture (diagonal)
            else if (dr === 1 && dc === 1 && r2 === r1 + direction) {
                return targetColor !== null && targetColor !== pieceColor;
            }
            return false;

        default:
            return false;
    }
};

const generateValidMoves = (board, r, c) => {
    const moves = [];
    for (let tr = 0; tr < 8; tr++) {
        for (let tc = 0; tc < 8; tc++) {
            if (validateMove(board, r, c, tr, tc)) {
                moves.push([tr, tc]);
            }
        }
    }
    return moves;
};

// --- React Component ---

const App = () => {
    const [board, setBoard] = useState(STARTING_BOARD.map(row => [...row]));
    const [selectedSquare, setSelectedSquare] = useState(null); // {r, c}
    const [turn, setTurn] = useState('w'); // 'w' or 'b'
    const [lastMove, setLastMove] = useState(null); // {from: 'a2', to: 'a4'}

    // Memoize the valid moves for the currently selected piece
    const validMoves = useMemo(() => {
        if (!selectedSquare) return [];
        return generateValidMoves(board, selectedSquare.r, selectedSquare.c);
    }, [board, selectedSquare]);

    const resetGame = useCallback(() => {
        setBoard(STARTING_BOARD.map(row => [...row]));
        setSelectedSquare(null);
        setTurn('w');
        setLastMove(null);
    }, []);

    const handleClick = useCallback((r, c) => {
        const piece = board[r][c];
        const pieceColor = getPieceColor(piece);

        // Case 1: Select a piece
        if (!selectedSquare && pieceColor === turn) {
            setSelectedSquare({ r, c });
            return;
        }

        // Case 2: Deselect (click selected piece again)
        if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
            setSelectedSquare(null);
            return;
        }

        // Case 3: Select a new friendly piece
        if (selectedSquare && pieceColor === turn) {
            setSelectedSquare({ r, c });
            return;
        }

        // Case 4: Move the selected piece
        if (selectedSquare) {
            const isMoveValid = validMoves.some(move => move[0] === r && move[1] === c);

            if (isMoveValid) {
                const newBoard = board.map(row => [...row]);
                const fromR = selectedSquare.r;
                const fromC = selectedSquare.c;

                const fromNotation = toAlgebraicNotation(fromR, fromC);
                const toNotation = toAlgebraicNotation(r, c);

                // Perform the move
                newBoard[r][c] = newBoard[fromR][fromC];
                newBoard[fromR][fromC] = '.'; // Empty the source square

                // Handle Pawn Promotion (simplified: auto-promote to Queen)
                if (newBoard[r][c].toLowerCase() === 'p' && (r === 0 || r === 7)) {
                    newBoard[r][c] = turn === 'w' ? 'Q' : 'q';
                }

                setBoard(newBoard);
                setTurn(turn === 'w' ? 'b' : 'w');
                setLastMove({ from: fromNotation, to: toNotation });
                setSelectedSquare(null);

            } else {
                // Invalid move attempt (or clicking on opponent piece)
                setSelectedSquare(null); // Clear selection on invalid move for simplicity
            }
        }
    }, [board, selectedSquare, turn, validMoves]);

    const renderSquare = (pieceChar, r, c) => {
        const isLight = (r + c) % 2 === 0;
        const colorClass = isLight ? 'bg-amber-100' : 'bg-green-700';
        const piece = PIECES[pieceChar];

        const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
        const isPossibleMove = validMoves.some(move => move[0] === r && move[1] === c);
        const pieceColorClass = getPieceColor(pieceChar) === 'w' ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]' : 'text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]';

        let extraClass = '';
        if (isSelected) {
            extraClass = 'bg-sky-400/80 ring-4 ring-sky-700 shadow-xl';
        } else if (isPossibleMove) {
            extraClass = 'bg-emerald-500/80 hover:bg-emerald-600/90 ring-4 ring-emerald-300';
        } else {
            extraClass = isLight ? 'hover:bg-amber-200' : 'hover:bg-green-800';
        }

        return (
            <div
                key={`${r}${c}`}
                className={`w-full h-full flex items-center justify-center text-5xl font-extrabold transition-all duration-150 rounded-sm cursor-pointer ${colorClass} ${extraClass}`}
                onClick={() => handleClick(r, c)}
            >
                {piece && (
                    <span className={`select-none ${pieceColorClass}`}>
                        {piece}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center font-sans">
            <header className="w-full max-w-2xl text-center mb-6">
                <h1 className="text-4xl font-extrabold text-indigo-400 mb-2 drop-shadow-lg">
                    React Chess Board
                </h1>
                <p className="text-sm text-gray-400">
                    Pure component-based implementation without external chess libraries.
                </p>
            </header>

            {/* Status Panel */}
            <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-xl shadow-2xl mb-6 flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
                <div className="text-xl font-bold">
                    <span className="text-gray-400">Turn: </span>
                    <span className={turn === 'w' ? 'text-white' : 'text-black bg-white rounded px-2 py-1 shadow'}>
                        {turn === 'w' ? 'White' : 'Black'}
                    </span>
                </div>
                <div className="text-lg text-gray-300 font-medium">
                    Last Move: <span className="text-yellow-400">
                        {lastMove ? `${lastMove.from} → ${lastMove.to}` : '-'}
                    </span>
                </div>
                <button
                    onClick={resetGame}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition duration-200 shadow-md transform hover:scale-[1.02]"
                >
                    Reset Game
                </button>
            </div>

            {/* Chess Board Container */}
            <div className="w-full max-w-xl aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-gray-700">
                <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                    {board.map((row, r) => (
                        row.map((piece, c) => renderSquare(piece, r, c))
                    ))}
                </div>
            </div>

            <footer className="w-full max-w-2xl mt-6 text-center text-gray-500 text-xs">
                <p>
                    <span className="font-bold text-red-400">NOTE:</span> This is a simplified game. It does not enforce 'Check,' 'Checkmate,' 'Castling,' 'En Passant,' or other complex rules.
                </p>
            </footer>
        </div>
    );
};

export default App;