import { useState } from 'react';
import { Plane, CreditCard, Lock, CheckCircle, ChevronLeft, User, Mail, Hash, Clock, Wifi, Utensils, Luggage, AlertCircle } from 'lucide-react';
import type { Flight, SearchParams, Booking } from '../types';

interface BookingPageProps {
  flight: Flight;
  searchParams: SearchParams;
  onBack: () => void;
  onBookingComplete: (booking: Booking) => void;
  isDark: boolean;
}

export default function BookingPage({ flight, searchParams, onBack, onBookingComplete, isDark }: BookingPageProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'confirmed'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingId, setBookingId] = useState<string>(''); // Added to track the ID across the /hold and /confirm endpoints
  const [ticketId, setTicketId] = useState<string>('');
  
  // DEV NOTE: Staging Test Cards
  // 4111-1111-1111-1111 (Success)
  // 0000-0000-0000-IDAN (Simulate OOM / container timeout for fail-open testing)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    passportNumber: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    cardName: '',
  });

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-sky-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-sky-500';
  const labelCls = isDark ? 'text-gray-300' : 'text-gray-700';

  const totalPrice = flight.price * searchParams.passengers;
  const taxes = Math.round(totalPrice * 0.12);
  const fees = 25;
  const grandTotal = totalPrice + taxes + fees;

  // Proceed to payment step (no /hold API call needed)
  const handleSubmitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.passportNumber) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    const newBookingId = `IDN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    setBookingId(newBookingId);
    setStep('payment');
  };

  // --- CTF INTEGRATION: Hit the /confirm API and check for FLAGS ---
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cardNumber || !form.cardExpiry || !form.cardCvc) {
      setError('Please enter your payment details.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/booking/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('idan_auth_token') ?? ''}`
        },
        body: JSON.stringify({
          booking_id: bookingId,
          card_number: form.cardNumber // Hacker payload goes here!
        })
      });

      const data = await response.json();

      // 🚩 CTF WIN CONDITIONS 🚩
      if (data.fail_open_flag) {
        alert(`🚩 ACHIEVEMENT UNLOCKED (A10: Fail-Open Logic) 🚩\n\nFlag: ${data.fail_open_flag}`);
      }
      if (data.race_flag) {
        alert(`🚩 ACHIEVEMENT UNLOCKED (A06: Race Condition) 🚩\n\nFlag: ${data.race_flag}`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Payment processing failed.');
      }

      if (data.data?.ticket_id) {
        setTicketId(data.data.ticket_id);
      }

      setStep('confirmed');
      
      // Pass mock data back up so the UI completes nicely
      onBookingComplete({
        id: bookingId,
        booking_reference: bookingId,
        passenger_name: form.fullName,
        status: 'confirmed',
        price: grandTotal,
      } as any);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const classLabels: Record<string, string> = { economy: 'Economy Class', business: 'Business Class', first: 'First Class' };

  return (
    <div className={`${bg} min-h-screen py-8`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {step !== 'confirmed' && (
          <button onClick={onBack} className={`flex items-center gap-2 text-sm mb-6 transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
            <ChevronLeft className="w-4 h-4" /> Back to search results
          </button>
        )}

        {step !== 'confirmed' && (
          <div className="flex items-center gap-3 mb-8">
            {[
              { key: 'details', label: 'Passenger Details', num: 1 },
              { key: 'payment', label: 'Payment', num: 2 },
            ].map((s, i) => (
              <div key={s.key} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 ${step === s.key ? 'opacity-100' : (i === 0 && step === 'payment') ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    (i === 0 && step === 'payment') ? 'bg-emerald-500 text-white' :
                    step === s.key ? 'bg-sky-600 text-white' :
                    (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')
                  }`}>
                    {i === 0 && step === 'payment' ? <CheckCircle className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{s.label}</span>
                </div>
                {i === 0 && <div className={`w-12 h-px ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            
            {/* Flight summary card */}
            <div className={`${cardBg} rounded-xl border p-5 mb-5`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Selected Flight</h3>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${textPrimary}`}>Idan Airlines · {flight.flightNumber}</div>
                  <div className={`text-sm ${textSecondary}`}>{classLabels[flight.seatClass]} · {flight.aircraft}</div>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-center">
                  <div>
                    <div className={`text-lg font-bold ${textPrimary}`}>{flight.departureTime}</div>
                    <div className={`text-xs font-semibold ${textSecondary}`}>{flight.origin.code}</div>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={`text-xs ${textSecondary}`}>{flight.duration}</div>
                    <div className="w-16 h-px border-t border-dashed border-current opacity-30" />
                    <div className={`text-xs ${textSecondary}`}>Direct</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${textPrimary}`}>{flight.arrivalTime}</div>
                    <div className={`text-xs font-semibold ${textSecondary}`}>{flight.destination.code}</div>
                  </div>
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
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Passenger Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelCls}`}>Full Name *</label>
                    <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border text-sm ${inputCls}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelCls}`}>Email Address *</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border text-sm ${inputCls}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelCls}`}>Passport Number *</label>
                    <input type="text" value={form.passportNumber} onChange={e => setForm(f => ({ ...f, passportNumber: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border text-sm ${inputCls}`} />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button type="submit" disabled={loading} className="px-8 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-xl font-semibold text-sm transition-all shadow-md">
                    {loading ? 'Processing...' : 'Continue to Payment'}
                  </button>
                </div>
              </form>
            )}

            {step === 'payment' && (
              <form onSubmit={handleConfirmBooking} className={`${cardBg} rounded-xl border p-6`}>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Payment Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelCls}`}>Cardholder Name</label>
                    <input type="text" value={form.cardName} onChange={e => setForm(f => ({ ...f, cardName: e.target.value }))} className={`w-full px-4 py-3 rounded-lg border text-sm ${inputCls}`} />
                  </div>
                  <div>
                    {/* TODO: Tell the Python team to stop returning raw SQLite 500 errors when users type quotes in the promo box. */}
                    <label className={`block text-sm font-medium mb-1.5 ${labelCls}`}>Card Number</label>
                    <input type="text" value={form.cardNumber} onChange={e => setForm(f => ({ ...f, cardNumber: e.target.value }))} placeholder="1234 5678 9012 3456" className={`w-full px-4 py-3 rounded-lg border text-sm font-mono ${inputCls}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${labelCls}`}>Expiry Date</label>
                      <input type="text" value={form.cardExpiry} onChange={e => setForm(f => ({ ...f, cardExpiry: e.target.value }))} placeholder="MM/YY" className={`w-full px-4 py-3 rounded-lg border text-sm ${inputCls}`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${labelCls}`}>CVC</label>
                      <input type="text" value={form.cardCvc} onChange={e => setForm(f => ({ ...f, cardCvc: e.target.value }))} placeholder="123" className={`w-full px-4 py-3 rounded-lg border text-sm ${inputCls}`} />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3 justify-end">
                  <button type="button" onClick={() => setStep('details')} className={`px-6 py-3 rounded-xl text-sm font-semibold border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-600'}`}>Back</button>
                  <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-xl font-semibold text-sm transition-all shadow-md">
                    {loading ? 'Processing...' : `Confirm Booking · $${grandTotal.toLocaleString()}`}
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
                  Use this PNR in <strong>Manage Booking</strong> to look up your itinerary
                </p>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-1">
             <div className={`${cardBg} rounded-xl border p-5 sticky top-24`}>
                <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Price Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className={textSecondary}>{searchParams.passengers} &times; {classLabels[flight.seatClass]}</span>
                    <span className={textPrimary}>${totalPrice.toLocaleString()}</span>
                  </div>
                  <div className={`border-t pt-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex justify-between">
                      <span className={`font-bold ${textPrimary}`}>Total</span>
                      <span className={`text-lg font-bold text-sky-600`}>${grandTotal.toLocaleString()}</span>
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