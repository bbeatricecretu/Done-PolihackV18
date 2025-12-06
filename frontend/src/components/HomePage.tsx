import { Plus } from 'lucide-react';

export function HomePage() {
  return (
    <div className="h-full overflow-hidden px-6 py-6 relative">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 animate-mesh-1">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-sky-100 to-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
        </div>
        <div className="absolute inset-0 animate-mesh-2">
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-br from-cyan-100 to-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
        </div>
        <div className="absolute inset-0 animate-mesh-3">
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-br from-rose-100 to-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
        </div>
        <div className="absolute inset-0 animate-mesh-4">
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-br from-violet-100 to-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40" />
        </div>
        <div className="absolute inset-0 animate-mesh-5">
          <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-gradient-to-br from-indigo-100 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-45" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-gray-800 mb-2">Memento</h1>
          <p className="text-gray-500">Your memories, organized</p>
        </div>

        {/* Add new memento button */}
        <div className="mb-12 flex justify-center">
          <button className="bg-white/90 backdrop-blur-sm px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
            <Plus size={20} className="text-violet-400" />
            <span className="text-gray-800">Add New Memento</span>
          </button>
        </div>

        {/* Single recent memento */}
        <div className="mb-6">
          <h2 className="text-gray-800 mb-4">Recent</h2>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-gray-800 mb-2">Review meeting notes</h3>
                <p className="text-gray-500 text-sm mb-3">From yesterday&apos;s team sync</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-teal-50 text-teal-600 px-3 py-1 rounded-full">Work</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-rose-400">Due in 2 days</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-400 text-right">2 hours ago</div>
          </div>
        </div>
      </div>
    </div>
  );
}