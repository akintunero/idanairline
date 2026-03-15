import { useState } from 'react';
import { ArrowLeftRight, Calendar, Users, Search } from 'lucide-react';
import AirportSelect from './AirportSelect';
import type { SearchParams, SeatClass } from '../types';

interface FlightSearchFormProps {
  initialParams?: Partial<SearchParams>;
  onSearch: (params: SearchParams) => void;
  isDark?: boolean;
  compact?: boolean;
}

export default function FlightSearchForm({ initialParams, onSearch, isDark, compact }: FlightSearchFormProps) {
  const [tripType, setTripType] = useState<'oneway' | 'return'>('return');
  const [origin, setOrigin] = useState(initialParams?.origin || '');
  const [destination, setDestination] = useState(initialParams?.destination || '');
  const [departureDate, setDepartureDate] = useState(initialParams?.departureDate || '');
  const [returnDate, setReturnDate] = useState(initialParams?.returnDate || '');
  const [passengers, setPassengers] = useState(initialParams?.passengers || 1);
  const [seatClass, setSeatClass] = useState<SeatClass>(initialParams?.seatClass || 'economy');

  const today = new Date().toISOString().split('T')[0];

  const swapAirports = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSearch = () => {
    if (!origin || !destination || !departureDate) return;
    onSearch({ origin, destination, departureDate, returnDate: tripType === 'return' ? returnDate : undefined, passengers, seatClass });
  };

  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const inputBase = isDark
    ? 'bg-gray-700/60 border-gray-600 text-white focus:border-sky-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-sky-500';
  const labelCls = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`${compact ? '' : `${cardBg} rounded-2xl shadow-xl p-6`}`}>
      {/* Trip type selector */}
      <div className="flex items-center gap-4 mb-5">
        {(['return', 'oneway'] as const).map(type => (
          <button
            key={type}
            onClick={() => setTripType(type)}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              tripType === type
                ? 'text-sky-600'
                : (isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
            }`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
              tripType === type ? 'border-sky-600' : (isDark ? 'border-gray-600' : 'border-gray-300')
            }`}>
              {tripType === type && <span className="w-2 h-2 rounded-full bg-sky-600 block" />}
            </span>
            {type === 'return' ? 'Round Trip' : 'One Way'}
          </button>
        ))}

        <div className={`ml-auto flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          <Users className="w-4 h-4" />
          <select
            value={passengers}
            onChange={e => setPassengers(Number(e.target.value))}
            className={`border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${inputBase}`}
          >
            {[1,2,3,4,5,6].map(n => (
              <option key={n} value={n}>{n} Passenger{n > 1 ? 's' : ''}</option>
            ))}
          </select>
          <select
            value={seatClass}
            onChange={e => setSeatClass(e.target.value as SeatClass)}
            className={`border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${inputBase}`}
          >
            <option value="economy">Economy</option>
            <option value="business">Business</option>
            <option value="first">First Class</option>
          </select>
        </div>
      </div>

      {/* Search fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Origin */}
        <div className="relative">
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelCls}`}>From</label>
          <AirportSelect value={origin} onChange={setOrigin} placeholder="Origin city" isDark={isDark} exclude={destination} />
        </div>

        {/* Swap button */}
        <div className="relative md:col-span-0">
          <div className="hidden md:block absolute left-0 top-1/2 -translate-x-1/2 z-10 mt-3">
            <button
              onClick={swapAirports}
              className="w-8 h-8 rounded-full bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center shadow-md transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelCls}`}>To</label>
          <AirportSelect value={destination} onChange={setDestination} placeholder="Destination city" isDark={isDark} exclude={origin} />
        </div>

        {/* Departure date */}
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelCls}`}>Departure</label>
          <div className="relative">
            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-sky-400' : 'text-sky-500'}`} />
            <input
              type="date"
              value={departureDate}
              min={today}
              onChange={e => setDepartureDate(e.target.value)}
              className={`w-full pl-10 pr-3 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all ${inputBase}`}
            />
          </div>
        </div>

        {/* Return date */}
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelCls}`}>
            Return {tripType === 'oneway' && <span className="text-gray-400">(optional)</span>}
          </label>
          <div className="relative">
            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <input
              type="date"
              value={returnDate}
              min={departureDate || today}
              onChange={e => setReturnDate(e.target.value)}
              disabled={tripType === 'oneway'}
              className={`w-full pl-10 pr-3 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${inputBase}`}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSearch}
          disabled={!origin || !destination || !departureDate}
          className="flex items-center gap-2 px-8 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-sky-200 transition-all"
        >
          <Search className="w-4 h-4" />
          Search Flights
        </button>
      </div>
    </div>
  );
}
