import React, { useState } from 'react';
import ChessGame from './ChessGame'; // Assuming ChessGame is in the same directory
import './ChessGame.css'; // Use the same CSS for consistent theming

// Define constants for the game modes
const GAME_MODE = {
    LOBBY: 'LOBBY',
    VS_AI: 'VS_AI',
    VS_USER: 'VS_USER' // For future user vs. user implementation
};

const Lobby = () => {
    // State to track the current view (Lobby, AI Game, User Game)
    const [currentMode, setCurrentMode] = useState(GAME_MODE.LOBBY);

    // This component will render the main lobby view with buttons
    const renderLobby = () => (
        <div className="container lobby-container">
            <h1 className="game-title">Welcome to Gemini Chess! ♟️</h1>
            <p className="lobby-subtitle">Choose your opponent:</p>

            <div className="button-group">
                <button
                    className="mode-button ai-button"
                    onClick={() => setCurrentMode(GAME_MODE.VS_AI)}
                >
                    <span className="button-icon">🤖</span>
                    <span className="button-text">Play Against Gemini AI</span>
                </button>

                <button
                    className="mode-button user-button"
                    onClick={() => {
                        // In a real app, this would trigger matchmaking
                        alert("Finding opponent... (Feature coming soon!)");
                        // For now, we'll switch the view, but you might want matchmaking logic here
                        setCurrentMode(GAME_MODE.VS_USER); 
                    }}
                >
                    <span className="button-icon">🧑‍🤝‍🧑</span>
                    <span className="button-text">Find a Human Opponent</span>
                </button>
            </div>
            
            <div className="game-status-box">
                <p>Status: **Ready to Play**</p>
                <p>Your goal is to beat the AI or challenge a friend!</p>
            </div>
        </div>
    );
    
    // Renders the appropriate game component based on the selected mode
    const renderGame = () => {
        if (currentMode === GAME_MODE.VS_AI) {
            return (
                <div className="game-wrapper">
                    <button className="back-button" onClick={() => setCurrentMode(GAME_MODE.LOBBY)}>
                        ← Back to Lobby
                    </button>
                    {/* Render ChessGame.jsx. You can pass props here to distinguish modes. */}
                    <ChessGame gameMode="AI" />
                </div>
            );
        }

        if (currentMode === GAME_MODE.VS_USER) {
            return (
                <div className="game-wrapper">
                    <button className="back-button" onClick={() => setCurrentMode(GAME_MODE.LOBBY)}>
                        ← Back to Lobby
                    </button>
                    <div className="temp-multiplayer-placeholder">
                        <h2 className="game-title">Multiplayer Game (In Progress)</h2>
                        <p>This would be the live ChessGame component connected to a web socket for P2P moves.</p>
                        {/* You would eventually replace this placeholder with: 
                        <ChessGame gameMode="Multiplayer" /> 
                        */}
                    </div>
                </div>
            );
        }

        return renderLobby();
    };

    return (
        <div className="app-main">
            {renderGame()}
        </div>
    );
};

export default Lobby;