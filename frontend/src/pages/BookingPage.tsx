import { useState } from 'react';
import { Plane, CheckCircle, ChevronLeft, AlertCircle, Plus, X, User } from 'lucide-react';
import SeatMap from '../components/SeatMap';
import type { Flight, SearchParams, Booking } from '../types';

interface PassengerForm {
  firstName: string;
  lastName: string;
  email: string;
  passportNumber: string;
}

interface BookingPageProps {
  flight: Flight;
  searchParams: SearchParams;
  onBack: () => void;
  onBookingComplete: (booking: Booking) => void;
  isDark: boolean;
}

export default function BookingPage({ flight, searchParams, onBack, onBookingComplete, isDark }: BookingPageProps) {
  const [step, setStep] = useState<'details' | 'seats' | 'payment' | 'confirmed'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [selectedSeat, setSelectedSeat] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const [passengers, setPassengers] = useState<PassengerForm[]>([
    { firstName: '', lastName: '', email: '', passportNumber: '' },
  ]);

  const addPassenger = () => {
    setPassengers(p => [...p, { firstName: '', lastName: '', email: '', passportNumber: '' }]);
  };

  const removePassenger = (idx: number) => {
    if (passengers.length > 1) {
      setPassengers(p => p.filter((_, i) => i !== idx));
    }
  };

  const updatePassenger = (idx: number, field: keyof PassengerForm, value: string) => {
    setPassengers(p => p.map((pax, i) => i === idx ? { ...pax, [field]: value } : pax));
  };

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-sky-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-sky-500';

  const formatCardNumber = (v: string) => v.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 19);

  const totalPrice = flight.price * searchParams.passengers * passengers.length;

  const handleSubmitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    for (const p of passengers) {
      if (!p.firstName || !p.lastName || !p.email || !p.passportNumber) {
        setError('Please fill in all passenger details.');
        return;
      }
    }
    setError('');
    const newId = `IDN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    setBookingId(newId);
    setStep('seats');
  };

  const validateCard = (): string | null => {
    const digits = cardNumber.replace(/\s/g, '');
    if (!/^\d{16}$/.test(digits)) return 'Card number must be 16 digits.';
    if (!/^\d{3}$/.test(cardCvc)) return 'CVC must be 3 digits.';
    const match = cardExpiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return 'Expiry must be in MM/YY format.';
    const now = new Date();
    const expMonth = parseInt(match[1], 10);
    const expYear = parseInt(match[2], 10) + 2000;
    if (expMonth < 1 || expMonth > 12) return 'Invalid expiry month.';
    if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1))
      return 'Card is expired.';
    return null;
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvc) {
      setError('Please enter your payment details.');
      return;
    }
    const cardErr = validateCard();
    if (cardErr) { setError(cardErr); return; }
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('idan_auth_token');
      const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` };

      const holdRes = await fetch('/api/v1/booking/hold', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ booking_id: bookingId, flight_id: flight.id }),
      });
      if (!holdRes.ok) { const e = await holdRes.json(); throw new Error(e.message || 'Hold failed'); }

      for (const pax of passengers) {
        const paxRes = await fetch('/api/v1/booking/passengers', {
          method: 'POST', headers: authHeaders,
          body: JSON.stringify({ booking_id: bookingId, full_name: pax.firstName + ' ' + pax.lastName, email: pax.email, passport_number: pax.passportNumber }),
        });
        if (!paxRes.ok) { const e = await paxRes.json(); throw new Error(e.message || 'Passenger add failed'); }
      }

      const res = await fetch('/api/v1/booking/confirm', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ booking_id: bookingId, card_number: cardNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment processing failed.');

      const confirmedPnr = data.data?.ticket_id || bookingId;
      if (data.data?.ticket_id) setTicketId(data.data.ticket_id);
      setStep('confirmed');
      onBookingComplete({
        id: confirmedPnr,
        booking_reference: confirmedPnr,
        user_id: null,
        passenger_name: passengers[0].firstName + ' ' + passengers[0].lastName,
        passenger_email: passengers[0].email,
        passport_number: passengers[0].passportNumber,
        origin: flight.origin.code,
        destination: flight.destination.code,
        departure_date: searchParams.departureDate,
        return_date: null,
        flight_number: flight.flightNumber,
        seat_class: searchParams.seatClass,
        price: totalPrice,
        status: 'confirmed',
        created_at: new Date().toISOString(),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${bg} min-h-screen py-8`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {step !== 'confirmed' && (
          <button onClick={onBack} className={`flex items-center gap-2 text-sm mb-6 transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
            <ChevronLeft className="w-4 h-4" /> Back to search results
          </button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className={`${cardBg} rounded-xl border p-5 mb-5`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Selected Flight</h3>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${textPrimary}`}>Idan Airlines · {flight.flightNumber}</div>
                  <div className={`text-sm ${textSecondary}`}>{flight.seatClass} · {flight.aircraft}</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${textPrimary}`}>${totalPrice.toLocaleString()}</div>
                  <div className={`text-xs ${textSecondary}`}>{passengers.length} × ${flight.price.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            {step === 'details' && (
              <form onSubmit={handleSubmitDetails} className={`${cardBg} rounded-xl border p-6`}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Passengers</h3>
                  <button type="button" onClick={addPassenger} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700">
                    <Plus className="w-3.5 h-3.5" /> Add Passenger
                  </button>
                </div>

                {passengers.map((pax, idx) => (
                  <div key={idx} className={`mb-6 pb-6 ${idx < passengers.length - 1 ? `border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}` : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`text-sm font-semibold flex items-center gap-2 ${textPrimary}`}>
                        <User className="w-4 h-4 text-sky-500" />
                        Passenger {idx + 1}
                      </h4>
                      {passengers.length > 1 && (
                        <button type="button" onClick={() => removePassenger(idx)} className="text-red-500 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input type="text" value={pax.firstName} onChange={e => updatePassenger(idx, 'firstName', e.target.value)}
                        placeholder="First Name *" className={`w-full px-4 py-3 rounded-lg border text-sm ${inputCls}`} />
                      <input type="text" value={pax.lastName} onChange={e => updatePassenger(idx, 'lastName', e.target.value)}
                        placeholder="Last Name *" className={`w-full px-4 py-3 rounded-lg border text-sm ${inputCls}`} />
                      <input type="email" value={pax.email} onChange={e => updatePassenger(idx, 'email', e.target.value)}
                        placeholder="Email *" className={`w-full px-4 py-3 rounded-lg border text-sm ${inputCls}`} />
                      <input type="text" value={pax.passportNumber} onChange={e => updatePassenger(idx, 'passportNumber', e.target.value)}
                        placeholder="Passport *" className={`w-full px-4 py-3 rounded-lg border text-sm ${inputCls}`} />
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <button type="submit" className="px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md">
                    Continue to Payment
                  </button>
                </div>
              </form>
            )}

            {step === 'seats' && (
              <div className={`${cardBg} rounded-xl border p-6`}>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Select Your Seats</h3>
                <p className={`text-sm mb-4 ${textSecondary}`}>Choose seats for each passenger on flight {flight.flightNumber}</p>
                <SeatMap
                  flightId={flight.id}
                  onSelectSeat={(seatNum) => {
                    setSelectedSeat(seatNum);
                    setPassengers(prev => prev.map((p, i) => i === 0 ? { ...p, passportNumber: p.passportNumber } : p));
                    const token = localStorage.getItem('idan_auth_token');
                    fetch('/api/v1/flights/seats/hold', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
                      body: JSON.stringify({ flight_id: flight.id, seat_number: seatNum }),
                    });
                  }}
                  selectedSeat={selectedSeat}
                  isDark={isDark}
                />
                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={() => setStep('details')}
                    className={`px-6 py-3 rounded-xl text-sm font-semibold border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-600'}`}>
                    Back
                  </button>
                  <button type="button" onClick={() => setStep('payment')}
                    className="px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md">
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {step === 'payment' && (
              <form onSubmit={handleConfirmBooking} className={`${cardBg} rounded-xl border p-6`}>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Payment Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Card Number</label>
                    <input type="text" value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} maxLength={19}
                      placeholder="1234 5678 9012 3456" className={`w-full px-4 py-3 rounded-lg border text-sm font-mono ${inputCls}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Expiry</label>
                    <input type="text" value={cardExpiry} onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setCardExpiry(v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v);
                    }} placeholder="MM/YY" className={`w-full px-4 py-3 rounded-lg border text-sm ${inputCls}`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>CVC</label>
                    <input type="text" value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))} maxLength={3}
                      placeholder="123" className={`w-full px-4 py-3 rounded-lg border text-sm ${inputCls}`} />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3 justify-end">
                  <button type="button" onClick={() => setStep('details')}
                    className={`px-6 py-3 rounded-xl text-sm font-semibold border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-600'}`}>
                    Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex items-center gap-2 px-8 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-xl font-semibold text-sm transition-all shadow-md">
                    {loading ? 'Processing...' : `Pay $${totalPrice.toLocaleString()}`}
                  </button>
                </div>
              </form>
            )}

            {step === 'confirmed' && (
              <div className={`${cardBg} rounded-xl border p-8 text-center`}>
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>Booking Confirmed!</h2>
                <div className={`inline-block px-6 py-3 rounded-xl font-mono text-lg font-bold mt-4 ${isDark ? 'bg-sky-900 text-sky-300' : 'bg-sky-50 text-sky-700'}`}>
                  {ticketId || bookingId}
                </div>
                <p className={`text-sm mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {passengers.length > 1 ? `${passengers.length} passengers checked in. ` : ''}
                  Use this PNR in Manage Booking to look up your itinerary
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className={`${cardBg} rounded-xl border p-5 sticky top-24`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Price Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className={textSecondary}>{passengers.length} × {flight.seatClass}</span>
                  <span className={textPrimary}>${totalPrice.toLocaleString()}</span>
                </div>
                <div className={`border-t pt-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex justify-between">
                    <span className={`font-bold ${textPrimary}`}>Total</span>
                    <span className={`text-lg font-bold text-sky-600`}>${totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
