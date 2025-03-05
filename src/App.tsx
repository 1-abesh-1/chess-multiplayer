import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Game from './components/Game';

function App() {
  const [theme, setTheme] = useState('default');

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<Home setTheme={setTheme} />} />
          <Route path="/game/:roomId" element={<Game theme={theme} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;