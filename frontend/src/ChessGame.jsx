import React, { useState, useCallback, useMemo } from 'react';

// Helper function to convert zero-indexed column/row to algebraic notation (e.g., [7, 0] -> "A1")
const toAlgebraic = (row, col) => {
    if (row === null || col === null) return null;
    const rank = 8 - row; // Rows 7(White) -> 0(Black) map to Ranks 1 -> 8
    const file = String.fromCharCode(65 + col);
    return `${file}${rank}`;
};

// Piece Definitions
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

// Map piece names to unicode characters
const pieceSymbols = {
    'Rook': { W: '♜', B: '♖' },
    'Knight': { W: '♞', B: '♘' },
    'Bishop': { W: '♝', B: '♗' },
    'Queen': { W: '♛', B: '♕' },
    'King': { W: '♚', B: '♔' },
    'Pawn': { W: '♟', B: '♙' },
};

// --- Move Validation Logic (Simplified: no 'check' checking) ---

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

const getValidMoves = (board, sr, sc, turn) => {
    const piece = board[sr][sc];
    if (!piece || piece.color !== turn) return [];

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

const isValidMove = (board, sr, sc, tr, tc, turn) => {
    const piece = board[sr][sc];
    const target = board[tr][tc];

    // Basic Checks
    if (!piece) return false;
    if (sr === tr && sc === tc) return false;
    if (target && target.color === piece.color) return false;

    const dR = Math.abs(tr - sr);
    const dC = Math.abs(tc - sc);
    // Row 7 (White) -> Row 0 (Black) is negative direction for White
    const direction = piece.color === 'W' ? -1 : 1;
    const rowDiff = tr - sr;

    switch (piece.piece) {
        case 'Pawn': {
            const startRow = piece.color === 'W' ? 6 : 1;

            // 1-step forward
            if (dC === 0 && rowDiff === direction && !target) return true;

            // 2-step forward from start
            if (dC === 0 && rowDiff === 2 * direction && sr === startRow && !target && checkPathClearance(board, sr, sc, tr, tc)) return true;

            // Diagonal capture
            if (dC === 1 && rowDiff === direction && target) return true;

            return false;
        }
        case 'Rook': {
            if ((dR === 0 && dC > 0) || (dC === 0 && dR > 0)) {
                return checkPathClearance(board, sr, sc, tr, tc);
            }
            return false;
        }
        case 'Bishop': {
            if (dR === dC && dR > 0) {
                return checkPathClearance(board, sr, sc, tr, tc);
            }
            return false;
        }
        case 'Queen': {
            if ((dR === 0 && dC > 0) || (dC === 0 && dR > 0) || (dR === dC && dR > 0)) {
                return checkPathClearance(board, sr, sc, tr, tc);
            }
            return false;
        }
        case 'Knight': {
            return (dR === 2 && dC === 1) || (dR === 1 && dC === 2);
        }
        case 'King': {
            // Simple 1-square move
            return dR <= 1 && dC <= 1;
        }
        default:
            return false;
    }
};

const ChessGame = () => {
    const [board, setBoard] = useState(initialBoard);
    const [turn, setTurn] = useState('W');
    const [selectedSquare, setSelectedSquare] = useState(null); // {row, col}
    const [validMoves, setValidMoves] = useState([]);
    const [lastMove, setLastMove] = useState(null); // { start: {row, col}, end: {row, col} }

    const handleSquareClick = useCallback((r, c) => {
        const piece = board[r][c];

        if (selectedSquare) {
            const isMoveValid = validMoves.some(m => m.row === r && m.col === c);
            const isDeselect = selectedSquare.row === r && selectedSquare.col === c;

            if (isDeselect) {
                // Deselect the piece
                setSelectedSquare(null);
                setValidMoves([]);
                return;
            }

            if (isMoveValid) {
                // Execute the move
                const newBoard = board.map(row => [...row]);
                const movingPiece = newBoard[selectedSquare.row][selectedSquare.col];

                // Check for pawn promotion (simplified to Queen)
                if (movingPiece.piece === 'Pawn' && (r === 0 || r === 7)) {
                    movingPiece.piece = 'Queen';
                }

                newBoard[r][c] = movingPiece;
                newBoard[selectedSquare.row][selectedSquare.col] = null;

                setBoard(newBoard);
                setLastMove({ start: selectedSquare, end: { row: r, col: c } });
                setTurn(turn === 'W' ? 'B' : 'W');
                setSelectedSquare(null);
                setValidMoves([]);
                return;
            }

            if (piece && piece.color === turn) {
                // Select a new piece of the current player's color
                setSelectedSquare({ row: r, col: c });
                setValidMoves(getValidMoves(board, r, c, turn));
                return;
            }

            // Clicked an invalid move target or an opponent's piece when a piece was selected
            setSelectedSquare(null);
            setValidMoves([]);

        } else {
            // No piece selected: Attempt to select a piece
            if (piece && piece.color === turn) {
                setSelectedSquare({ row: r, col: c });
                setValidMoves(getValidMoves(board, r, c, turn));
            }
        }
    }, [board, turn, selectedSquare, validMoves]);

    const handleReset = useCallback(() => {
        setBoard(initialBoard.map(row => row.map(cell => cell ? { ...cell } : null)));
        setTurn('W');
        setSelectedSquare(null);
        setValidMoves([]);
        setLastMove(null);
    }, []);

    const lastMoveNotation = useMemo(() => {
        if (!lastMove) return "—";
        const start = toAlgebraic(lastMove.start.row, lastMove.start.col);
        const end = toAlgebraic(lastMove.end.row, lastMove.end.col);
        return `${start} → ${end}`;
    }, [lastMove]);

    // Inline CSS for the entire component (replacing Tailwind/shadcn)
    // Styles are defined with specific names to prevent the circular dependency error
    const styleDefinitions = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            backgroundColor: '#1e1e1e', // Dark background
            color: '#f0f0f0',
            minHeight: '100vh',
            fontFamily: 'Arial, sans-serif'
        },
        gameTitle: {
            fontSize: '2.5em',
            fontWeight: 'bold',
            marginBottom: '20px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            letterSpacing: '1px'
        },
        statusPanel: {
            display: 'flex',
            justifyContent: 'space-between',
            width: 'min(90vw, 600px)',
            marginBottom: '20px',
            padding: '10px 15px',
            backgroundColor: '#2c2c2c',
            border: '1px solid #444',
            borderRadius: '8px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
            gap: '15px',
        },
        statusItemBase: {
            fontSize: '1em',
            fontWeight: '600',
            padding: '5px 10px',
            borderRadius: '4px',
            textAlign: 'center',
            flexGrow: 1,
        },
        turnDisplay: {
            color: turn === 'W' ? '#1e1e1e' : '#f0f0f0',
            backgroundColor: turn === 'W' ? '#f8f9fa' : '#495057',
            border: `1px solid ${turn === 'W' ? '#ced4da' : '#343a40'}`,
            boxShadow: `0 2px 4px ${turn === 'W' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.5)'}`,
            transition: 'background-color 0.3s',
        },
        moveDisplay: {
            color: '#ced4da',
            fontWeight: 'normal',
            fontSize: '0.9em',
            backgroundColor: '#343a40',
        },
        boardWrapper: {
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gridTemplateRows: '1fr auto',
            maxWidth: '600px',
            maxHeight: '600px',
            width: '90vw',
            height: '90vw',
            margin: '0 auto',
            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            overflow: 'hidden',
        },
        boardGrid: {
            gridColumn: '2 / 3',
            gridRow: '1 / 2',
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gridTemplateRows: 'repeat(8, 1fr)',
            border: '1px solid #444',
        },
        coordinateContainer: {
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            color: '#888',
            fontSize: '0.8em',
        },
        ranks: {
            gridColumn: '1 / 2',
            gridRow: '1 / 2',
            flexDirection: 'column',
            padding: '0 4px',
            justifyContent: 'space-around',
        },
        files: {
            gridColumn: '2 / 3',
            gridRow: '2 / 3',
            flexDirection: 'row',
            padding: '4px 0',
        },
        coordinate: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
        },
        squareBase: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 'min(5vw, 40px)', // Responsive piece size
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'background-color 0.1s ease, box-shadow 0.1s ease',
            position: 'relative',
        },
        lightSquare: {
            backgroundColor: '#e9ecef', // Very light gray
            color: '#1a1a1a',
        },
        darkSquare: {
            backgroundColor: '#495057', // Medium dark gray
            color: '#f0f0f0',
        },
        pieceBase: {
            fontWeight: 'bold',
            fontSize: '1.2em', // To make unicode symbols bigger
            lineHeight: '1',
        },
        whitePiece: {
            color: '#f0f0f0',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
        },
        blackPiece: {
            color: '#1a1a1a',
            textShadow: '1px 1px 2px rgba(255, 255, 255, 0.5)',
        },
        // Dynamic Highlights
        selected: {
            boxShadow: 'inset 0 0 0 4px #ffc107', // Gold ring
        },
        validMove: {
            backgroundColor: '#4CAF50', // Green for valid moves
            boxShadow: 'inset 0 0 8px rgba(0, 0, 0, 0.5)',
            border: '2px solid #2e7d32',
        },
        resetButton: {
            marginTop: '20px',
            padding: '10px 20px',
            fontSize: '1em',
            cursor: 'pointer',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            transition: 'background-color 0.2s, transform 0.1s',
        }
    };
    
    // Combining common styles for coordinates
    const ranksStyle = { ...styleDefinitions.coordinateContainer, ...styleDefinitions.ranks };
    const filesStyle = { ...styleDefinitions.coordinateContainer, ...styleDefinitions.files };

    const Square = ({ piece, r, c }) => {
        const isLight = (r + c) % 2 === 0;
        const isSelected = selectedSquare && selectedSquare.row === r && selectedSquare.col === c;
        const isValid = validMoves.some(m => m.row === r && m.col === c);

        let style = {
            ...styleDefinitions.squareBase,
            ...(isLight ? styleDefinitions.lightSquare : styleDefinitions.darkSquare),
        };

        if (isSelected) {
            style = { ...style, ...styleDefinitions.selected, backgroundColor: isLight ? '#ffe5a8' : '#cc9a00' };
        } else if (isValid) {
            style = { ...style, ...styleDefinitions.validMove };
            if (!piece) {
                // Dot indicator for empty squares
                style.position = 'relative';
            }
        }

        const pieceStyle = piece ? { ...styleDefinitions.pieceBase, ...(piece.color === 'W' ? styleDefinitions.whitePiece : styleDefinitions.blackPiece) } : {};

        return (
            <div style={style} onClick={() => handleSquareClick(r, c)}>
                {piece ? (
                    <span style={pieceStyle}>
                        {pieceSymbols[piece.piece][piece.color]}
                    </span>
                ) : isValid && !piece ? (
                    <div style={{ position: 'absolute', width: '20%', height: '20%', borderRadius: '50%', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}></div>
                ) : null}
            </div>
        );
    };

    const renderRanks = () => {
        return Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={styleDefinitions.coordinate}>
                {8 - i}
            </div>
        ));
    };

    const renderFiles = () => {
        return Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={styleDefinitions.coordinate}>
                {String.fromCharCode(65 + i)}
            </div>
        ));
    };

    return (
        <div style={styleDefinitions.container}>
            <h1 style={styleDefinitions.gameTitle}>Pure React Chess</h1>

            <div style={styleDefinitions.statusPanel}>
                <div style={{ ...styleDefinitions.statusItemBase, ...styleDefinitions.turnDisplay }}>
                    Turn: {turn === 'W' ? 'White' : 'Black'}
                </div>
                <div style={{ ...styleDefinitions.statusItemBase, ...styleDefinitions.moveDisplay }}>
                    Last Move: {lastMoveNotation}
                </div>
            </div>

            <div style={styleDefinitions.boardWrapper}>
                {/* Ranks (1-8) */}
                <div style={ranksStyle}>
                    {renderRanks()}
                </div>

                {/* The Chess Grid */}
                <div style={styleDefinitions.boardGrid}>
                    {board.flatMap((row, r) =>
                        row.map((piece, c) => (
                            <Square key={`${r}-${c}`} piece={piece} r={r} c={c} />
                        ))
                    )}
                </div>

                {/* Files (A-H) */}
                <div style={filesStyle}>
                    {renderFiles()}
                </div>
            </div>

            <button style={styleDefinitions.resetButton} onClick={handleReset}>
                Reset Game
            </button>
        </div>
    );
};

export default ChessGame;