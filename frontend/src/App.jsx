import React from 'react';
// Assuming ChessGame.jsx is in the same directory as App.jsx
import Lobby from './Lobby.jsx'; 

const App = () => {
  return (
    <div className="App">
      {/* Render the Chess Game component */}
      <Lobby />
      
      {/* You can add other elements here if needed */}
    </div>
  );
};

export default App;