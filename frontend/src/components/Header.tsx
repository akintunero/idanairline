import { useState } from 'react';
import { Menu, X, ChevronDown, User, Settings, BookOpen, LogOut } from 'lucide-react';
import type { Page } from '../types';

interface AuthUser {
  user_id: string;
  email: string;
}

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isDark: boolean;
  currentUser: AuthUser | null;
  onLogout: () => void;
}

export default function Header({ currentPage, onNavigate, isDark, currentUser, onLogout }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems: Array<{ label: string; page: Page }> = [
    { label: 'Flights', page: 'search' },
    { label: 'Manage Booking', page: 'bookings' },
    { label: 'Check-in', page: 'checkin' },
  ];

  const base = isDark
    ? 'bg-gray-900 border-gray-800 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  const linkBase = isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900';
  const activeLink = isDark ? 'text-sky-400 font-semibold' : 'text-sky-600 font-semibold';

  return (
    <header className={`${base} border-b sticky top-0 z-50 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 group"
          >
            <img src="/idan.png" alt="Idan Airlines" className="w-9 h-9 rounded-lg shadow-md object-contain" />
            <div className="flex flex-col leading-none">
              <span className={`font-bold text-base tracking-wide ${isDark ? 'text-white' : 'text-gray-900'}`}>
                IDAN
              </span>
              <span className={`text-[10px] tracking-[0.15em] uppercase font-medium ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                Airlines
              </span>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`px-4 py-2 rounded-md text-sm transition-colors ${
                  currentPage === item.page ? activeLink : linkBase
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isDark ? 'bg-gray-700 text-gray-300' : 'bg-sky-100 text-sky-700'
                  }`}>
                    {currentUser.email[0].toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{currentUser.email}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div className={`absolute right-0 top-full mt-1.5 w-48 rounded-xl shadow-xl border py-1.5 ${
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    {[
                      { label: 'My Profile', icon: User, page: 'profile' as Page },
                      { label: 'My Bookings', icon: BookOpen, page: 'bookings' as Page },
                      { label: 'Settings', icon: Settings, page: 'settings' as Page },
                    ].map(item => (
                      <button
                        key={item.page}
                        onClick={() => { onNavigate(item.page); setProfileOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                          isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <item.icon className="w-4 h-4 opacity-60" />
                        {item.label}
                      </button>
                    ))}
                    <div className={`my-1 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />
                    <button
                      onClick={() => { onLogout(); setProfileOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-red-500 hover:text-red-600 ${
                        isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <LogOut className="w-4 h-4 opacity-60" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className={`md:hidden p-2 rounded-lg ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className={`md:hidden border-t ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <div className="px-4 py-3 space-y-1">
            {[...navItems, { label: 'Profile', page: 'profile' as Page }, { label: 'Settings', page: 'settings' as Page }].map(item => (
              <button
                key={item.page}
                onClick={() => { onNavigate(item.page); setMobileOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  currentPage === item.page
                    ? (isDark ? 'bg-sky-900 text-sky-400' : 'bg-sky-50 text-sky-700')
                    : (isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-50')
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className={`my-1 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`} />
            {currentUser ? (
              <button
                onClick={() => { onLogout(); setMobileOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm text-red-500 transition-colors ${
                  isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                }`}
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => { onNavigate('login'); setMobileOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  isDark ? 'text-sky-400 hover:bg-gray-800' : 'text-sky-600 hover:bg-gray-50'
                }`}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
