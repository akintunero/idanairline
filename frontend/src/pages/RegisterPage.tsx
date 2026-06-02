import { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface RegisterPageProps {
  isDark: boolean;
  onNavigate: (page: 'login') => void;
}

export default function RegisterPage({ isDark, onNavigate }: RegisterPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-sky-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-sky-500';
  const labelCls = isDark ? 'text-gray-300' : 'text-gray-700';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${bg} min-h-screen flex items-center justify-center py-12 px-4`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className={`text-2xl font-bold mb-1 ${textPrimary}`}>Create an account</h1>
          <p className={`text-sm ${textSecondary}`}>Join Idan Airlines today</p>
        </div>

        <div className={`${cardBg} rounded-2xl border p-8`}>
          {success ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className={`text-lg font-semibold mb-2 ${textPrimary}`}>Account created!</h2>
              <p className={`text-sm mb-6 ${textSecondary}`}>You can now sign in with your credentials.</p>
              <button
                onClick={() => onNavigate('login')}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelCls}`}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors ${inputCls}`}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelCls}`}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors ${inputCls}`}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-xl font-semibold text-sm transition-all shadow-md mt-2"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <p className={`text-center text-sm mt-6 ${textSecondary}`}>
                Already have an account?{' '}
                <button
                  onClick={() => onNavigate('login')}
                  className="text-sky-600 hover:text-sky-700 font-medium"
                >
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
