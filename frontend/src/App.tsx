import { useState, useEffect } from 'react';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import SearchPage from './pages/SearchPage';
import BookingPage from './pages/BookingPage';
import BookingsPage from './pages/BookingsPage';
import DevToolsPage from './pages/DevToolsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import CheckInPage from './pages/CheckInPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import type { Page, SearchParams, Flight, Booking } from './types';

interface AuthUser {
  user_id: string;
  email: string;
}

function parseToken(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as AuthUser;
  } catch {
    return null;
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isDark, setIsDark] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [bookingSearchParams, setBookingSearchParams] = useState<SearchParams | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('idan_auth_token');
    if (token) {
      const user = parseToken(token);
      if (user) setCurrentUser(user);
    }
  }, []);

  const handleLogin = (token: string) => {
    const user = parseToken(token);
    if (user) {
      setCurrentUser(user);
      setCurrentPage('home');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('idan_auth_token');
    setCurrentUser(null);
    setCurrentPage('home');
  };

  const handleSearch = (params: SearchParams) => {
    setSearchParams(params);
    setCurrentPage('search');
  };

  const handleSelectFlight = (flight: Flight, params: SearchParams) => {
    setSelectedFlight(flight);
    setBookingSearchParams(params);
    setCurrentPage('booking');
  };

  const handleBookingComplete = (booking: Booking) => {
    setMyBookings(prev => [booking, ...prev]);
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <Header
          currentPage={currentPage}
          onNavigate={handleNavigate}
          isDark={isDark}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {currentPage === 'home' && (
          <LandingPage onSearch={handleSearch} isDark={isDark} />
        )}

        {currentPage === 'search' && (
          <SearchPage
            searchParams={searchParams}
            onSearch={handleSearch}
            onSelectFlight={handleSelectFlight}
            isDark={isDark}
          />
        )}

        {currentPage === 'booking' && selectedFlight && bookingSearchParams && (
          <BookingPage
            flight={selectedFlight}
            searchParams={bookingSearchParams}
            onBack={() => setCurrentPage('search')}
            onBookingComplete={handleBookingComplete}
            isDark={isDark}
          />
        )}

        {currentPage === 'bookings' && (
          <BookingsPage bookings={myBookings} isDark={isDark} />
        )}

        {currentPage === 'devtools' && (
          <DevToolsPage isDark={isDark} />
        )}

        {currentPage === 'profile' && (
          <ProfilePage bookings={myBookings} isDark={isDark} />
        )}

        {currentPage === 'settings' && (
          <SettingsPage isDark={isDark} onToggleDark={() => setIsDark(d => !d)} />
        )}

        {currentPage === 'checkin' && (
          <CheckInPage isDark={isDark} />
        )}

        {currentPage === 'login' && (
          <LoginPage
            isDark={isDark}
            onLogin={handleLogin}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'register' && (
          <RegisterPage
            isDark={isDark}
            onNavigate={handleNavigate}
          />
        )}
      </div>
    </div>
  );
}
