import { useState } from 'react';
import { Plane, Search, CheckCircle, Clock, XCircle, ChevronRight, Calendar, Hash } from 'lucide-react';
import type { Booking } from '../types';

interface BookingsPageProps {
  bookings: Booking[];
  isDark: boolean;
}

const SAMPLE_BOOKINGS: Booking[] = [
  {
    id: '1',
    booking_reference: 'IDN-48291-LHR',
    user_id: null,
    passenger_name: 'Adebayo Okafor',
    passenger_email: 'adebayo@example.com',
    passport_number: 'A12345678',
    origin: 'LOS',
    destination: 'LHR',
    departure_date: '2026-06-15',
    return_date: '2026-06-22',
    flight_number: 'IDL1100',
    seat_class: 'business',
    price: 2345,
    status: 'confirmed',
    created_at: '2026-05-01T10:00:00Z',
  },
  {
    id: '2',
    booking_reference: 'IDN-73812-DXB',
    user_id: null,
    passenger_name: 'Adebayo Okafor',
    passenger_email: 'adebayo@example.com',
    passport_number: 'A12345678',
    origin: 'LOS',
    destination: 'DXB',
    departure_date: '2026-07-04',
    return_date: null,
    flight_number: 'IDD1107',
    seat_class: 'economy',
    price: 694,
    status: 'pending',
    created_at: '2026-05-02T14:30:00Z',
  },
  {
    id: '3',
    booking_reference: 'IDN-29104-CDG',
    user_id: null,
    passenger_name: 'Adebayo Okafor',
    passenger_email: 'adebayo@example.com',
    passport_number: 'A12345678',
    origin: 'LHR',
    destination: 'CDG',
    departure_date: '2026-03-10',
    return_date: '2026-03-14',
    flight_number: 'IDP1054',
    seat_class: 'economy',
    price: 380,
    status: 'cancelled',
    created_at: '2026-02-15T09:00:00Z',
  },
];

