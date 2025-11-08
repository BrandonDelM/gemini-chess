import { useState } from 'react';
import './App.css';
import ChessGame from './ChessGame.jsx'

function App() {
    const [count, setCount] = useState(0)

    return (
        <>
            <h1>Apply</h1>
            <ChessGame />
        </>
    )
}

export default App;