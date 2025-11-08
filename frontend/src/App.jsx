import { useState } from 'react';
import './App.css';
import ChessGame from './ChessGame.jsx'

function App() {
    const [count, setCount] = useState(0)

    return (
        <>
            <ChessGame />
        </>
    )
}

export default App;