export default function BookingsPage({ bookings, isDark }: BookingsPageProps) {
  const [searchRef, setSearchRef] = useState('');
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [pnrSearch, setPnrSearch] = useState('');
  const [pnrResult, setPnrResult] = useState<any>(null);
  const [pnrLoading, setPnrLoading] = useState(false);
  const [pnrError, setPnrError] = useState('');

  const handlePNRLookup = async () => {
    if (!pnrSearch.trim()) return;
    setPnrLoading(true);
    setPnrError('');
    setPnrResult(null);
    try {
      const token = localStorage.getItem('idan_auth_token');
      const res = await fetch('/api/v1/booking/itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token ?? ''}`
        },
        body: JSON.stringify({ ticket_id: pnrSearch.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Booking not found');

      if (data.data?.a01_flag) {
        alert(`\u{1F6A9} ACHIEVEMENT UNLOCKED (A01: Broken Access Control) \u{1F6A9}\n\nFlag: ${data.data.a01_flag}`);
      }

      setPnrResult(data.data);
    } catch (err: any) {
      setPnrError(err.message || 'Failed to look up booking');
    } finally {
      setPnrLoading(false);
    }
  };

  const allBookings = [...bookings, ...SAMPLE_BOOKINGS];

  const filtered = allBookings.filter(b => {
    const matchRef = !searchRef || b.booking_reference.toLowerCase().includes(searchRef.toLowerCase());
    const matchFilter = filter === 'all' || b.status === filter;
    return matchRef && matchFilter;
  });

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-sky-500'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-sky-400';

  const statusConfig = {
    confirmed: { icon: CheckCircle, color: 'text-emerald-600', bg: isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700', label: 'Confirmed' },
    pending: { icon: Clock, color: 'text-amber-600', bg: isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700', label: 'Pending' },
    cancelled: { icon: XCircle, color: 'text-red-500', bg: isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600', label: 'Cancelled' },
  };

  const classLabels: Record<string, string> = { economy: 'Economy', business: 'Business', first: 'First Class' };

  return (
    <div className={`${bg} min-h-screen py-8`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl font-bold mb-1 ${textPrimary}`}>My Bookings</h1>
          <p className={`text-sm ${textSecondary}`}>Manage your upcoming and past travel bookings</p>
        </div>

        {/* PNR Lookup */}
        <div className={`${cardBg} rounded-xl border p-6 mb-6`}>
          <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
            Find My Booking
          </h2>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Hash className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={pnrSearch}
                onChange={e => setPnrSearch(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handlePNRLookup()}
                placeholder="Enter your PNR (e.g. IDN-X7B9A2)"
                className={`w-full pl-9 pr-4 py-3 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all ${inputCls}`}
              />
            </div>
            <button
              onClick={handlePNRLookup}
              disabled={pnrLoading || !pnrSearch.trim()}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400/60 text-white rounded-xl font-semibold text-sm transition-all flex items-center gap-2"
            >
              {pnrLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Searching...</>
              ) : (
                <><Search className="w-4 h-4" /> Look Up</>
              )}
            </button>
          </div>

          {pnrError && (
            <div className="mt-3 flex items-center gap-2 text-red-500 text-sm">
              <XCircle className="w-4 h-4" /> {pnrError}
            </div>
          )}

          {pnrResult && (
            <div className={`mt-4 ${isDark ? 'bg-gray-700/50' : 'bg-sky-50'} rounded-xl p-5`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className={`font-bold text-lg ${textPrimary}`}>
                    {pnrResult.origin} <span className={`text-sm font-normal ${textSecondary}`}>→</span> {pnrResult.destination}
                  </div>
                  <div className={`text-xs ${textSecondary}`}>PNR: {pnrResult.ticket_id}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {pnrResult.passenger_name && (
                  <div>
                    <div className={`text-xs ${textSecondary}`}>Passenger</div>
                    <div className={`text-sm font-medium ${textPrimary}`}>{pnrResult.passenger_name}</div>
                  </div>
                )}
                <div>
                  <div className={`text-xs ${textSecondary}`}>Status</div>
                  <div className={`text-sm font-medium ${pnrResult.status === 'CONFIRMED' ? 'text-emerald-600' : textPrimary}`}>
                    {pnrResult.status}
                  </div>
                </div>
                <div>
                  <div className={`text-xs ${textSecondary}`}>Price</div>
                  <div className={`text-sm font-medium ${textPrimary}`}>
                    ${pnrResult.price?.toLocaleString()}
                  </div>
                </div>
              </div>
              {pnrResult.a01_flag && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm font-mono">
                  🚩 FLAG: {pnrResult.a01_flag}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Bookings', value: allBookings.length, color: 'text-sky-600' },
            { label: 'Upcoming', value: allBookings.filter(b => b.status === 'confirmed').length, color: 'text-emerald-600' },
            { label: 'Pending', value: allBookings.filter(b => b.status === 'pending').length, color: 'text-amber-600' },
          ].map(stat => (
            <div key={stat.label} className={`${cardBg} rounded-xl border p-4 text-center`}>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className={`text-xs mt-0.5 ${textSecondary}`}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search and filter */}
        <div className={`${cardBg} rounded-xl border p-4 mb-5 flex flex-col sm:flex-row gap-3`}>
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchRef}
              onChange={e => setSearchRef(e.target.value)}
              placeholder="Search by booking reference..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all ${inputCls}`}
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'confirmed', 'pending', 'cancelled'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-sky-600 text-white'
                    : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings list */}
        <div className="space-y-3">
          {filtered.map(booking => {
            const sc = statusConfig[booking.status];
            const StatusIcon = sc.icon;
            return (
              <div key={booking.id} className={`${cardBg} rounded-xl border p-5 transition-all hover:shadow-md`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Route */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Plane className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className={`font-bold text-lg ${textPrimary}`}>
                        {booking.origin} <span className={`text-sm font-normal ${textSecondary}`}> → </span> {booking.destination}
                      </div>
                      <div className={`text-xs ${textSecondary}`}>
                        Flight {booking.flight_number} · {classLabels[booking.seat_class]}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className={`flex items-center gap-1.5 text-xs ${textSecondary}`}>
                      <Hash className="w-3.5 h-3.5" />
                      {booking.booking_reference}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs ${textSecondary}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {booking.departure_date}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {sc.label}
                    </div>
                    <div className={`font-bold ${textPrimary}`}>${booking.price.toLocaleString()}</div>
                    <button className={`flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors`}>
                      View details <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className={`${cardBg} rounded-xl border p-12 text-center`}>
              <Plane className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
              <p className={`font-medium ${textPrimary}`}>No bookings found</p>
              <p className={`text-sm mt-1 ${textSecondary}`}>
                {searchRef ? 'Try a different reference number' : 'Your bookings will appear here'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
