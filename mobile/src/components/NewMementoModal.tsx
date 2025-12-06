import React, { useState } from 'react';
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

interface NewMementoModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (task: any) => void;
  availableCategories: string[];
}

export function NewMementoModal({ visible, onClose, onAdd, availableCategories }: NewMementoModalProps) {
  const [description, setDescription] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | null>(null);
  
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);

  const handleAdd = () => {
    onAdd({
      title: title || 'New Memento',
      description,
      category,
      dueDate,
      priority,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed: false,
      id: Date.now(),
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setDescription('');
    setShowOptions(false);
    setTitle('');
    setCategory('');
    setDueDate('');
    setPriority(null);
    setShowCalendar(false);
    setShowCategoryDropdown(false);
    setIsNewCategory(false);
  };

  const renderCalendar = () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const startOffset = 1; // Dec 1 2025 is Monday

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
            const isSelected = dueDate === dateStr;
            
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected
                ]}
                onPress={() => {
                  setDueDate(dateStr);
                  setShowCalendar(false);
                }}
              >
                <Text style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected
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
                  <Text style={styles.headerTitle}>New Memento</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <X size={24} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Add details..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={styles.optionsToggle}
                    onPress={() => setShowOptions(!showOptions)}
                  >
                    <Text style={styles.optionsToggleText}>More options (optional)</Text>
                    {showOptions ? (
                      <ChevronUp size={20} color="#4b5563" />
                    ) : (
                      <ChevronDown size={20} color="#4b5563" />
                    )}
                  </TouchableOpacity>

                  {showOptions && (
                    <View style={styles.optionsContainer}>
                      <Text style={styles.label}>Title</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Task title"
                        placeholderTextColor="#9ca3af"
                        value={title}
                        onChangeText={setTitle}
                      />

                      <Text style={styles.label}>Category</Text>
                      <View style={styles.dropdownContainer}>
                        <TouchableOpacity
                          style={styles.dropdownHeader}
                          onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        >
                          <Text style={[styles.dropdownTitle, !category && styles.placeholderText]}>
                            {category || 'Select Category'}
                          </Text>
                          {showCategoryDropdown ? (
                            <ChevronUp size={20} color="#6b7280" />
                          ) : (
                            <ChevronDown size={20} color="#6b7280" />
                          )}
                        </TouchableOpacity>
                        
                        {showCategoryDropdown && (
                          <View style={styles.dropdownContent}>
                            {availableCategories.map((cat) => (
                              <TouchableOpacity
                                key={cat}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  setCategory(cat);
                                  setShowCategoryDropdown(false);
                                  setIsNewCategory(false);
                                }}
                              >
                                <Text style={styles.dropdownItemText}>{cat}</Text>
                              </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                              style={styles.dropdownItem}
                              onPress={() => {
                                setCategory('');
                                setShowCategoryDropdown(false);
                                setIsNewCategory(true);
                              }}
                            >
                              <Text style={[styles.dropdownItemText, styles.newItemText]}>+ New Category</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {isNewCategory && (
                        <TextInput
                          style={[styles.input, { marginTop: -8 }]}
                          placeholder="Enter new category name"
                          placeholderTextColor="#9ca3af"
                          value={category}
                          onChangeText={setCategory}
                          autoFocus
                        />
                      )}

                      <Text style={styles.label}>Due Date</Text>
                      <View style={styles.dateInputContainer}>
                        <TouchableOpacity 
                          style={styles.dateInputTouchable}
                          onPress={() => setShowCalendar(!showCalendar)}
                        >
                          <Text style={[styles.dateText, !dueDate && styles.placeholderText]}>
                            {dueDate || 'mm/dd/yyyy'}
                          </Text>
                          <Calendar size={20} color="#d1d5db" style={styles.calendarIcon} />
                        </TouchableOpacity>
                      </View>
                      
                      {showCalendar && renderCalendar()}

                      <Text style={styles.label}>Priority</Text>
                      <View style={styles.priorityContainer}>
                        {(['Low', 'Medium', 'High'] as const).map((p) => (
                          <TouchableOpacity
                            key={p}
                            style={[
                              styles.priorityButton,
                              priority === p && styles.priorityButtonActive,
                            ]}
                            onPress={() => setPriority(p)}
                          >
                            <Text
                              style={[
                                styles.priorityText,
                                priority === p && styles.priorityTextActive,
                              ]}
                            >
                              {p}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                    <LinearGradient
                      colors={['#fda4af', '#f9a8d4', '#c4b5fd']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradient}
                    >
                      <Text style={styles.addButtonText}>Add</Text>
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
  textArea: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 16,
    height: 120,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 20,
  },
  optionsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionsToggleText: {
    fontSize: 14,
    color: '#4b5563',
  },
  optionsContainer: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
  },
  dateInputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  dateInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    paddingRight: 48,
  },
  calendarIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  priorityButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#e0e7ff', // indigo-100
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  priorityText: {
    color: '#4b5563',
    fontWeight: '500',
  },
  priorityTextActive: {
    color: '#4f46e5', // indigo-600
  },
  addButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  dropdownContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dropdownTitle: {
    fontSize: 16,
    color: '#1f2937',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  dropdownContent: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: 'white',
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#4b5563',
  },
  newItemText: {
    color: '#4f46e5',
    fontWeight: '500',
  },
  dateInputTouchable: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#1f2937',
  },
});
