export interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  date: string;
  category?: string;
  priority?: string;
  source?: string;
  location?: string;
  locationCoordinates?: {
    latitude: number;
    longitude: number;
  };
  locationAddress?: string;
  completedAt?: string;
}

export interface SavedLocation {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}
