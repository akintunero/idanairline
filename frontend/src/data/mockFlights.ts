import type { Flight, SearchParams } from '../types';
import { getAirport } from './airports';

const FLIGHT_ROUTES: Array<{ origin: string; destination: string; basePrice: number; duration: string; aircraft: string }> = [
  { origin: 'LOS', destination: 'LHR', basePrice: 780, duration: '6h 45m', aircraft: 'Boeing 787-9' },
  { origin: 'LOS', destination: 'DXB', basePrice: 620, duration: '7h 10m', aircraft: 'Airbus A380' },
  { origin: 'LOS', destination: 'JFK', basePrice: 1150, duration: '12h 30m', aircraft: 'Boeing 777-300ER' },
  { origin: 'LOS', destination: 'CDG', basePrice: 820, duration: '7h 20m', aircraft: 'Airbus A350' },
  { origin: 'LOS', destination: 'SIN', basePrice: 950, duration: '11h 50m', aircraft: 'Boeing 787-9' },
  { origin: 'LOS', destination: 'ABV', basePrice: 120, duration: '0h 50m', aircraft: 'Airbus A220' },
  { origin: 'LOS', destination: 'ACC', basePrice: 180, duration: '1h 45m', aircraft: 'Airbus A220' },
  { origin: 'LHR', destination: 'JFK', basePrice: 690, duration: '7h 55m', aircraft: 'Boeing 777-200' },
  { origin: 'LHR', destination: 'DXB', basePrice: 520, duration: '7h 00m', aircraft: 'Airbus A380' },
  { origin: 'LHR', destination: 'SIN', basePrice: 870, duration: '13h 20m', aircraft: 'Boeing 787-9' },
  { origin: 'DXB', destination: 'SIN', basePrice: 440, duration: '7h 30m', aircraft: 'Airbus A380' },
  { origin: 'DXB', destination: 'JFK', basePrice: 750, duration: '13h 45m', aircraft: 'Boeing 777-300ER' },
  { origin: 'JFK', destination: 'LAX', basePrice: 220, duration: '5h 45m', aircraft: 'Airbus A321' },
  { origin: 'CDG', destination: 'DXB', basePrice: 480, duration: '6h 15m', aircraft: 'Airbus A350' },
  { origin: 'ABV', destination: 'LHR', basePrice: 840, duration: '7h 00m', aircraft: 'Boeing 787-9' },
  { origin: 'ACC', destination: 'LHR', basePrice: 720, duration: '6h 30m', aircraft: 'Airbus A330' },
];

function generateFlightNumber(origin: string, destination: string, index: number): string {
  return `ID${origin.substring(0, 1)}${destination.substring(0, 1)}${(100 + index * 7).toString()}`;
}

function generateDepartureTime(index: number): string {
  const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22];
  const h = hours[index % hours.length];
  const m = index % 2 === 0 ? '00' : '30';
  return `${h.toString().padStart(2, '0')}:${m}`;
}

function addDuration(time: string, duration: string): string {
  const [h, m] = time.split(':').map(Number);
  const match = duration.match(/(\d+)h\s*(\d+)m/);
  if (!match) return time;
  const dh = parseInt(match[1]);
  const dm = parseInt(match[2]);
  const totalMin = h * 60 + m + dh * 60 + dm;
  const nh = Math.floor(totalMin / 60) % 24;
  const nm = totalMin % 60;
  return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
}

export function generateFlights(params: SearchParams): Flight[] {
  const { origin, destination, seatClass } = params;

  const directRoutes = FLIGHT_ROUTES.filter(
    r => r.origin === origin && r.destination === destination
  );

  const reverseRoutes = FLIGHT_ROUTES.filter(
    r => r.origin === destination && r.destination === origin
  );

  const allRoutes = [...directRoutes, ...reverseRoutes.map(r => ({
    ...r,
    origin: r.destination,
    destination: r.origin,
  }))];

  if (allRoutes.length === 0) {
    const fallback = {
      origin,
      destination,
      basePrice: 650,
      duration: '8h 00m',
      aircraft: 'Boeing 787-9',
    };
    allRoutes.push(fallback);
  }

  const classMult: Record<string, number> = {
    economy: 1,
    business: 2.8,
    first: 4.5,
  };

  const flights: Flight[] = [];
  allRoutes.forEach((route, routeIndex) => {
    const originAirport = getAirport(route.origin);
    const destinationAirport = getAirport(route.destination);
    if (!originAirport || !destinationAirport) return;

    [0, 1, 2].forEach((i) => {
      const depTime = generateDepartureTime(routeIndex * 3 + i);
      const arrTime = addDuration(depTime, route.duration);
      const priceVariance = 1 + (i * 0.12);
      const price = Math.round(route.basePrice * classMult[seatClass] * priceVariance);

      flights.push({
        id: `${route.origin}-${route.destination}-${routeIndex}-${i}`,
        flightNumber: generateFlightNumber(route.origin, route.destination, routeIndex * 3 + i),
        origin: originAirport,
        destination: destinationAirport,
        departureTime: depTime,
        arrivalTime: arrTime,
        duration: route.duration,
        price,
        availableSeats: 10 + Math.floor(Math.random() * 40),
        seatClass,
        aircraft: route.aircraft,
      });
    });
  });

  return flights.sort((a, b) => a.price - b.price);
}

export function generateBookingReference(destination: string): string {
  const num = Math.floor(10000 + Math.random() * 89999);
  return `IDN-${num}-${destination}`;
}
