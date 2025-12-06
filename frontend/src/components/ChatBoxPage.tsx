import { useState } from 'react';
import { Send } from 'lucide-react';

export function ChatBoxPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello, ...', sender: 'assistant', time: '10:30' },
    { id: 2, text: 'How can I help you organize your mementos today?', sender: 'assistant', time: '10:30' },
  ]);

  const handleSend = () => {
    if (message.trim()) {
      setMessages([
        ...messages,
        { id: messages.length + 1, text: message, sender: 'user', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
      setMessage('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-100">
        <h1 className="text-gray-800">ChatBox</h1>
        <p className="text-gray-500 text-sm">Ask anything</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <span className={`text-xs mt-1 block ${msg.sender === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                {msg.time}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-3">
          <input
            type="text"
            placeholder="Say something"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
          />
          <button
            onClick={handleSend}
            className="bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-2 rounded-full text-white hover:scale-110 transition-transform duration-300"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
