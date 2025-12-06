import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert, Modal, TouchableWithoutFeedback, TextInput, ActivityIndicator } from 'react-native';
import { Plus, Check, ChevronDown, ChevronUp, X, Map as MapIcon, Locate, Type, Save } from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { Task, SavedLocation } from '../types';
import { LinearGradient } from 'expo-linear-gradient';

interface LocationsPageProps {
  tasks: Task[];
  savedLocations: SavedLocation[];
  onAddLocation: (location: Omit<SavedLocation, 'id'>) => void;
  onUpdateLocation: (location: SavedLocation) => void;
}

interface SelectionModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selectedOptions: string[];
  onClose: () => void;
  onSelect: (option: string) => void;
}

function SelectionModal({ visible, title, options, selectedOptions, onClose, onSelect }: SelectionModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={onClose}>
                  <X size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.modalOption}
                    onPress={() => onSelect(option)}
                  >
                    <Text style={styles.modalOptionText}>{option}</Text>
                    <View style={[styles.checkbox, selectedOptions.includes(option) && styles.checkboxChecked]}>
                      {selectedOptions.includes(option) && <Check size={12} color="white" />}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

interface LocationPickerModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  initialTitle?: string;
  onClose: () => void;
  onPickMap: (name: string) => void;
  onSave: (location: { name: string; latitude: number; longitude: number; address?: string }) => void;
}

