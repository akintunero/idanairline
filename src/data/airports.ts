import type { Airport } from '../types';

export const airports: Airport[] = [
  { code: 'LOS', city: 'Lagos', name: 'Murtala Muhammed International Airport', country: 'Nigeria', region: 'Africa' },
  { code: 'ABV', city: 'Abuja', name: 'Nnamdi Azikiwe International Airport', country: 'Nigeria', region: 'Africa' },
  { code: 'ACC', city: 'Accra', name: 'Kotoka International Airport', country: 'Ghana', region: 'Africa' },
  { code: 'LHR', city: 'London', name: 'Heathrow Airport', country: 'United Kingdom', region: 'Europe' },
  { code: 'CDG', city: 'Paris', name: 'Charles de Gaulle Airport', country: 'France', region: 'Europe' },
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy International Airport', country: 'United States', region: 'Americas' },
  { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles International Airport', country: 'United States', region: 'Americas' },
  { code: 'DXB', city: 'Dubai', name: 'Dubai International Airport', country: 'UAE', region: 'Asia' },
  { code: 'SIN', city: 'Singapore', name: 'Singapore Changi Airport', country: 'Singapore', region: 'Asia' },
];

export const getAirport = (code: string): Airport | undefined =>
  airports.find(a => a.code === code);
