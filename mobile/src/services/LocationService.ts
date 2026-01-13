import * as Location from 'expo-location';
import { DevLogger } from './DevLogger';
import { GOOGLE_PLACES_API_KEY } from '../config/secrets';

// TODO: Replace with your actual Google Maps API Key
// Ideally, this should be in an environment variable (e.g., .env file with expo-constants)
// Key is now loaded from secrets.ts (gitignored)

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
   * Request location permissions explicitly
   */
  requestPermissions: async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      DevLogger.log('[LocationService] Error requesting permissions', error);
      return false;
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
