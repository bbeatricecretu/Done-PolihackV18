import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { ChatBoxPage } from './components/ChatBoxPage';
import { TasksPage } from './components/TasksPage';
import { SettingsPage } from './components/SettingsPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'chat' | 'tasks' | 'settings'>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'chat':
        return <ChatBoxPage />;
      case 'tasks':
        return <TasksPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md h-[812px] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative">
        {/* Phone notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-50" />
        
        {/* Settings button in upper right corner */}
        {currentPage === 'home' && (
          <button
            onClick={() => setCurrentPage('settings')}
            className="absolute top-10 right-6 z-40 bg-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Settings size={20} className="text-gray-600" />
          </button>
        )}
        
        {/* Page content */}
        <div className="flex-1 overflow-hidden pt-8">
          {renderPage()}
        </div>
        
        {/* Bottom navbar */}
        <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
}