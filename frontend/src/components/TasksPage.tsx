import { useState } from 'react';
import { Plus, Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  date: string;
  category?: string;
  priority?: string;
  source?: string;
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: 'Review meeting notes', description: 'From yesterday\'s team sync', completed: false, dueDate: 'Due in 2 days', date: 'Dec 8', category: 'Work', priority: 'High', source: 'Email' },
    { id: 2, title: 'Buy groceries', description: 'Milk, eggs, bread', completed: false, date: 'Dec 7', category: 'Personal', priority: 'Medium', source: 'Apps' },
    { id: 4, title: 'Read book chapter', description: 'Chapter 5 - Productivity', completed: false, dueDate: 'Due in 4 days', date: 'Dec 10', category: 'Personal', priority: 'Low', source: 'Apps' },
    { id: 5, title: 'Gym session', description: 'Leg day workout', completed: false, date: 'Dec 6', category: 'Social', priority: 'Medium', source: 'WhatsApp' },
    { id: 6, title: 'Pay bills', description: 'Monthly utilities payment', completed: false, date: 'Dec 9', category: 'Finance', priority: 'High', source: 'Email' },
  ]);

  const [showSearch, setShowSearch] = useState(false);
  const [showNewMemento, setShowNewMemento] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter collapsible states
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // New memento form state
  const [newMemento, setNewMemento] = useState({
    title: '',
    category: '',
    dueDate: '',
    priority: '',
    description: '',
  });

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const incompleteTasks = tasks.filter(t => !t.completed);
  
  // Live search filtering
  const filteredTasks = searchQuery
    ? incompleteTasks.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : incompleteTasks;

  const handleAddTask = () => {
    if (newMemento.description.trim()) {
      const newTask: Task = {
        id: tasks.length + 1,
        title: newMemento.title || 'New task',
        description: newMemento.description,
        completed: false,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        category: newMemento.category || undefined,
        dueDate: newMemento.dueDate || undefined,
        priority: newMemento.priority || undefined,
      };
      setTasks([...tasks, newTask]);
      setNewMemento({ title: '', category: '', dueDate: '', priority: '', description: '' });
      setShowNewMemento(false);
      setShowMoreOptions(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-6 relative">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-gray-800 mb-1">Tasks</h1>
          <p className="text-gray-500 text-sm">{incompleteTasks.length} active tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSearch(true)}
            className="bg-white p-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Search size={18} className="text-gray-600" />
          </button>
          <button 
            onClick={() => setShowNewMemento(true)}
            className="bg-gradient-to-br from-rose-300 via-pink-300 to-violet-300 p-2.5 rounded-xl text-white shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Plus size={18} />
          </button>
          <button 
            onClick={() => setShowFilter(true)}
            className="bg-white p-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
          >
            <SlidersHorizontal size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Timeline with tasks */}
      <div className="space-y-6">
        {filteredTasks.map((task, index) => (
          <div key={task.id} className="flex gap-4">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <div className="bg-gradient-to-br from-sky-300 via-teal-300 to-cyan-300 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap min-w-[45px] text-center">
                {task.date}
              </div>
              {index < filteredTasks.length - 1 && (
                <div className="w-0.5 flex-1 bg-gradient-to-b from-teal-200 via-cyan-200 to-rose-200 my-2 min-h-[40px]" />
              )}
            </div>

            {/* Task card */}
            <div className="flex-1 pb-2">
              <div className="bg-gradient-to-br from-sky-50/80 via-teal-50/60 to-rose-50/70 rounded-2xl p-4 hover:shadow-md transition-all duration-300 border border-sky-100/50">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="w-5 h-5 rounded-full border-2 border-teal-300 mt-1 flex-shrink-0 hover:scale-110 transition-transform duration-300"
                  />
                  <div className="flex-1">
                    <h3 className="text-gray-800 mb-1">{task.title}</h3>
                    <p className="text-gray-500 text-sm mb-2">{task.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.category && (
                        <span className="text-xs bg-teal-50 text-teal-600 px-2 py-1 rounded-full">{task.category}</span>
                      )}
                      {task.dueDate && (
                        <span className="text-xs text-rose-400">{task.dueDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Popup with Live Results */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-3xl p-6 w-11/12 max-w-sm shadow-2xl max-h-[70vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-800">Search Tasks</h2>
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3 mb-4">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Type something..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
                autoFocus
              />
            </div>
            
            {/* Live search results */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {searchQuery && (
                <>
                  <p className="text-xs text-gray-500 mb-2">{filteredTasks.length} results found</p>
                  {filteredTasks.map(task => (
                    <div key={task.id} className="bg-gradient-to-br from-sky-50/80 via-teal-50/60 to-rose-50/70 rounded-xl p-3 border border-sky-100/50">
                      <h4 className="text-gray-800 text-sm mb-1">{task.title}</h4>
                      <p className="text-gray-500 text-xs">{task.description}</p>
                      {task.category && (
                        <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full mt-2 inline-block">{task.category}</span>
                      )}
                    </div>
                  ))}
                  {filteredTasks.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-8">No tasks found</p>
                  )}
                </>
              )}
              {!searchQuery && (
                <p className="text-gray-400 text-sm text-center py-8">Start typing to search tasks...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Memento Popup - Simplified */}
      {showNewMemento && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-11/12 max-w-sm shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-gray-800">New Memento</h2>
              <button onClick={() => { setShowNewMemento(false); setShowMoreOptions(false); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-600 text-sm mb-2 block">Description</label>
                <textarea
                  placeholder="Add details..."
                  value={newMemento.description}
                  onChange={(e) => setNewMemento({...newMemento, description: e.target.value})}
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-800 placeholder-gray-400 h-24 resize-none"
                  autoFocus
                />
              </div>
              
              {/* More Options Toggle */}
              <button
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="w-full flex items-center justify-between text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span className="text-sm">More options (optional)</span>
                {showMoreOptions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {/* Collapsible More Options */}
              {showMoreOptions && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-gray-600 text-sm mb-2 block">Title</label>
                    <input
                      type="text"
                      placeholder="Task title"
                      value={newMemento.title}
                      onChange={(e) => setNewMemento({...newMemento, title: e.target.value})}
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-800 placeholder-gray-400"
                    />
                  </div>
                  
                  <div>
                    <label className="text-gray-600 text-sm mb-2 block">Category</label>
                    <input
                      type="text"
                      placeholder="Work, Personal, etc."
                      value={newMemento.category}
                      onChange={(e) => setNewMemento({...newMemento, category: e.target.value})}
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-800 placeholder-gray-400"
                    />
                  </div>
                  
                  <div>
                    <label className="text-gray-600 text-sm mb-2 block">Due Date</label>
                    <input
                      type="date"
                      value={newMemento.dueDate}
                      onChange={(e) => setNewMemento({...newMemento, dueDate: e.target.value})}
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-800"
                    />
                  </div>
                  
                  <div>
                    <label className="text-gray-600 text-sm mb-2 block">Priority</label>
                    <div className="flex gap-2">
                      {['Low', 'Medium', 'High'].map((priority) => (
                        <button
                          key={priority}
                          onClick={() => setNewMemento({...newMemento, priority})}
                          className={`flex-1 py-2 rounded-xl transition-all duration-300 ${
                            newMemento.priority === priority
                              ? 'bg-gradient-to-br from-rose-300 via-pink-300 to-violet-300 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {priority}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleAddTask}
                className="w-full bg-gradient-to-br from-rose-300 via-pink-300 to-violet-300 text-white py-3 rounded-xl hover:shadow-lg transition-all duration-300"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Popup - Collapsible */}
      {showFilter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-11/12 max-w-sm shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-gray-800">Filter Tasks</h2>
              <button onClick={() => { setShowFilter(false); setExpandedFilter(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Category Filter */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedFilter(expandedFilter === 'category' ? null : 'category')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-800">Category</span>
                  {expandedFilter === 'category' ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>
                {expandedFilter === 'category' && (
                  <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
                    {['Work', 'Finance', 'Personal', 'Social'].map((cat) => (
                      <label key={cat} className="flex items-center gap-3 cursor-pointer py-1">
                        <input type="checkbox" className="w-4 h-4 rounded accent-teal-400" />
                        <span className="text-gray-700">{cat}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Get From Filter */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedFilter(expandedFilter === 'source' ? null : 'source')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-800">Get From</span>
                  {expandedFilter === 'source' ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>
                {expandedFilter === 'source' && (
                  <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
                    {['WhatsApp', 'Email', 'Apps'].map((source) => (
                      <label key={source} className="flex items-center gap-3 cursor-pointer py-1">
                        <input type="checkbox" className="w-4 h-4 rounded accent-teal-400" />
                        <span className="text-gray-700">{source}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Date Filter */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedFilter(expandedFilter === 'date' ? null : 'date')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-800">Date</span>
                  {expandedFilter === 'date' ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>
                {expandedFilter === 'date' && (
                  <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
                    <label className="flex items-center gap-3 cursor-pointer py-1">
                      <input type="checkbox" className="w-4 h-4 rounded accent-teal-400" />
                      <span className="text-gray-700">Tasks due to a date</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer py-1">
                      <input type="checkbox" className="w-4 h-4 rounded accent-teal-400" />
                      <span className="text-gray-700">Today</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer py-1">
                      <input type="checkbox" className="w-4 h-4 rounded accent-teal-400" />
                      <span className="text-gray-700">This week</span>
                    </label>
                  </div>
                )}
              </div>
              
              {/* Done Tasks Filter */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedFilter(expandedFilter === 'done' ? null : 'done')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-800">Done Tasks</span>
                  {expandedFilter === 'done' ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>
                {expandedFilter === 'done' && (
                  <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
                    <label className="flex items-center gap-3 cursor-pointer py-1">
                      <input type="checkbox" className="w-4 h-4 rounded accent-teal-400" />
                      <span className="text-gray-700">Show completed tasks</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer py-1">
                      <input type="checkbox" className="w-4 h-4 rounded accent-teal-400" />
                      <span className="text-gray-700">Tasks remain in app 4 days after</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            <button className="w-full bg-gradient-to-br from-rose-300 via-pink-300 to-violet-300 text-white py-3 rounded-xl hover:shadow-lg transition-all duration-300 mt-6">
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}