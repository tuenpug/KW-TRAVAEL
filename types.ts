
export enum TravelStyle {
  RELAXED = 'Relaxed',
  FOODIE = 'Foodie',
  ADVENTURE = 'Adventure',
  ARTSY = 'Artsy/Cultural',
  SCENIC = 'Scenic',
  SIGHTSEEING = 'Sightseeing',
  SHOPPING = 'Shopping',
  FAMILY = 'Family',
}

export interface TripData {
  destination: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  adults: number;
  children: number;
  accommodation: string;
  dailyAccommodations: Record<number, string>; // Day index -> Address
  breakfastTime: string;
  selfDrive: boolean;
  styles: TravelStyle[];
  mustSees: string;
}

export interface Activity {
  id: string;
  dayIndex: number;
  startTime: string; // HH:MM
  durationMinutes: number;
  title: string;
  description: string;
  location: string;
  type: 'food' | 'sight' | 'shopping' | 'transport' | 'other';
  rating: number; // 1-5 stars (User set)
  tips?: string;
  transportInfo?: string;
  reason?: string;
  imageUrl?: string; // Placeholder or generated
  isLocked?: boolean; // If 5 stars, treated as locked during regeneration
}

export type Itinerary = Activity[];

export interface SavedTrip {
  id: string;
  name: string;
  tripData: TripData;
  itinerary: Itinerary;
  updatedAt: number;
}

export interface AppState {
  step: 'context' | 'planner' | 'overview';
  tripData: TripData;
  itinerary: Itinerary;
  isLoading: boolean;
  loadingMessage: string;
}
