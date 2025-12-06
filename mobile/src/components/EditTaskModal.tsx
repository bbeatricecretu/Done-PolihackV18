import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { X, ChevronDown, ChevronUp, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Task } from '../types';

interface EditTaskModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (task: Task) => void;
  availableCategories: string[];
  availableSources: string[];
}

export function EditTaskModal({ visible, task, onClose, onSave, availableCategories, availableSources }: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [date, setDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDueCalendar, setShowDueCalendar] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [isNewSource, setIsNewSource] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setCategory(task.category || '');
      setSource(task.source || '');
      setDueDate(task.dueDate || '');
      setDate(task.date);
      setIsNewCategory(false);
      setIsNewSource(false);
    }
  }, [task]);

  const handleSave = () => {
    if (!task) return;
    
    onSave({
      ...task,
      title,
      description,
      category,
      source,
      dueDate,
      date,
    });
    onClose();
  };

  const renderCalendar = (target: 'date' | 'dueDate') => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const startOffset = 1; // Dec 1 2025 is Monday
    const currentValue = target === 'date' ? date : dueDate;

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.weekDaysRow}>
          {weekDays.map((d, i) => (
            <Text key={i} style={styles.weekDayText}>{d}</Text>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {Array(startOffset).fill(null).map((_, i) => (
            <View key={`empty-${i}`} style={styles.dayCell} />
          ))}
          {days.map(day => {
            const dateStr = `Dec ${day}`;
            const isSelected = currentValue === dateStr;
            
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                ]}
                onPress={() => {
                  if (target === 'date') setDate(dateStr);
                  else setDueDate(dateStr);
                }}
              >
                <Text style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <View style={styles.modalContainer}>
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Edit Task</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <X size={24} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Task title"
                  />

                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.textArea}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholder="Description"
                  />

                  <Text style={styles.label}>Category</Text>
                  {!isNewCategory ? (
                    <View>
                      <TouchableOpacity
                        style={styles.dropdownSelector}
                        onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      >
                        <Text style={styles.inputText}>{category}</Text>
                        {showCategoryDropdown ? <ChevronUp size={20} color="#6b7280" /> : <ChevronDown size={20} color="#6b7280" />}
                      </TouchableOpacity>
                      
                      {showCategoryDropdown && (
                        <View style={styles.dropdownList}>
                          {availableCategories.map((cat, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setCategory(cat);
                                setShowCategoryDropdown(false);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>{cat}</Text>
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity
                            style={[styles.dropdownItem, styles.dropdownItemNew]}
                            onPress={() => {
                              setIsNewCategory(true);
                              setCategory('');
                              setShowCategoryDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemTextNew}>+ Add New Category</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.newCategoryContainer}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={category}
                        onChangeText={setCategory}
                        placeholder="Enter new category"
                        autoFocus
                      />
                      <TouchableOpacity 
                        onPress={() => setIsNewCategory(false)}
                        style={styles.cancelButton}
                      >
                        <X size={20} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.label}>Source</Text>
                  {!isNewSource ? (
                    <View>
                      <TouchableOpacity
                        style={styles.dropdownSelector}
                        onPress={() => setShowSourceDropdown(!showSourceDropdown)}
                      >
                        <Text style={styles.inputText}>{source}</Text>
                        {showSourceDropdown ? <ChevronUp size={20} color="#6b7280" /> : <ChevronDown size={20} color="#6b7280" />}
                      </TouchableOpacity>
                      
                      {showSourceDropdown && (
                        <View style={styles.dropdownList}>
                          {availableSources.map((src, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setSource(src);
                                setShowSourceDropdown(false);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>{src}</Text>
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity
                            style={[styles.dropdownItem, styles.dropdownItemNew]}
                            onPress={() => {
                              setIsNewSource(true);
                              setSource('');
                              setShowSourceDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemTextNew}>+ Add New Source</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.newCategoryContainer}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={source}
                        onChangeText={setSource}
                        placeholder="Enter new source"
                        autoFocus
                      />
                      <TouchableOpacity 
                        onPress={() => setIsNewSource(false)}
                        style={styles.cancelButton}
                      >
                        <X size={20} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.label}>Due Date</Text>
                  <TouchableOpacity 
                    style={styles.dateSelector}
                    onPress={() => setShowDueCalendar(!showDueCalendar)}
                  >
                    <Text style={styles.inputText}>{dueDate || 'Select due date'}</Text>
                    {showDueCalendar ? <ChevronUp size={20} color="#6b7280" /> : <Calendar size={20} color="#6b7280" />}
                  </TouchableOpacity>
                  {showDueCalendar && renderCalendar('dueDate')}

                  <TouchableOpacity 
                    style={[styles.dateSelector, { marginTop: 16 }]}
                    onPress={() => setShowCalendar(!showCalendar)}
                  >
                    <Text style={styles.label}>Date: {date}</Text>
                    {showCalendar ? <ChevronUp size={20} color="#6b7280" /> : <Calendar size={20} color="#6b7280" />}
                  </TouchableOpacity>

                  {showCalendar && renderCalendar('date')}

                  <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <LinearGradient
                      colors={['#fda4af', '#f9a8d4', '#c4b5fd']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradient}
                    >
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  keyboardView: {
    width: '100%',
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  label: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
  },
  textArea: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 16,
    height: 100,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekDayText: {
    width: 32,
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCell: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  dayCellSelected: {
    backgroundColor: '#4f46e5',
  },
  dayText: {
    fontSize: 14,
    color: '#1f2937',
  },
  dayTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownSelector: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dropdownList: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#374151',
  },
  dropdownItemNew: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  dropdownItemTextNew: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '600',
  },
  newCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cancelButton: {
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
});
