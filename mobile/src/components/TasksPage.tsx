import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Plus, Search, Check, X, ListFilter } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NewMementoModal } from './NewMementoModal';
import { FilterTasksModal, FilterState } from './FilterTasksModal';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    category: null,
    source: null,
    date: null,
    status: null,
  });

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleAddTask = (newTask: Task) => {
    setTasks([newTask, ...tasks]);
  };

  // Extract unique values for filters
  const availableCategories = useMemo(() => 
    Array.from(new Set(tasks.map(t => t.category).filter(Boolean) as string[])),
    [tasks]
  );

  const availableSources = useMemo(() => 
    Array.from(new Set(tasks.map(t => t.source).filter(Boolean) as string[])),
    [tasks]
  );

  const availableDates = useMemo(() => 
    Array.from(new Set(tasks.map(t => t.date).filter(Boolean) as string[])),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.category?.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (activeFilters.category) {
      result = result.filter(t => t.category === activeFilters.category);
    }
    if (activeFilters.source) {
      result = result.filter(t => t.source === activeFilters.source);
    }
    if (activeFilters.date) {
      result = result.filter(t => t.date === activeFilters.date);
    }
    if (activeFilters.status) {
      if (activeFilters.status === 'completed') {
        result = result.filter(t => t.completed);
      } else if (activeFilters.status === 'in-progress') {
        result = result.filter(t => !t.completed);
      }
    } else {
      // Default behavior if no status filter is applied: show incomplete tasks (as per original code)
      // However, if other filters are applied, user might expect to see completed ones too.
      // Let's stick to the original logic: if no explicit status filter, show incomplete only?
      // Or maybe "All" should be the default if filters are active?
      // The original code had `const incompleteTasks = tasks.filter(t => !t.completed);`
      // and then filtered from that.
      // Let's preserve "incomplete only" as default unless "All" or "Completed" is selected.
      if (activeFilters.status === null) {
         result = result.filter(t => !t.completed);
      }
    }

    return result;
  }, [tasks, searchQuery, activeFilters]);

  const renderItem = ({ item }: { item: Task }) => (
    <TouchableOpacity 
      style={styles.taskCard}
      onPress={() => toggleTask(item.id)}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskContent}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <Text style={styles.taskDescription}>{item.description}</Text>
          
          <View style={styles.tagsContainer}>
            {item.category && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.category}</Text>
              </View>
            )}
            {item.dueDate && (
              <>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.dueText}>{item.dueDate}</Text>
              </>
            )}
          </View>
        </View>
        
        <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
          {item.completed && <Check size={16} color="white" />}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSubtitle}>{filteredTasks.length} tasks found</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Search size={20} color="#4b5563" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setIsFilterVisible(true)}
          >
            <ListFilter size={20} color="#4b5563" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setIsModalVisible(true)}
          >
            <LinearGradient
              colors={['#fda4af', '#f9a8d4', '#c4b5fd']}
              style={styles.addButtonGradient}
            >
              <Plus size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Search size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tasks..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setShowSearch(false);
            }}>
              <X size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <NewMementoModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onAdd={handleAddTask}
      />

      <FilterTasksModal
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        onApply={setActiveFilters}
        availableCategories={availableCategories}
        availableSources={availableSources}
        availableDates={availableDates}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonGradient: {
    padding: 10,
    borderRadius: 12,
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  listContent: {
    padding: 24,
    paddingTop: 8,
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskContent: {
    flex: 1,
    marginRight: 16,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    color: '#0d9488',
  },
  dot: {
    marginHorizontal: 8,
    color: '#9ca3af',
    fontSize: 12,
  },
  dueText: {
    fontSize: 12,
    color: '#fb7185',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981', // emerald-500
    borderColor: '#10b981',
  },
});
