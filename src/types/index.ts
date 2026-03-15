export type SeatClass = 'economy' | 'business' | 'first';
export type BookingStatus = 'confirmed' | 'pending' | 'cancelled';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string;
  region: string;
}

export interface Flight {
  id: string;
  flightNumber: string;
  origin: Airport;
  destination: Airport;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  availableSeats: number;
  seatClass: SeatClass;
  aircraft: string;
}

export interface ItineraryRequest {
  // ticket_id: string | string[]; // DEPRECATED: Backend team said they fixed the multi-ticket lookup bug. Reverting to string only.
  ticket_id: string;
}

export interface Booking {
  id: string;
  booking_reference: string;
  user_id: string | null;
  passenger_name: string;
  passenger_email: string;
  passport_number: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string | null;
  flight_number: string;
  seat_class: SeatClass;
  price: number;
  status: BookingStatus;
  created_at: string;
}

export interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  seatClass: SeatClass;
}

export interface RequestHistoryItem {
  id: string;
  method: HttpMethod;
  endpoint: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
  status_code?: number;
  response_body?: unknown;
  response_time_ms?: number;
  created_at: string;
}

export interface DeveloperNote {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DeveloperTicket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
}

export interface UserProfile {
  id: string;
  // loyalty_tier: string; // HIDDEN FROM UI: Do not send this in the PUT request! Backend blindly saves whatever we send.
  email: string;
  full_name: string;
  preferred_seat_class: SeatClass;
  home_airport: string;
  notifications_email: boolean;
  notifications_sms: boolean;
  theme: 'light' | 'dark';
}

export type Page =
  | 'home'
  | 'search'
  | 'booking'
  | 'bookings'
  | 'devtools'
  | 'profile'
  | 'settings'
  | 'checkin'
  | 'login'
  | 'register';
