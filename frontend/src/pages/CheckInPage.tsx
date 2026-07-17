import { useState } from 'react';
import { QrCode, Plane, CheckCircle, Search, Hash, User } from 'lucide-react';

interface CheckInPageProps {
  isDark: boolean;
}

export default function CheckInPage({ isDark }: CheckInPageProps) {
  const [step, setStep] = useState<'search' | 'found' | 'complete'>('search');
  const [ref, setRef] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passengerId, setPassengerId] = useState(0);
  const [bookingId, setBookingId] = useState('');
  const [boardPassRef, setBoardPassRef] = useState('');
  const [seatPref, setSeatPref] = useState('window');

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls = isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  const handleSearch = async () => {
    if (!ref || !lastName) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('idan_auth_token');
      const res = await fetch('/api/v1/booking/lookup?booking_id=' + encodeURIComponent(ref), {
        headers: { 'Authorization': `Bearer ${token ?? ''}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Booking not found');
      setBookingId(ref);
      setPassengerId(1);
      setLoading(false);
      setStep('found');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking not found');
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('idan_auth_token');
      const res = await fetch('/api/v1/booking/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
        body: JSON.stringify({
          booking_id: bookingId,
          passenger_id: passengerId,
          seat_number: seatPref === 'window' ? 'A1' : seatPref === 'aisle' ? 'C1' : 'B1',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Check-in failed');
      setBoardPassRef(data.data?.boarding_pass?.boarding_pass_ref || 'BP-' + bookingId);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${bg} min-h-screen py-12`}>
      <div className="max-w-xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${textPrimary}`}>Online Check-In</h1>
          <p className={`text-sm ${textSecondary}`}>Check in 24–48 hours before your departure</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {step === 'search' && (
          <div className={`${cardBg} rounded-2xl border p-6`}>
            <h2 className={`text-sm font-bold uppercase tracking-widest mb-5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
              Find Your Booking
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Hash className="w-3.5 h-3.5 inline mr-1.5" />
                  Booking Reference
                </label>
                <input type="text" value={ref} onChange={e => setRef(e.target.value.toUpperCase())}
                  placeholder="e.g. IDN-48291-LHR"
                  className={`w-full px-4 py-3 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all ${inputCls}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <User className="w-3.5 h-3.5 inline mr-1.5" />
                  Last Name
                </label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="As on your passport"
                  className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all ${inputCls}`} />
              </div>
              <button onClick={handleSearch} disabled={!ref || !lastName || loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400/60 text-white rounded-xl font-semibold text-sm transition-all">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Searching...</> : <><Search className="w-4 h-4" /> Find Booking</>}
              </button>
            </div>
          </div>
        )}

        {step === 'found' && (
          <div className="space-y-4">
            <div className={`${cardBg} rounded-2xl border p-6`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className={`font-bold ${textPrimary}`}>Idan Airlines · Booking {ref}</p>
                  <p className={`text-xs ${textSecondary}`}>Passenger: {lastName.toUpperCase()}</p>
                </div>
              </div>
              <div className={`pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <p className={`text-xs font-semibold mb-2 ${textSecondary}`}>Select Seat Preference</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'window', label: 'Window' },
                    { value: 'middle', label: 'Middle' },
                    { value: 'aisle', label: 'Aisle' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setSeatPref(opt.value)}
                      className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                        seatPref === opt.value
                          ? 'border-sky-500 bg-sky-600 text-white'
                          : (isDark ? 'border-gray-700 text-gray-300 hover:border-gray-600' : 'border-gray-200 text-gray-700 hover:border-sky-300')
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button onClick={handleCheckIn} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-sm">
                  {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</> : 'Complete Check-In'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className={`${cardBg} rounded-2xl border p-8 text-center`}>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className={`text-xl font-bold mb-2 ${textPrimary}`}>Check-In Complete!</h2>
            <p className={`text-sm ${textSecondary} mb-6`}>Your boarding pass is ready. Proceed to Gate B12.</p>
            <div className="bg-gradient-to-r from-sky-600 to-sky-800 rounded-2xl p-5 text-white text-left">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs opacity-70 mb-0.5">Boarding Pass</div>
                  <div className="text-xs opacity-70">Idan Airlines · {boardPassRef}</div>
                </div>
                <QrCode className="w-10 h-10 opacity-80" />
              </div>
              <div className="flex justify-between items-center mb-4">
                <div><div className="text-3xl font-bold">LOS</div><div className="text-xs opacity-70">Lagos</div></div>
                <Plane className="w-5 h-5 opacity-60" />
                <div className="text-right"><div className="text-3xl font-bold">LHR</div><div className="text-xs opacity-70">London</div></div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center border-t border-white/20 pt-4">
                <div><div className="text-xs opacity-70">Seat</div><div className="font-bold">{seatPref === 'window' ? '14A' : seatPref === 'aisle' ? '14C' : '14B'}</div></div>
                <div><div className="text-xs opacity-70">Gate</div><div className="font-bold">B12</div></div>
                <div><div className="text-xs opacity-70">Boarding</div><div className="font-bold">07:20</div></div>
              </div>
            </div>
            <button onClick={() => { setStep('search'); setRef(''); setLastName(''); setError(''); }}
              className="mt-5 text-sm font-medium text-sky-600 hover:text-sky-700">
              Check in another passenger
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
