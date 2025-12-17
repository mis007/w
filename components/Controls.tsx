import React, { useState } from 'react';

interface ControlsProps {
  onEndCall: () => void;
  onToggleMute: (isMuted: boolean) => void;
  onSendText: (text: string) => void;
}

const Controls: React.FC<ControlsProps> = ({ onEndCall, onToggleMute, onSendText }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    onToggleMute(newState);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendText(inputText);
      setInputText('');
      setShowInput(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col gap-4">
      {/* Text Input Overlay */}
      {showInput && (
        <form onSubmit={handleSend} className="glass-panel p-2 rounded-full flex gap-2 animate-slide-up">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="给小萌发消息..."
            className="flex-1 bg-transparent border-none outline-none px-4 text-gray-800 placeholder-gray-500"
            autoFocus
          />
          <button 
            type="submit"
            className="w-10 h-10 bg-rose-500 rounded-full text-white flex items-center justify-center hover:bg-rose-600 transition"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      )}

      {/* Main Controls */}
      <div className="glass-panel rounded-2xl p-4 flex justify-around items-center shadow-lg">
        
        <button 
            onClick={() => setShowInput(!showInput)}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition transform hover:scale-105 ${
                showInput ? 'bg-blue-100 text-blue-600' : 'bg-gray-100/50 text-gray-700 hover:bg-white'
            }`}
        >
            <i className="fas fa-keyboard"></i>
        </button>

        <button 
            onClick={handleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition transform hover:scale-105 ${
                isMuted ? 'bg-white text-gray-800' : 'bg-gray-100/50 text-gray-700 hover:bg-white'
            }`}
        >
            <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
        </button>

        <button 
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center text-2xl shadow-red-200 shadow-xl transition transform hover:scale-110 hover:bg-red-600"
        >
            <i className="fas fa-phone-slash"></i>
        </button>
      </div>
    </div>
  );
};

export default Controls;