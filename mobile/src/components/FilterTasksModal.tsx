import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { X, ChevronDown, ChevronUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SavedLocation } from '../types';

interface FilterTasksModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  availableCategories: string[];
  availableSources: string[];
  availableDates: string[];
  savedLocations: SavedLocation[];
}

export interface FilterState {
  category: string | null;
  source: string | null;
  date: string | null;
  status: 'all' | 'completed' | 'in-progress' | null;
  location: string | null;
}

export function FilterTasksModal({
  visible,
  onClose,
  onApply,
  availableCategories,
  availableSources,
  availableDates,
  savedLocations,
}: FilterTasksModalProps) {
  const [filters, setFilters] = useState<FilterState>({
    category: null,
    source: null,
    date: null,
    status: null,
    location: null,
  });

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSelect = (key: keyof FilterState, value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const renderCalendar = () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    // Dec 1 2025 is a Monday, so 1 empty slot (Sunday)
    const startOffset = 1; 

    return (
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.dropdownHeader}
          onPress={() => toggleSection('date')}
        >
          <Text style={styles.dropdownTitle}>
            {filters.date ? `Date: ${filters.date}` : 'Date'}
          </Text>
          {expandedSection === 'date' ? (
            <ChevronUp size={20} color="#6b7280" />
          ) : (
            <ChevronDown size={20} color="#6b7280" />
          )}
        </TouchableOpacity>

        {expandedSection === 'date' && (
          <View style={styles.calendarContent}>
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
                const isAvailable = availableDates.includes(dateStr);
                const isSelected = filters.date === dateStr;
                
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      !isAvailable && styles.dayCellDisabled
                    ]}
                    disabled={!isAvailable}
                    onPress={() => handleSelect('date', dateStr)}
                  >
                    <Text style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      !isAvailable && styles.dayTextDisabled
                    ]}>
                      {day}
                    </Text>
                    {isAvailable && !isSelected && <View style={styles.dotIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderDropdown = (
    title: string,
    sectionKey: string,
    items: string[],
    selectedItem: string | null,
    onSelect: (item: string) => void
  ) => (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => toggleSection(sectionKey)}
      >
        <Text style={styles.dropdownTitle}>
          {selectedItem ? `${title}: ${selectedItem}` : title}
        </Text>
        {expandedSection === sectionKey ? (
          <ChevronUp size={20} color="#6b7280" />
        ) : (
          <ChevronDown size={20} color="#6b7280" />
        )}
      </TouchableOpacity>
      
      {expandedSection === sectionKey && (
        <View style={styles.dropdownContent}>
          {items.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.dropdownItem,
                selectedItem === item && styles.dropdownItemSelected,
              ]}
              onPress={() => onSelect(item)}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  selectedItem === item && styles.dropdownItemTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Filter Tasks</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {renderDropdown(
                  'Category',
                  'category',
                  availableCategories,
                  filters.category,
                  (item) => handleSelect('category', item)
                )}

                {renderDropdown(
                  'Source',
                  'source',
                  availableSources,
                  filters.source,
                  (item) => handleSelect('source', item)
                )}

                {renderDropdown(
                  'Location',
                  'location',
                  savedLocations.map(l => l.name),
                  filters.location,
                  (item) => handleSelect('location', item)
                )}

                {renderCalendar()}

                {renderDropdown(
                  'Status',
                  'status',
                  ['All', 'Completed', 'In Progress'],
                  filters.status ? (filters.status === 'in-progress' ? 'In Progress' : filters.status.charAt(0).toUpperCase() + filters.status.slice(1)) : null,
                  (item) => handleSelect('status', item === 'In Progress' ? 'in-progress' : item.toLowerCase() as any)
                )}

                <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                  <LinearGradient
                    colors={['#B58DFF', '#8ED7FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                  >
                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
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
  dropdownContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  dropdownTitle: {
    fontSize: 16,
    color: '#4b5563',
  },
  dropdownContent: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemSelected: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#4b5563',
  },
  dropdownItemTextSelected: {
    color: '#4f46e5',
    fontWeight: '500',
  },
  applyButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  calendarContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
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
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    color: '#1f2937',
  },
  dayTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: '#9ca3af',
  },
  dotIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4f46e5',
  },
});