function LocationPickerModal({ visible, mode, initialTitle, onClose, onPickMap, onSave }: LocationPickerModalProps) {
  const [title, setTitle] = useState(initialTitle || '');
  const [manualCoords, setManualCoords] = useState({ lat: '', lon: '' });
  const [showManualInput, setShowManualInput] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTitle(initialTitle || '');
    setManualCoords({ lat: '', lon: '' });
    setShowManualInput(false);
  }, [visible, initialTitle]);

  const handleCurrentLocation = async () => {
    if (mode === 'add' && !title.trim()) {
      Alert.alert('Required', 'Please enter a title for the location');
      return;
    }
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      
      let address = `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;
      try {
        const geocoded = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        if (geocoded && geocoded.length > 0) {
          const addr = geocoded[0];
          address = [addr.street, addr.name, addr.city].filter(Boolean).join(', ');
        }
      } catch (e) {
        console.log('Reverse geocoding failed', e);
      }

      onSave({
        name: title,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Could not fetch location');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (mode === 'add' && !title.trim()) {
      Alert.alert('Required', 'Please enter a title for the location');
      return;
    }
    const lat = parseFloat(manualCoords.lat);
    const lon = parseFloat(manualCoords.lon);
    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Invalid Input', 'Please enter valid numbers');
      return;
    }
    onSave({
      name: title,
      latitude: lat,
      longitude: lon,
    });
    onClose();
  };

  const handleMapPick = () => {
    if (mode === 'add' && !title.trim()) {
      Alert.alert('Required', 'Please enter a title for the location');
      return;
    }
    onPickMap(title);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{mode === 'add' ? 'Add Location' : `Edit ${initialTitle}`}</Text>
                <TouchableOpacity onPress={onClose}><X size={24} color="#9ca3af" /></TouchableOpacity>
              </View>

              {mode === 'add' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Title</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Gym, Park"
                  />
                </View>
              )}

              <View style={styles.optionsContainer}>
                <TouchableOpacity style={styles.optionButton} onPress={handleMapPick}>
                  <MapIcon size={24} color="#4f46e5" />
                  <Text style={styles.optionText}>Choose on Map</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionButton} onPress={handleCurrentLocation}>
                  {loading ? <ActivityIndicator color="#4f46e5" /> : <Locate size={24} color="#4f46e5" />}
                  <Text style={styles.optionText}>Current Location</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionButton} onPress={() => setShowManualInput(!showManualInput)}>
                  <Type size={24} color="#4f46e5" />
                  <Text style={styles.optionText}>Enter Coordinates</Text>
                </TouchableOpacity>
              </View>

              {showManualInput && (
                <View style={styles.manualInputContainer}>
                  <TextInput
                    style={[styles.input, { marginBottom: 8 }]}
                    value={manualCoords.lat}
                    onChangeText={(t) => setManualCoords(prev => ({ ...prev, lat: t }))}
                    placeholder="Latitude"
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { marginBottom: 8 }]}
                    value={manualCoords.lon}
                    onChangeText={(t) => setManualCoords(prev => ({ ...prev, lon: t }))}
                    placeholder="Longitude"
                    keyboardType="numeric"
                  />
                  <TouchableOpacity style={styles.saveButton} onPress={handleManualSubmit}>
                    <Text style={styles.saveButtonText}>Save Coordinates</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

interface MapPickerModalProps {
  visible: boolean;
  initialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  onClose: () => void;
  onConfirm: (coords: { latitude: number; longitude: number }) => void;
}

function MapPickerModal({ visible, initialRegion, onClose, onConfirm }: MapPickerModalProps) {
  const [region, setRegion] = useState(initialRegion || {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
        >
          <Marker coordinate={region} />
        </MapView>
        <View style={styles.mapPickerOverlay}>
          <Text style={styles.mapPickerText}>Drag map to position marker</Text>
          <View style={styles.mapPickerButtons}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.buttonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={() => onConfirm(region)}>
              <Text style={styles.buttonTextConfirm}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function LocationsPage({ tasks, savedLocations, onAddLocation, onUpdateLocation }: LocationsPageProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'add' | 'edit'>('add');
  const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [isLocationsExpanded, setIsLocationsExpanded] = useState(false);
  const [isTasksExpanded, setIsTasksExpanded] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  const categories = ['All', 'Shopping', 'Personal', 'Social', 'Work'];

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    })();
  }, []);

  const toggleTaskSelection = (taskId: number) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleCategory = (category: string) => {
    if (category === 'All') {
      setSelectedCategories(['All']);
    } else {
      let newCategories = selectedCategories.filter(c => c !== 'All');
      if (selectedCategories.includes(category)) {
        newCategories = newCategories.filter(c => c !== category);
      } else {
        newCategories = [...newCategories, category];
      }
      if (newCategories.length === 0) newCategories = ['All'];
      setSelectedCategories(newCategories);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (selectedCategories.includes('All')) return true;
    return task.category && selectedCategories.includes(task.category);
  });

  const handleAddPress = () => {
    setPickerMode('add');
    setEditingLocation(null);
    setTempTitle('');
    setPickerVisible(true);
  };

  const handleEditPress = (loc: SavedLocation) => {
    setPickerMode('edit');
    setEditingLocation(loc);
    setTempTitle(loc.name);
    setPickerVisible(true);
  };

  const handleSaveLocation = (data: { name: string; latitude: number; longitude: number; address?: string }) => {
    if (pickerMode === 'add') {
      onAddLocation({ 
        name: data.name, 
        latitude: data.latitude, 
        longitude: data.longitude, 
        address: data.address || `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}` 
      });
    } else if (editingLocation) {
      onUpdateLocation({ 
        ...editingLocation, 
        latitude: data.latitude, 
        longitude: data.longitude, 
        address: data.address || `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}` 
      });
    }
    setPickerVisible(false);
  };

  const handlePickMap = (name: string) => {
    setTempTitle(name);
    setPickerVisible(false);
    setMapPickerVisible(true);
  };

  const handleMapConfirm = async (coords: { latitude: number; longitude: number }) => {
    setMapPickerVisible(false);
    
    let address = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
    try {
      const geocoded = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      if (geocoded && geocoded.length > 0) {
        const addr = geocoded[0];
        address = [addr.street, addr.name, addr.city].filter(Boolean).join(', ');
      }
    } catch (e) {
      console.log('Reverse geocoding failed', e);
    }

    if (pickerMode === 'add') {
       onAddLocation({ 
         name: tempTitle, 
         latitude: coords.latitude, 
         longitude: coords.longitude, 
         address: address
       });
    } else if (editingLocation) {
       onUpdateLocation({ 
         ...editingLocation, 
         latitude: coords.latitude, 
         longitude: coords.longitude, 
         address: address
       });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your locations</Text>
        <TouchableOpacity onPress={handleAddPress} style={styles.addButton}>
          <Plus size={24} color="#4b5563" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Saved Locations List */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.filterHeader} 
            onPress={() => setIsLocationsExpanded(!isLocationsExpanded)}
          >
            <Text style={styles.filterTitle}>All Locations</Text>
            {isLocationsExpanded ? <ChevronUp size={20} color="#4b5563" /> : <ChevronDown size={20} color="#4b5563" />}
          </TouchableOpacity>

          {isLocationsExpanded && (
            <View style={{ marginTop: 12 }}>
              {savedLocations.map((loc) => (
                <TouchableOpacity key={loc.id} style={styles.locationItem} onPress={() => handleEditPress(loc)}>
                  <Text style={styles.locationLabel}>{loc.name}: </Text>
                  <Text style={styles.locationValue} numberOfLines={1}>{loc.address || 'Set location'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Category Filter */}
        <View style={styles.filterSection}>
          <TouchableOpacity 
            style={styles.filterHeader} 
            onPress={() => setIsCategoryModalVisible(true)}
          >
            <Text style={styles.filterTitle}>Choose your category</Text>
            <ChevronDown size={20} color="#4b5563" />
          </TouchableOpacity>
          <Text style={styles.selectionSummary} numberOfLines={1}>
            {selectedCategories.join(', ')}
          </Text>
        </View>



        <SelectionModal
          visible={isCategoryModalVisible}
          title="Choose Category"
          options={categories}
          selectedOptions={selectedCategories}
          onClose={() => setIsCategoryModalVisible(false)}
          onSelect={toggleCategory}
        />



        {/* Filtered Tasks List */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.filterHeader} 
            onPress={() => setIsTasksExpanded(!isTasksExpanded)}
          >
            <Text style={styles.filterTitle}>Choose your tasks</Text>
            {isTasksExpanded ? <ChevronUp size={20} color="#4b5563" /> : <ChevronDown size={20} color="#4b5563" />}
          </TouchableOpacity>

          {isTasksExpanded && (
            filteredTasks.length > 0 ? (
              <View style={{ marginTop: 12, gap: 8 }}>
                {filteredTasks.map(task => (
                  <TouchableOpacity 
                    key={task.id} 
                    style={styles.taskRow}
                    onPress={() => toggleTaskSelection(task.id)}
                  >
                    <View style={[styles.checkbox, selectedTaskIds.includes(task.id) && styles.checkboxChecked]}>
                        {selectedTaskIds.includes(task.id) && <Check size={12} color="white" />}
                    </View>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No tasks found for selected categories.</Text>
            )
          )}
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: userLocation?.coords.latitude || 46.7712,
              longitude: userLocation?.coords.longitude || 23.6236,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {userLocation && (
              <Marker
                coordinate={{
                  latitude: userLocation.coords.latitude,
                  longitude: userLocation.coords.longitude,
                }}
                title="You are here"
              />
            )}
            {savedLocations.map(loc => (
              loc.latitude && loc.longitude ? (
                <Marker
                  key={loc.id}
                  coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                  title={loc.name}
                  description={loc.address}
                />
              ) : null
            ))}
          </MapView>
        </View>
      </ScrollView>

      <LocationPickerModal
        visible={pickerVisible}
        mode={pickerMode}
        initialTitle={editingLocation?.name || tempTitle}
        onClose={() => setPickerVisible(false)}
        onPickMap={handlePickMap}
        onSave={handleSaveLocation}
      />

      <MapPickerModal
        visible={mapPickerVisible}
        onClose={() => setMapPickerVisible(false)}
        onConfirm={handleMapConfirm}
        initialRegion={userLocation ? {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        } : undefined}
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    width: 60,
  },
  locationValue: {
    fontSize: 16,
    color: '#6b7280',
    flex: 1,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  checkboxGroup: {
    flexDirection: 'column',
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#4b5563',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  mapContainer: {
    flex: 1,
    minHeight: 300,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  selectionSummary: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: -8,
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxHeight: '70%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#4b5563',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskTitle: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  manualInputContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  mapPickerOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  mapPickerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 16,
  },
  mapPickerButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#4f46e5',
  },
  buttonTextCancel: {
    color: '#4b5563',
    fontWeight: '600',
  },
  buttonTextConfirm: {
    color: 'white',
    fontWeight: '600',
  },
});
