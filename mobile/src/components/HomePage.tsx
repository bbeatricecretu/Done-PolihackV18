import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Plus, Settings } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Task } from '../types';
import { EditTaskModal } from './EditTaskModal';

const { width } = Dimensions.get('window');

interface HomePageProps {
  onNavigate: (page: 'home' | 'chat' | 'tasks' | 'settings' | 'locations') => void;
  tasks?: Task[];
  onToggleTask?: (id: number) => void;
  onDeleteTask?: (id: number) => void;
  onEditTask?: (task: Task) => void;
}

export function HomePage({ onNavigate, tasks = [], onToggleTask, onDeleteTask, onEditTask }: HomePageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Get the first incomplete task to show as "Let's do"
  const focusTask = tasks.find(t => !t.completed);

  const handleEdit = () => {
    if (focusTask) {
      setEditingTask(focusTask);
    }
  };

  const handleSaveEdit = (editedTask: Task) => {
    if (onEditTask) {
      onEditTask(editedTask);
    }
    setEditingTask(null);
  };

  const availableCategories = Array.from(new Set(tasks.map(t => t.category).filter(Boolean))) as string[];
  const availableSources = Array.from(new Set(tasks.map(t => t.source).filter(Boolean))) as string[];

  return (
    <View style={styles.container}>
      {/* Animated mesh gradient background simulation */}
      <View style={styles.backgroundContainer}>
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />
        <View style={[styles.orb, styles.orb3]} />
        <View style={[styles.orb, styles.orb4]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.greeting}>Hello,</Text>
            <TouchableOpacity 
              onPress={() => onNavigate('settings')}
              style={styles.settingsButton}
            >
              <Settings size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          <Text style={styles.dateDisplay}>6 Dec</Text>
        </View>

        {/* Tasks Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Let's do</Text>
          
          {focusTask ? (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => setIsExpanded(!isExpanded)}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{focusTask.title}</Text>
                <Text style={styles.timeText}>{focusTask.date}</Text>
              </View>
              
              <Text style={styles.cardDescription}>
                {focusTask.description}
              </Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.metaContainer}>
                  <View style={styles.tagsRow}>
                    {focusTask.category && (
                      <View style={[styles.tag, styles.tagBlue]}>
                        <Text style={[styles.tagText, styles.tagTextBlue]}>#{focusTask.category}</Text>
                      </View>
                    )}
                    {focusTask.source && (
                      <View style={[styles.tag, styles.tagGreen]}>
                        <Text style={[styles.tagText, styles.tagTextGreen]}>from {focusTask.source}</Text>
                      </View>
                    )}
                  </View>
                  {focusTask.dueDate && (
                    <Text style={styles.dueText}>{focusTask.dueDate}</Text>
                  )}
                </View>
                
                <TouchableOpacity onPress={() => onToggleTask && onToggleTask(focusTask.id)}>
                  <LinearGradient
                    colors={['#e0f2fe', '#f3e8ff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.doneButton}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {isExpanded && (
                <View style={styles.actionsContainer}>
                  <TouchableOpacity onPress={handleEdit}>
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDeleteTask && onDeleteTask(focusTask.id)}>
                    <Text style={styles.actionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardDescription}>All caught up! 🎉</Text>
            </View>
          )}
        </View>
      </ScrollView>

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
    backgroundColor: '#f8fafc', // slate-50
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  orb1: {
    top: -50,
    left: -50,
    width: 300,
    height: 300,
    backgroundColor: '#e0f2fe', // sky-100
  },
  orb2: {
    top: 100,
    right: -50,
    width: 300,
    height: 300,
    backgroundColor: '#ccfbf1', // teal-100
  },
  orb3: {
    bottom: 0,
    left: 50,
    width: 300,
    height: 300,
    backgroundColor: '#ffe4e6', // rose-100
  },
  orb4: {
    top: '40%',
    left: '30%',
    width: 250,
    height: 250,
    backgroundColor: '#f3e8ff', // purple-100
    opacity: 0.4,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 48,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 48,
    fontWeight: '300',
    color: '#1f2937',
    fontFamily: 'System', // Trying to get a lighter, cleaner look
    marginBottom: 8,
  },
  dateDisplay: {
    fontSize: 56,
    fontWeight: '400',
    color: '#1f2937',
    fontFamily: 'System',
  },
  settingsButton: {
    padding: 8,
    marginTop: 8,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: '#1f2937',
    marginBottom: 16,
    fontFamily: 'System',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937', // Adding a border to match the sketch style
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 }, // Offset shadow for sketch feel
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
  cardTitle: {
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
  cardDescription: {
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
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
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
