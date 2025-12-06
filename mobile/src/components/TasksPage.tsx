import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Plus, Search, Check, X, ListFilter } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NewMementoModal } from './NewMementoModal';
import { EditTaskModal } from './EditTaskModal';
import { FilterTasksModal, FilterState } from './FilterTasksModal';
import { Task } from '../types';

interface TasksPageProps {
  tasks: Task[];
  onToggleTask: (id: number) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (id: number) => void;
  onEditTask: (task: Task) => void;
}

export function TasksPage({ tasks, onToggleTask, onAddTask, onDeleteTask, onEditTask }: TasksPageProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    category: null,
    source: null,
    date: null,
    status: null,
  });

  const handleAddTask = (newTask: Task) => {
    onAddTask(newTask);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
  };

  const handleSaveEdit = (editedTask: Task) => {
    onEditTask(editedTask);
    setEditingTask(null);
  };

  const toggleExpand = (id: number) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
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

  const renderItem = ({ item }: { item: Task }) => {
    const isExpanded = expandedTaskId === item.id;

    return (
      <TouchableOpacity 
        style={styles.taskCard} 
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <Text style={styles.timeText}>{item.date}</Text>
        </View>

        <Text style={styles.taskDescription}>{item.description}</Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.metaContainer}>
            <View style={styles.tagsRow}>
              {item.category && (
                <View style={[styles.tag, styles.tagBlue]}>
                  <Text style={[styles.tagText, styles.tagTextBlue]}>#{item.category}</Text>
                </View>
              )}
              {item.source && (
                <View style={[styles.tag, styles.tagGreen]}>
                  <Text style={[styles.tagText, styles.tagTextGreen]}>from {item.source}</Text>
                </View>
              )}
            </View>
            {item.dueDate && (
              <Text style={styles.dueText}>{item.dueDate}</Text>
            )}
          </View>
          
          <TouchableOpacity onPress={() => onToggleTask(item.id)}>
            <LinearGradient
              colors={item.completed ? ['#1f2937', '#1f2937'] : ['#e0f2fe', '#f3e8ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.doneButton}
            >
              <Text style={[styles.doneButtonText, item.completed && styles.doneButtonTextCompleted]}>
                {item.completed ? 'Completed' : 'Done'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity onPress={() => handleEdit(item)}>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDeleteTask(item.id)}>
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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

      <EditTaskModal
        visible={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveEdit}
        availableCategories={availableCategories}
        availableSources={availableSources}
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
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 16,
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  taskDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metaContainer: {
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagBlue: {
    backgroundColor: '#e0f2fe', // sky-100
  },
  tagGreen: {
    backgroundColor: '#dcfce7', // green-100
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagTextBlue: {
    color: '#0369a1', // sky-700
  },
  tagTextGreen: {
    color: '#15803d', // green-700
  },
  dueText: {
    fontSize: 14,
    color: '#1f2937',
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  doneButtonCompleted: {
    backgroundColor: '#1f2937',
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  doneButtonTextCompleted: {
    color: 'white',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 24,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    textDecorationLine: 'underline',
  },
});
