import { ArrowRight, Star, Shield, Clock, Globe } from 'lucide-react';
import FlightSearchForm from '../components/FlightSearchForm';
import type { SearchParams } from '../types';

interface LandingPageProps {
  onSearch: (params: SearchParams) => void;
  isDark: boolean;
}

const DESTINATIONS = [
{ city: 'Lagos', code: 'LOS', country: 'Nigeria', image: '/lagos.png', price: 180 },
  { city: 'London', code: 'LHR', country: 'United Kingdom', image: 'https://images.pexels.com/photos/672532/pexels-photo-672532.jpeg?auto=compress&cs=tinysrgb&w=600', price: 690 },
  { city: 'Dubai', code: 'DXB', country: 'UAE', image: 'https://images.pexels.com/photos/823696/pexels-photo-823696.jpeg?auto=compress&cs=tinysrgb&w=600', price: 440 },
  { city: 'New York', code: 'JFK', country: 'United States', image: 'https://images.pexels.com/photos/290386/pexels-photo-290386.jpeg?auto=compress&cs=tinysrgb&w=600', price: 750 },
  { city: 'Accra', code: 'ACC', country: 'Ghana', image: 'https://images.pexels.com/photos/3881104/pexels-photo-3881104.jpeg?auto=compress&cs=tinysrgb&w=600', price: 220 },
  { city: 'Singapore', code: 'SIN', country: 'Singapore', image: 'https://images.pexels.com/photos/1842332/pexels-photo-1842332.jpeg?auto=compress&cs=tinysrgb&w=600', price: 870 },
];

const FEATURES = [
  { icon: Globe, title: 'Global Network', desc: 'Connecting 9 major hubs across 4 continents' },
  { icon: Shield, title: 'Safe & Secure', desc: 'Industry-leading safety standards and protocols' },
  { icon: Clock, title: 'On-Time Promise', desc: '93% on-time departure rate globally' },
  { icon: Star, title: 'Award-Winning Service', desc: '5-star rated cabin crew and lounge experience' },
];

export default function LandingPage({ onSearch, isDark }: LandingPageProps) {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`${bg} min-h-screen`}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/62623/wing-plane-flying-airplane-62623.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt="Idan Airlines"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/40" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-white/80 text-xs font-medium tracking-wide mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Now serving 9 international destinations
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
              The World Awaits You
            </h1>
            <p className="text-lg text-white/70 max-w-xl mx-auto">
              Premium air travel connecting Africa to the world. Experience luxury, comfort, and reliability at every altitude.
            </p>
          </div>

          {/* Search form */}
          <div className="max-w-5xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6">
            <FlightSearchForm
              initialParams={{ departureDate: today, returnDate: nextWeek }}
              onSearch={onSearch}
              isDark={false}
            />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-sky-600'} py-5 border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { value: '9', label: 'Destinations' },
              { value: '2.4M+', label: 'Passengers Annually' },
              { value: '93%', label: 'On-Time Rate' },
              { value: '24/7', label: 'Customer Support' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-white/70 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured destinations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className={`text-2xl font-bold ${textPrimary}`}>Popular Destinations</h2>
            <p className={`text-sm mt-1 ${textSecondary}`}>Explore our most-traveled routes this season</p>
          </div>
          <button className="flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors">
            View all routes <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {DESTINATIONS.map(dest => (
            <button
              key={dest.code}
              onClick={() => onSearch({ origin: 'LOS', destination: dest.code, departureDate: nextWeek, passengers: 1, seatClass: 'economy' })}
              className={`group relative overflow-hidden rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-0.5 ${cardBg}`}
            >
              <div className="h-44 overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.city}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="text-left">
                  <div className={`font-semibold text-base ${textPrimary}`}>{dest.city}</div>
                  <div className={`text-xs ${textSecondary}`}>{dest.country}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 mb-0.5">from</div>
                  <div className="text-sky-600 font-bold">${dest.price}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className={`${isDark ? 'bg-gray-900' : 'bg-sky-50'} py-16`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className={`text-2xl font-bold ${textPrimary}`}>Why Fly Idan Airlines</h2>
            <p className={`text-sm mt-2 ${textSecondary}`}>Delivering premium air travel since 1994</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className={`${cardBg} rounded-xl p-6 border text-center`}>
                <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-6 h-6 text-sky-600" />
                </div>
                <h3 className={`font-semibold mb-1.5 ${textPrimary}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${textSecondary}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-t`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {[
              { title: 'Company', links: ['About Idan Airlines', 'Careers', 'Press Room', 'Sustainability'] },
              { title: 'Travel', links: ['Flight Status', 'Baggage Policy', 'Special Assistance', 'Visa Information'] },
              { title: 'Support', links: ['Help Center', 'Contact Us', 'Feedback', 'Lost & Found'] },
              { title: 'Legal', links: ['Terms & Conditions', 'Privacy Policy', 'Cookie Policy', 'Accessibility'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className={`text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className={`pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-3 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              &copy; 2026 Idan Airlines Ltd. All rights reserved. Registered in Nigeria.
            </p>
            <div className="flex items-center gap-4">
              {['IATA', 'ICAO', 'Star Alliance'].map(badge => (
                <span key={badge} className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                  isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'
                }`}>
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
