import { Home, MessageCircle, CheckSquare } from 'lucide-react';

interface NavbarProps {
  currentPage: 'home' | 'chat' | 'tasks' | 'settings';
  onPageChange: (page: 'home' | 'chat' | 'tasks' | 'settings') => void;
}

export function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const navItems = [
    { id: 'chat' as const, icon: MessageCircle, label: 'Chat' },
    { id: 'home' as const, icon: Home, label: 'Home' },
    { id: 'tasks' as const, icon: CheckSquare, label: 'Tasks' },
  ];

  return (
    <nav className="bg-white border-t border-gray-100 px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                isActive ? 'scale-110' : 'scale-100 opacity-50'
              }`}
            >
              <div
                className={`p-3 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-br from-rose-300 via-pink-300 to-violet-300 text-white'
                    : 'text-gray-400'
                }`}
              >
                <Icon size={20} strokeWidth={2.5} />
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}