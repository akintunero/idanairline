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
  const [seatPref, setSeatPref] = useState('window');

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls = isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  const handleSearch = async () => {
    if (!ref || !lastName) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setStep('found');
  };

  const handleCheckIn = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setStep('complete');
  };

  return (
    <div className={`${bg} min-h-screen py-12`}>
      <div className="max-w-xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${textPrimary}`}>Online Check-In</h1>
          <p className={`text-sm ${textSecondary}`}>Check in 24–48 hours before your departure</p>
        </div>

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
                <input
                  type="text"
                  value={ref}
                  onChange={e => setRef(e.target.value.toUpperCase())}
                  placeholder="e.g. IDN-48291-LHR"
                  className={`w-full px-4 py-3 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all ${inputCls}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <User className="w-3.5 h-3.5 inline mr-1.5" />
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="As on your passport"
                  className={`w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all ${inputCls}`}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!ref || !lastName || loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400/60 text-white rounded-xl font-semibold text-sm transition-all"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Searching...</>
                ) : (
                  <><Search className="w-4 h-4" /> Find Booking</>
                )}
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
                  <p className={`font-bold ${textPrimary}`}>Idan Airlines · ID-LH-100</p>
                  <p className={`text-xs ${textSecondary}`}>Booking: {ref}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${textPrimary}`}>LOS</div>
                  <div className={`text-xs ${textSecondary}`}>Lagos</div>
                  <div className={`text-lg font-semibold mt-1 ${textPrimary}`}>08:00</div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className={`text-xs ${textSecondary}`}>6h 45m</div>
                  <div className="w-20 flex items-center gap-1">
                    <div className={`flex-1 h-px ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
                    <Plane className={`w-3 h-3 ${isDark ? 'text-sky-400' : 'text-sky-500'}`} />
                    <div className={`flex-1 h-px ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
                  </div>
                  <div className={`text-xs ${textSecondary}`}>Direct</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${textPrimary}`}>LHR</div>
                  <div className={`text-xs ${textSecondary}`}>London</div>
                  <div className={`text-lg font-semibold mt-1 ${textPrimary}`}>14:45</div>
                </div>
              </div>
              <div className={`pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <p className={`text-xs font-semibold mb-2 ${textSecondary}`}>Passenger</p>
                <p className={`text-sm font-medium ${textPrimary}`}>{lastName.toUpperCase()}, PASSENGER</p>
              </div>
            </div>

            <div className={`${cardBg} rounded-2xl border p-6`}>
              <h3 className={`text-sm font-bold mb-4 ${textPrimary}`}>Select Seat Preference</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'window', label: 'Window', icon: '🪟' },
                  { value: 'middle', label: 'Middle', icon: '💺' },
                  { value: 'aisle', label: 'Aisle', icon: '🚶' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSeatPref(opt.value)}
                    className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                      seatPref === opt.value
                        ? 'border-sky-500 bg-sky-600 text-white'
                        : (isDark ? 'border-gray-700 text-gray-300 hover:border-gray-600' : 'border-gray-200 text-gray-700 hover:border-sky-300')
                    }`}
                  >
                    <div className="text-lg mb-1">{opt.icon}</div>
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCheckIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 mt-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-sm"
              >
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</> : 'Complete Check-In'}
              </button>
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

            {/* Mock boarding pass */}
            <div className="bg-gradient-to-r from-sky-600 to-sky-800 rounded-2xl p-5 text-white text-left">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs opacity-70 mb-0.5">Boarding Pass</div>
                  <div className="text-xs opacity-70">Idan Airlines · Economy</div>
                </div>
                <QrCode className="w-10 h-10 opacity-80" />
              </div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-3xl font-bold">LOS</div>
                  <div className="text-xs opacity-70">Lagos</div>
                </div>
                <Plane className="w-5 h-5 opacity-60" />
                <div className="text-right">
                  <div className="text-3xl font-bold">LHR</div>
                  <div className="text-xs opacity-70">London</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center border-t border-white/20 pt-4">
                <div>
                  <div className="text-xs opacity-70">Seat</div>
                  <div className="font-bold">14A</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Gate</div>
                  <div className="font-bold">B12</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Boarding</div>
                  <div className="font-bold">07:20</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => { setStep('search'); setRef(''); setLastName(''); }}
              className={`mt-5 text-sm font-medium text-sky-600 hover:text-sky-700`}
            >
              Check in another passenger
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
