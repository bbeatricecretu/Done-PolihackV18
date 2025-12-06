import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, MapPin, Star, Navigation } from 'lucide-react-native';
import { LocationService, PlaceResult } from '../services/LocationService';
import { DevLogger } from '../services/DevLogger';

interface NearbyPlacesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlace: (place: PlaceResult) => void;
  searchKeyword: string;
  searchType?: string | null;
}

export function NearbyPlacesModal({ visible, onClose, onSelectPlace, searchKeyword, searchType }: NearbyPlacesModalProps) {
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && searchKeyword) {
      fetchPlaces();
    }
  }, [visible, searchKeyword]);

  const fetchPlaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const location = await LocationService.getCurrentLocation();
      if (!location) {
        setError('Could not get current location. Please enable location services.');
        setLoading(false);
        return;
      }

      const results = await LocationService.searchNearbyPlaces(
        location.latitude,
        location.longitude,
        searchKeyword,
        searchType || undefined
      );

      setPlaces(results);
      if (results.length === 0) {
        setError('No nearby places found.');
      }
    } catch (err) {
      setError('Failed to search for places.');
      DevLogger.log('[NearbyPlacesModal] Error', err);
    } finally {
      setLoading(false);
    }
  };

  const renderPlaceItem = ({ item }: { item: PlaceResult }) => (
    <TouchableOpacity 
      style={styles.placeItem}
      onPress={() => onSelectPlace(item)}
    >
      <View style={styles.placeHeader}>
        <Text style={styles.placeName}>{item.name}</Text>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Star size={14} color="#FFD700" fill="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.ratingCount}>({item.user_ratings_total})</Text>
          </View>
        )}
      </View>
      <Text style={styles.placeAddress}>{item.address}</Text>
      {item.isOpen !== undefined && (
        <Text style={[styles.openStatus, { color: item.isOpen ? '#4CAF50' : '#F44336' }]}>
          {item.isOpen ? 'Open Now' : 'Closed'}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Nearby "{searchKeyword}"</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#6200EE" />
              <Text style={styles.loadingText}>Searching nearby places...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchPlaces}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={places}
              renderItem={renderPlaceItem}
              keyExtractor={(item) => item.place_id}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: '#F44336',
    marginBottom: 10,
  },
  retryButton: {
    padding: 10,
    backgroundColor: '#6200EE',
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20,
  },
  placeItem: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 10,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: 'bold',
    color: '#333',
    fontSize: 12,
  },
  ratingCount: {
    marginLeft: 2,
    color: '#999',
    fontSize: 10,
  },
  placeAddress: {
    color: '#666',
    fontSize: 14,
    marginBottom: 5,
  },
  openStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
