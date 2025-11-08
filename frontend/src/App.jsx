import React from 'react';
// Assuming ChessGame.jsx is in the same directory as App.jsx
import ChessGame from './ChessGame.jsx'; 

const App = () => {
  return (
    <div className="App">
      {/* Render the Chess Game component */}
      <ChessGame />
      
      {/* You can add other elements here if needed */}
    </div>
  );
};

export default App;