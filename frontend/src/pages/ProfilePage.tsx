import { useState } from 'react';
import { User, Plane, Star, MapPin, Calendar, CreditCard as Edit2, Save, X } from 'lucide-react';
import type { Booking, SeatClass } from '../types';
import { airports } from '../data/airports';

interface ProfilePageProps {
  bookings: Booking[];
  isDark: boolean;
}

const SAMPLE_TRAVEL_HISTORY = [
  { route: 'LOS → LHR', date: '2025-12-05', miles: 5234, class: 'Business' },
  { route: 'LHR → CDG', date: '2025-11-20', miles: 217, class: 'Economy' },
  { route: 'DXB → SIN', date: '2025-09-14', miles: 3642, class: 'Business' },
  { route: 'SIN → LOS', date: '2025-08-02', miles: 6521, class: 'Economy' },
];

export default function ProfilePage({ bookings, isDark }: ProfilePageProps) {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    fullName: 'Adebayo Okafor',
    email: 'adebayo.okafor@example.com',
    phone: '+234 801 234 5678',
    passportNumber: 'A12345678',
    homeAirport: 'LOS',
    seatClass: 'business' as SeatClass,
    mealPreference: 'Standard',
    frequentFlyerNumber: 'IDN-FF-8291047',
  });
  const [editForm, setEditForm] = useState(profile);

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls = isDark
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-gray-50 border-gray-200 text-gray-900';

  const totalMiles = SAMPLE_TRAVEL_HISTORY.reduce((a, b) => a + b.miles, 0);
  const tier = totalMiles > 20000 ? 'Platinum' : totalMiles > 10000 ? 'Gold' : 'Silver';
  const tierColor = { Platinum: 'text-slate-400', Gold: 'text-amber-500', Silver: 'text-gray-400' }[tier];

  const classLabels: Record<SeatClass, string> = { economy: 'Economy', business: 'Business', first: 'First Class' };

  return (
    <div className={`${bg} min-h-screen py-8`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile header */}
        <div className={`${cardBg} rounded-2xl border p-6 mb-6`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-sky-600 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                {profile.fullName.charAt(0)}
              </div>
              <div>
                <h1 className={`text-2xl font-bold mb-1 ${textPrimary}`}>{profile.fullName}</h1>
                <p className={`text-sm ${textSecondary}`}>{profile.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${tierColor}`}>
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {tier} Member
                  </div>
                  <span className={`text-xs ${textSecondary}`}>·</span>
                  <span className={`text-xs font-mono ${textSecondary}`}>{profile.frequentFlyerNumber}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setEditing(!editing); setEditForm(profile); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {editing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {/* Miles / tier bar */}
          <div className={`mt-5 pt-5 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className={`text-xs font-semibold ${textSecondary}`}>Miles Balance</span>
              <span className={`text-sm font-bold ${textPrimary}`}>{totalMiles.toLocaleString()} miles</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${Math.min(100, (totalMiles / 25000) * 100)}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${textSecondary}`}>Silver</span>
              <span className={`text-xs ${textSecondary}`}>Gold 10,000</span>
              <span className={`text-xs ${textSecondary}`}>Platinum 25,000</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile details */}
          <div className="lg:col-span-2 space-y-5">
            <div className={`${cardBg} rounded-xl border p-5`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                Personal Information
              </h3>
              {editing ? (
                <div className="space-y-4">
                  {[
                    { label: 'Full Name', field: 'fullName' as const },
                    { label: 'Email', field: 'email' as const },
                    { label: 'Phone', field: 'phone' as const },
                    { label: 'Passport Number', field: 'passportNumber' as const },
                  ].map(f => (
                    <div key={f.field}>
                      <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>{f.label}</label>
                      <input
                        value={editForm[f.field]}
                        onChange={e => setEditForm(x => ({ ...x, [f.field]: e.target.value }))}
                        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${inputCls}`}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => { setProfile(editForm); setEditing(false); }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name', value: profile.fullName, icon: User },
                    { label: 'Email', value: profile.email, icon: User },
                    { label: 'Phone', value: profile.phone, icon: User },
                    { label: 'Passport', value: profile.passportNumber, icon: User },
                  ].map(f => (
                    <div key={f.label}>
                      <dt className={`text-xs font-medium mb-0.5 ${textSecondary}`}>{f.label}</dt>
                      <dd className={`text-sm font-medium ${textPrimary}`}>{f.value}</dd>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preferences */}
            <div className={`${cardBg} rounded-xl border p-5`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                Travel Preferences
              </h3>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Home Airport</label>
                    <select
                      value={editForm.homeAirport}
                      onChange={e => setEditForm(x => ({ ...x, homeAirport: e.target.value }))}
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${inputCls}`}
                    >
                      {airports.map(a => (
                        <option key={a.code} value={a.code}>{a.city} ({a.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Preferred Class</label>
                    <select
                      value={editForm.seatClass}
                      onChange={e => setEditForm(x => ({ ...x, seatClass: e.target.value as SeatClass }))}
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${inputCls}`}
                    >
                      <option value="economy">Economy</option>
                      <option value="business">Business</option>
                      <option value="first">First Class</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className={`text-xs font-medium mb-0.5 ${textSecondary}`}>Home Airport</dt>
                    <dd className={`text-sm font-medium flex items-center gap-1.5 ${textPrimary}`}>
                      <MapPin className="w-3.5 h-3.5 text-sky-500" />
                      {airports.find(a => a.code === profile.homeAirport)?.city || profile.homeAirport}
                    </dd>
                  </div>
                  <div>
                    <dt className={`text-xs font-medium mb-0.5 ${textSecondary}`}>Preferred Class</dt>
                    <dd className={`text-sm font-medium flex items-center gap-1.5 ${textPrimary}`}>
                      <Plane className="w-3.5 h-3.5 text-sky-500" />
                      {classLabels[profile.seatClass]}
                    </dd>
                  </div>
                  <div>
                    <dt className={`text-xs font-medium mb-0.5 ${textSecondary}`}>Meal Preference</dt>
                    <dd className={`text-sm font-medium ${textPrimary}`}>{profile.mealPreference}</dd>
                  </div>
                </div>
              )}
            </div>

            {/* Travel history */}
            <div className={`${cardBg} rounded-xl border p-5`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                Travel History
              </h3>
              <div className="space-y-3">
                {SAMPLE_TRAVEL_HISTORY.map((t, i) => (
                  <div key={i} className={`flex items-center justify-between py-3 border-b last:border-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-sky-50'}`}>
                        <Plane className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
                      </div>
                      <div>
                        <div className={`text-sm font-semibold ${textPrimary}`}>{t.route}</div>
                        <div className={`text-xs ${textSecondary}`}>{t.class}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-semibold text-sky-600`}>+{t.miles.toLocaleString()} mi</div>
                      <div className={`text-xs ${textSecondary} flex items-center gap-1`}>
                        <Calendar className="w-3 h-3" />
                        {t.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Tier card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Idan Airlines</div>
                  <div className={`text-lg font-bold ${tierColor}`}>{tier} Member</div>
                </div>
                <Star className={`w-6 h-6 ${tierColor} fill-current`} />
              </div>
              <div className="font-mono text-sm tracking-wider text-slate-300 mb-4">
                {profile.frequentFlyerNumber}
              </div>
              <div className="text-xs text-slate-400">{profile.fullName}</div>
            </div>

            {/* Quick stats */}
            <div className={`${cardBg} rounded-xl border p-5`}>
              <h4 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                Stats
              </h4>
              <div className="space-y-3">
                {[
                  { label: 'Total Flights', value: SAMPLE_TRAVEL_HISTORY.length + bookings.length },
                  { label: 'Miles Earned', value: `${totalMiles.toLocaleString()} mi` },
                  { label: 'Countries Visited', value: 5 },
                  { label: 'Upcoming Trips', value: bookings.filter(b => b.status === 'confirmed').length },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center">
                    <span className={`text-sm ${textSecondary}`}>{s.label}</span>
                    <span className={`text-sm font-bold ${textPrimary}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
