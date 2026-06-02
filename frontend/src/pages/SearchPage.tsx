import { useState, useEffect } from 'react';
import { Clock, Plane, ChevronRight, Filter, ArrowUpDown, Wifi, Utensils, Luggage } from 'lucide-react';
import FlightSearchForm from '../components/FlightSearchForm';
import { generateFlights } from '../data/mockFlights';
import { getAirport } from '../data/airports';
import type { SearchParams, Flight, SeatClass } from '../types';

interface SearchPageProps {
  searchParams: SearchParams | null;
  onSearch: (params: SearchParams) => void;
  onSelectFlight: (flight: Flight, params: SearchParams) => void;
  isDark: boolean;
}

export default function SearchPage({ searchParams, onSearch, onSelectFlight, isDark }: SearchPageProps) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'departure'>('price');
  const [filterClass, setFilterClass] = useState<SeatClass | 'all'>('all');

  useEffect(() => {
    if (!searchParams) return;
    setLoading(true);
    setTimeout(() => {
      const results = generateFlights(searchParams);
      setFlights(results);
      setLoading(false);
    }, 900);
  }, [searchParams]);

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  const sortedFlights = [...flights]
    .filter(f => filterClass === 'all' || f.seatClass === filterClass)
    .sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'duration') return a.duration.localeCompare(b.duration);
      return a.departureTime.localeCompare(b.departureTime);
    });

  const originAirport = searchParams ? getAirport(searchParams.origin) : null;
  const destAirport = searchParams ? getAirport(searchParams.destination) : null;

  return (
    <div className={`${bg} min-h-screen`}>
      {/* Search bar */}
      <div className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <FlightSearchForm
            initialParams={searchParams || undefined}
            onSearch={onSearch}
            isDark={isDark}
            compact
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Route header */}
        {searchParams && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <h1 className={`text-2xl font-bold ${textPrimary}`}>
                {originAirport?.city || searchParams.origin}
              </h1>
              <Plane className={`w-5 h-5 ${isDark ? 'text-sky-400' : 'text-sky-500'}`} />
              <h1 className={`text-2xl font-bold ${textPrimary}`}>
                {destAirport?.city || searchParams.destination}
              </h1>
            </div>
            <p className={`text-sm ${textSecondary}`}>
              {searchParams.departureDate} &bull; {searchParams.passengers} passenger{searchParams.passengers > 1 ? 's' : ''} &bull; {searchParams.seatClass.charAt(0).toUpperCase() + searchParams.seatClass.slice(1)}
            </p>
          </div>
        )}

        {/* Sort & filter controls */}
        <div className={`flex flex-wrap items-center gap-3 mb-5 p-3 rounded-xl border ${cardBg}`}>
          <div className="flex items-center gap-1.5 text-sm">
            <ArrowUpDown className={`w-4 h-4 ${textSecondary}`} />
            <span className={textSecondary}>Sort:</span>
          </div>
          {[
            { value: 'price', label: 'Price' },
            { value: 'duration', label: 'Duration' },
            { value: 'departure', label: 'Departure' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value as typeof sortBy)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === opt.value
                  ? 'bg-sky-600 text-white'
                  : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }`}
            >
              {opt.label}
            </button>
          ))}

          <div className={`w-px h-4 mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
          <div className="flex items-center gap-1.5 text-sm">
            <Filter className={`w-4 h-4 ${textSecondary}`} />
          </div>
          {[
            { value: 'all', label: 'All Classes' },
            { value: 'economy', label: 'Economy' },
            { value: 'business', label: 'Business' },
            { value: 'first', label: 'First' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterClass(opt.value as typeof filterClass)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterClass === opt.value
                  ? 'bg-sky-600 text-white'
                  : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
              }`}
            >
              {opt.label}
            </button>
          ))}

          <span className={`ml-auto text-xs ${textSecondary}`}>
            {loading ? 'Searching...' : `${sortedFlights.length} flight${sortedFlights.length !== 1 ? 's' : ''} found`}
          </span>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={`${cardBg} rounded-xl border p-5 animate-pulse`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-4 rounded w-1/3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                    <div className={`h-3 rounded w-1/4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                  </div>
                  <div className={`w-20 h-8 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flight results */}
        {!loading && (
          <div className="space-y-3">
            {sortedFlights.map((flight, idx) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                onSelect={() => searchParams && onSelectFlight(flight, searchParams)}
                isDark={isDark}
                isCheapest={idx === 0}
              />
            ))}
            {sortedFlights.length === 0 && searchParams && (
              <div className={`${cardBg} rounded-xl border p-12 text-center`}>
                <Plane className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={`font-medium ${textPrimary}`}>No flights found</p>
                <p className={`text-sm mt-1 ${textSecondary}`}>Try different dates or airports</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FlightCard({ flight, onSelect, isDark, isCheapest }: {
  flight: Flight;
  onSelect: () => void;
  isDark: boolean;
  isCheapest: boolean;
}) {
  const cardBg = isDark ? 'bg-gray-800 border-gray-700 hover:border-sky-500/50' : 'bg-white border-gray-200 hover:border-sky-400/60';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  const classColors: Record<string, string> = {
    economy: 'bg-emerald-100 text-emerald-700',
    business: 'bg-amber-100 text-amber-700',
    first: 'bg-sky-100 text-sky-700',
  };

  return (
    <div className={`${cardBg} rounded-xl border p-5 transition-all hover:shadow-md group`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Airline info */}
        <div className="flex items-center gap-3 lg:w-40">
          <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className={`text-xs font-bold ${textPrimary}`}>Idan Airlines</div>
            <div className={`text-xs ${textSecondary}`}>{flight.flightNumber}</div>
          </div>
        </div>

        {/* Route */}
        <div className="flex items-center gap-3 flex-1">
          <div className="text-center">
            <div className={`text-xl font-bold ${textPrimary}`}>{flight.departureTime}</div>
            <div className={`text-xs font-semibold ${textSecondary}`}>{flight.origin.code}</div>
          </div>

          <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
            <div className={`text-xs ${textSecondary} flex items-center gap-1`}>
              <Clock className="w-3 h-3" />
              {flight.duration}
            </div>
            <div className="w-full flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full border-2 flex-shrink-0 ${isDark ? 'border-gray-500' : 'border-gray-400'}`} />
              <div className={`flex-1 h-px ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
              <Plane className={`w-3.5 h-3.5 ${isDark ? 'text-sky-400' : 'text-sky-500'}`} />
              <div className={`flex-1 h-px ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
              <div className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
            </div>
            <div className={`text-xs ${textSecondary}`}>Direct</div>
          </div>

          <div className="text-center">
            <div className={`text-xl font-bold ${textPrimary}`}>{flight.arrivalTime}</div>
            <div className={`text-xs font-semibold ${textSecondary}`}>{flight.destination.code}</div>
          </div>
        </div>

        {/* Amenities */}
        <div className="hidden lg:flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${classColors[flight.seatClass]}`}>
            {flight.seatClass.charAt(0).toUpperCase() + flight.seatClass.slice(1)}
          </span>
          <div className="flex gap-1.5">
            <span title="Wi-Fi"><Wifi className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} aria-hidden="true" /></span>
            <span title="Meals"><Utensils className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} aria-hidden="true" /></span>
            <span title="Baggage included"><Luggage className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} aria-hidden="true" /></span>
          </div>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{flight.aircraft}</span>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between lg:flex-col lg:items-end gap-2 lg:w-36">
          <div>
            {isCheapest && (
              <div className="text-xs font-semibold text-emerald-600 mb-0.5">Best Price</div>
            )}
            <div className={`text-2xl font-bold ${textPrimary}`}>
              ${flight.price.toLocaleString()}
            </div>
            <div className={`text-xs ${textSecondary}`}>per person</div>
          </div>
          <button
            onClick={onSelect}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold transition-colors group-hover:shadow-md"
          >
            Select
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
