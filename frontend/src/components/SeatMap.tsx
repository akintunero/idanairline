import { useState, useEffect } from 'react';

interface Seat {
  id: number;
  flight_id: string;
  seat_number: string;
  seat_class: string;
  is_available: boolean;
}

interface SeatMapProps {
  flightId: string;
  onSelectSeat: (seatNumber: string) => void;
  selectedSeat: string;
  isDark: boolean;
}

const classColors: Record<string, { bg: string; label: string }> = {
  economy: { bg: 'bg-emerald-500', label: 'Economy' },
  business: { bg: 'bg-amber-500', label: 'Business' },
  first: { bg: 'bg-sky-500', label: 'First' },
};

export default function SeatMap({ flightId, onSelectSeat, selectedSeat, isDark }: SeatMapProps) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSeats();
  }, [flightId]);

  const fetchSeats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/flights/seats?flight_id=${flightId}`);
      const data = await res.json();
      if (data.success && data.data?.seats) {
        setSeats(data.data.seats);
      }
    } catch { setError('Failed to load seat map'); }
    setLoading(false);
  };

  if (loading) return <div className={`text-sm text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading seat map...</div>;
  if (error) return <div className="text-sm text-center py-8 text-red-500">{error}</div>;

  const economySeats = seats.filter(s => s.seat_class === 'economy');
  const businessSeats = seats.filter(s => s.seat_class === 'business');
  const firstSeats = seats.filter(s => s.seat_class === 'first');

  const renderSeat = (seat: Seat) => {
    const isSelected = selectedSeat === seat.seat_number;
    const color = classColors[seat.seat_class]?.bg || 'bg-gray-500';
    return (
      <button
        key={seat.seat_number}
        disabled={!seat.is_available && !isSelected}
        onClick={() => seat.is_available && onSelectSeat(seat.seat_number)}
        className={`
          w-8 h-8 rounded text-[10px] font-bold transition-all flex items-center justify-center
          ${isSelected ? 'ring-2 ring-offset-1 ring-sky-500 scale-110 z-10' : ''}
          ${seat.is_available
            ? `${color} text-white hover:opacity-80 cursor-pointer`
            : `${isDark ? 'bg-gray-700 text-gray-600' : 'bg-gray-200 text-gray-400'} cursor-not-allowed`
          }
        `}
        title={`${seat.seat_number} (${seat.seat_class})${!seat.is_available ? ' — occupied' : ''}`}
      >
        {seat.seat_number.slice(1)}
      </button>
    );
  };

  const renderCabin = (seatsList: Seat[], cols: number) => {
    const rows: Seat[][] = [];
    for (let i = 0; i < seatsList.length; i += cols) {
      rows.push(seatsList.slice(i, i + cols));
    }
    return (
      <div className="flex flex-col items-center gap-1.5">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1.5">
            {row.map((seat, si) => (
              <div key={seat.seat_number} className="flex">
                {renderSeat(seat)}
                {si === Math.floor(cols / 2) - 1 && <div className="w-4" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`rounded-xl border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
        Select Seat
      </h3>

      {/* Aircraft outline */}
      <div className="flex flex-col items-center">
        {/* Cockpit */}
        <div className={`w-48 h-6 rounded-t-full border-2 border-b-0 ${isDark ? 'border-gray-600' : 'border-gray-300'} flex items-center justify-center`}>
          <div className={`text-[8px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>COCKPIT</div>
        </div>

        {/* Cabins */}
        <div className={`w-56 border-2 ${isDark ? 'border-gray-600 bg-gray-900/50' : 'border-gray-300 bg-gray-50'} px-4 py-4 space-y-6`}>
          {firstSeats.length > 0 && (
            <div>
              <div className={`text-[10px] font-semibold mb-2 text-center uppercase tracking-wider ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>First Class</div>
              {renderCabin(firstSeats, 4)}
            </div>
          )}
          {businessSeats.length > 0 && (
            <div>
              <div className={`text-[10px] font-semibold mb-2 text-center uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Business</div>
              {renderCabin(businessSeats, 4)}
            </div>
          )}
          {economySeats.length > 0 && (
            <div>
              <div className={`text-[10px] font-semibold mb-2 text-center uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Economy</div>
              {renderCabin(economySeats, 6)}
            </div>
          )}
        </div>

        {/* Tail */}
        <div className={`w-48 h-4 rounded-b-full border-2 border-t-0 ${isDark ? 'border-gray-600' : 'border-gray-300'}`} />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-sky-500 ring-2 ring-offset-1 ring-sky-500" />
          <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Selected</span>
        </div>
        {selectedSeat && (
          <div className="flex items-center gap-1.5 text-sky-600 font-semibold">
            <span>Seat: {selectedSeat}</span>
          </div>
        )}
      </div>
    </div>
  );
}
