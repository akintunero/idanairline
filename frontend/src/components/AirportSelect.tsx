import { useState, useRef, useEffect } from 'react';
import { MapPin, Search } from 'lucide-react';
import { airports } from '../data/airports';

interface AirportSelectProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  isDark?: boolean;
  exclude?: string;
}

export default function AirportSelect({ value, onChange, placeholder = 'City or airport', isDark, exclude }: AirportSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = airports.find(a => a.code === value);

  const filtered = airports
    .filter(a => a.code !== exclude)
    .filter(a => {
      const q = query.toLowerCase();
      return !q || a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) || a.country.toLowerCase().includes(q);
    });

  const grouped = filtered.reduce<Record<string, typeof airports>>((acc, airport) => {
    if (!acc[airport.region]) acc[airport.region] = [];
    acc[airport.region].push(airport);
    return acc;
  }, {});

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const inputCls = isDark
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-sky-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-sky-500';

  const dropdownCls = isDark
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-200';

  const hoverCls = isDark
    ? 'hover:bg-gray-700'
    : 'hover:bg-sky-50';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery(''); }}
        className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-lg border text-left transition-all ${inputCls} focus:outline-none focus:ring-2 focus:ring-sky-500/30`}
      >
        <MapPin className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-sky-400' : 'text-sky-500'}`} />
        {selected ? (
          <div className="min-w-0">
            <div className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {selected.city} ({selected.code})
            </div>
            <div className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {selected.name}
            </div>
          </div>
        ) : (
          <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{placeholder}</span>
        )}
      </button>

      {open && (
        <div className={`absolute z-50 w-72 top-full mt-1.5 rounded-xl border shadow-2xl overflow-hidden ${dropdownCls}`}>
          <div className={`p-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="relative">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search airports..."
                className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border-0 outline-none ${
                  isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {Object.entries(grouped).map(([region, list]) => (
              <div key={region}>
                <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {region}
                </div>
                {list.map(airport => (
                  <button
                    key={airport.code}
                    type="button"
                    onClick={() => { onChange(airport.code); setOpen(false); setQuery(''); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${hoverCls}`}
                  >
                    <span className={`w-10 text-center font-bold text-xs rounded px-1 py-0.5 flex-shrink-0 ${
                      isDark ? 'bg-gray-700 text-sky-400' : 'bg-sky-100 text-sky-700'
                    }`}>
                      {airport.code}
                    </span>
                    <div className="min-w-0">
                      <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {airport.city}
                      </div>
                      <div className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {airport.country}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
            {Object.keys(grouped).length === 0 && (
              <div className={`px-4 py-6 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                No airports found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
