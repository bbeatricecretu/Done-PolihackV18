import * as Location from 'expo-location';
import { DevLogger } from './DevLogger';

// TODO: Replace with your actual Google Maps API Key
// Ideally, this should be in an environment variable (e.g., .env file with expo-constants)
const GOOGLE_PLACES_API_KEY = 'AIzaSyDdFH1W6GHJ07UIL3WJ52mPFsGup9zCvYY'; 

export interface PlaceResult {
  name: string;
  address: string;
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    }
  };
  place_id: string;
  vicinity?: string;
  isOpen?: boolean;
}

export const LocationService = {
  /**
   * Request location permissions explicitly (including background)
   */
  requestPermissions: async (): Promise<boolean> => {
    try {
      // First request foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        DevLogger.log('[LocationService] Foreground permission denied');
        return false;
      }

      // Then request background permissions
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        DevLogger.log('[LocationService] Background permission denied');
        // Still return true if foreground is granted
        return true;
      }

      DevLogger.log('[LocationService] All location permissions granted');
      return true;
    } catch (error) {
      DevLogger.log('[LocationService] Error requesting permissions', error);
      return false;
    }
  },

  /**
   * Start background location tracking
   */
  startBackgroundLocationTracking: async (taskName: string = 'BACKGROUND_LOCATION_TASK'): Promise<boolean> => {
    try {
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();

      if (foregroundStatus !== 'granted' || backgroundStatus !== 'granted') {
        DevLogger.log('[LocationService] Background location permissions not granted');
        return false;
      }

      // Check if task is already registered
      const isRegistered = await Location.hasStartedLocationUpdatesAsync(taskName);
      if (isRegistered) {
        DevLogger.log('[LocationService] Background location already running');
        return true;
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(taskName, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000, // Update every 60 seconds
        distanceInterval: 50, // Or when moved 50 meters
        foregroundService: {
          notificationTitle: 'Memento Task Manager',
          notificationBody: 'Tracking location for nearby task alerts',
          notificationColor: '#3b82f6',
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      });

      DevLogger.log('[LocationService] Background location tracking started');
      return true;
    } catch (error) {
      DevLogger.log('[LocationService] Error starting background location', error);
      return false;
    }
  },

  /**
   * Stop background location tracking
   */
  stopBackgroundLocationTracking: async (taskName: string = 'BACKGROUND_LOCATION_TASK'): Promise<void> => {
    try {
      const isRegistered = await Location.hasStartedLocationUpdatesAsync(taskName);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(taskName);
        DevLogger.log('[LocationService] Background location tracking stopped');
      }
    } catch (error) {
      DevLogger.log('[LocationService] Error stopping background location', error);
    }
  },

  /**
   * Request permissions and get current user location
   */
  getCurrentLocation: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        DevLogger.log('[LocationService] Permission to access location was denied');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      return location.coords;
    } catch (error) {
      DevLogger.log('[LocationService] Error getting location', error);
      return null;
    }
  },

  /**
   * Search for nearby places using Google Places API
   */
  searchNearbyPlaces: async (
    latitude: number, 
    longitude: number, 
    keyword: string, 
    type?: string,
    radius: number = 1500 // 1.5km radius default
  ): Promise<PlaceResult[]> => {
    try {
      let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&key=${GOOGLE_PLACES_API_KEY}`;
      
      if (keyword) {
        url += `&keyword=${encodeURIComponent(keyword)}`;
      }
      
      if (type) {
        url += `&type=${type}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.results.map((place: any) => ({
          name: place.name,
          address: place.vicinity || place.formatted_address,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          geometry: place.geometry,
          place_id: place.place_id,
          isOpen: place.opening_hours?.open_now
        }));
      } else {
        DevLogger.log('[LocationService] Places API Error', data.status);
        return [];
      }
    } catch (error) {
      DevLogger.log('[LocationService] Error searching places', error);
      return [];
    }
  }
};
