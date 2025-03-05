import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Monitor, Users, Palette, Bot, UserPlus, MousePointer, GripHorizontal, Brain } from 'lucide-react';
import { engines } from '../ai/engines';

interface HomeProps {
  setTheme: (theme: string) => void;
}

const themes = [
  { name: 'default', label: 'Classic Wood', colors: ['#b58863', '#f0d9b5'] },
  { name: 'ocean', label: 'Ocean Blue', colors: ['#4a7b9d', '#c2d7e3'] },
  { name: 'forest', label: 'Forest Green', colors: ['#5b8c5a', '#c8d6c7'] },
  { name: 'royal', label: 'Royal Purple', colors: ['#8b4513', '#e6d0e9'] }
];

const Home: React.FC<HomeProps> = ({ setTheme }) => {
  const navigate = useNavigate();
  const [showThemes, setShowThemes] = useState(false);
  const [selectedColor, setSelectedColor] = useState<'white' | 'black'>('white');
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [moveStyle, setMoveStyle] = useState<'drag' | 'click'>('drag');
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState('stockfish');
  const [selectedLevel, setSelectedLevel] = useState('medium');

  const createRoom = () => {
    const roomId = uuidv4();
    navigate(`/game/${roomId}?mode=multiplayer&color=${selectedColor}&moveStyle=${moveStyle}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomIdInput.trim()) {
      navigate(`/game/${roomIdInput}?mode=multiplayer&color=${selectedColor === 'white' ? 'black' : 'white'}&moveStyle=${moveStyle}`);
    }
  };

  const playWithBot = () => {
    const roomId = uuidv4();
    navigate(`/game/${roomId}?mode=bot&color=${selectedColor}&moveStyle=${moveStyle}&engine=${selectedEngine}&level=${selectedLevel}`);
  };

  const enginesList = Object.entries(engines);
  const currentEngine = engines[selectedEngine];
  const engineLevels = currentEngine ? Object.entries(currentEngine.levels) : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-8">Chess Game</h1>
        
        <div className="space-y-4">
          <div className="mb-6">
            <p className="text-gray-700 mb-2">Movement Style:</p>
            <div className="flex gap-4">
              <button
                onClick={() => setMoveStyle('drag')}
                className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                  moveStyle === 'drag'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border-2 border-gray-200'
                }`}
              >
                <GripHorizontal size={18} />
                Drag & Drop
              </button>
              <button
                onClick={() => setMoveStyle('click')}
                className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                  moveStyle === 'click'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border-2 border-gray-200'
                }`}
              >
                <MousePointer size={18} />
                Click
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowAIOptions(!showAIOptions)}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg transition"
          >
            <Bot size={20} />
            Play vs AI
          </button>

          {showAIOptions && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select AI Engine
                </label>
                <select
                  value={selectedEngine}
                  onChange={(e) => {
                    setSelectedEngine(e.target.value);
                    // Set the first available level for the new engine
                    const firstLevel = Object.keys(engines[e.target.value].levels)[0];
                    setSelectedLevel(firstLevel);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {enginesList.map(([key, engine]) => (
                    <option key={key} value={key}>
                      {engine.name}
                    </option>
                  ))}
                </select>
                {currentEngine && (
                  <p className="mt-1 text-sm text-gray-500">
                    {currentEngine.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {engineLevels.map(([key, level]) => (
                    <option key={key} value={key}>
                      {key.charAt(0).toUpperCase() + key.slice(1)} - {level.description}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={playWithBot}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Brain size={20} />
                Start Game
              </button>
            </div>
          )}

          <button
            onClick={createRoom}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition"
          >
            <Users size={20} />
            Create Room
          </button>

          <button
            onClick={() => setShowJoinRoom(!showJoinRoom)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white py-3 px-4 rounded-lg transition"
          >
            <UserPlus size={20} />
            Join Room
          </button>

          {showJoinRoom && (
            <form onSubmit={joinRoom} className="space-y-2">
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="Enter Room ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-lg transition"
              >
                Join
              </button>
            </form>
          )}

          <button
            onClick={() => setShowThemes(!showThemes)}
            className="w-full flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg transition"
          >
            <Palette size={20} />
            Change Theme
          </button>

          {showThemes && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {themes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => {
                    setTheme(theme.name);
                    setShowThemes(false);
                  }}
                  className="p-4 rounded-lg border-2 border-gray-200 hover:border-purple-500 transition-all"
                >
                  <div className="flex gap-1 mb-2">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: theme.colors[0] }}
                    />
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: theme.colors[1] }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {theme.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4">

          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;