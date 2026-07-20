import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface LoginPageProps {
  isDark: boolean;
  onLogin: (token: string) => void;
  onNavigate: (page: 'register') => void;
}

export default function LoginPage({ isDark, onLogin, onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    // Check URL for redirect_uri parameter (open redirect vulnerability)
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect_uri');
    if (redirect) {
      setRedirectUri(redirect);
    }
    fetchCsrfToken();
  }, []);

  const fetchCsrfToken = async () => {
    try {
      const token = localStorage.getItem('idan_auth_token');
      if (!token) return;
      const res = await fetch('/api/v1/auth/csrf-token', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      let data: any;
      try { data = await res.json(); } catch { return; }
      if (data.success) {
        setCsrfToken(data.csrf_token);
      }
    } catch {}
  };

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-sky-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-sky-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body: Record<string, string> = { email, password };
      if (redirectUri) {
        body.redirect_uri = redirectUri;
      }

      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Handle open redirect
      if (res.status === 302) {
        const location = res.headers.get('Location');
        if (location) {
          window.location.href = location;
          return;
        }
      }

      let data: any;
      try { data = await res.json(); } catch { throw new Error('Server error — try again or check backend is running.'); }
      if (!res.ok || !data.token) {
        throw new Error(data.message || 'Invalid credentials.');
      }
      localStorage.setItem('idan_auth_token', data.token);
      onLogin(data.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${bg} min-h-screen flex items-center justify-center py-12 px-4`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className={`text-2xl font-bold mb-1 ${textPrimary}`}>Welcome back</h1>
          <p className={`text-sm ${textSecondary}`}>Sign in to your Idan Airlines account</p>
          {redirectUri && (
            <p className={`text-xs mt-2 text-amber-600`}>
              Redirecting to: {redirectUri}
            </p>
          )}
        </div>

        <div className={`${cardBg} rounded-2xl border p-8`}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            {/* CSRF token sent as header (not validated server-side — CSRF vuln) */}
            {csrfToken && (
              <input type="hidden" name="csrf_token" value={csrfToken} />
            )}

            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email address</label>
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
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors ${inputCls}`}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-xl font-semibold text-sm transition-all shadow-md mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className={`text-center text-sm mt-6 ${textSecondary}`}>
            Don't have an account?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-sky-600 hover:text-sky-700 font-medium"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
