import { useState, useCallback } from 'react';
import {
  Send, Plus, Trash2, Clock, FileText, BookOpen, Ticket, ChevronDown, ChevronRight,
  Copy, CheckCheck, AlertTriangle, RefreshCw, Code2, Layers, Terminal
} from 'lucide-react';
import type { HttpMethod, RequestHistoryItem, DeveloperNote, DeveloperTicket, TicketPriority } from '../types';

const MOCK_ENDPOINTS: Array<{ label: string; method: HttpMethod; path: string; description: string }> = [
  { label: 'Get All Flights', method: 'GET', path: '/api/v1/flights', description: 'Returns available flights' },
  { label: 'Search Flights', method: 'POST', path: '/api/v1/flights/search', description: 'Search by origin, destination, date' },
  { label: 'Create Booking', method: 'POST', path: '/api/v1/bookings', description: 'Creates a new booking' },
  { label: 'Get Booking', method: 'GET', path: '/api/v1/bookings/:id', description: 'Retrieve booking by ID' },
  { label: 'Cancel Booking', method: 'DELETE', path: '/api/v1/bookings/:id', description: 'Cancels an existing booking' },
  { label: 'Get User Profile', method: 'GET', path: '/api/v1/users/me', description: 'Get current user profile' },
  { label: 'Update Preferences', method: 'PUT', path: '/api/v1/users/me/preferences', description: 'Update user preferences' },
  { label: 'Flight Status', method: 'GET', path: '/api/v1/flights/:id/status', description: 'Real-time flight status' },
  { label: 'Check-in', method: 'POST', path: '/api/v1/checkin', description: 'Online check-in endpoint' },
];

const MOCK_RESPONSES: Record<string, { status: number; body: unknown; delay: number }> = {
  'GET /api/v1/flights': {
    status: 200, delay: 320,
    body: {
      flights: [
        { id: 'IDL1100', number: 'ID-LH-100', origin: 'LOS', destination: 'LHR', departure: '08:00', arrival: '14:45', duration: '6h 45m', price: 780, seats: 24 },
        { id: 'IDD1107', number: 'ID-DX-107', origin: 'LOS', destination: 'DXB', departure: '10:30', arrival: '17:40', duration: '7h 10m', price: 620, seats: 18 },
      ],
      total: 2, page: 1,
    },
  },
  'POST /api/v1/flights/search': {
    status: 200, delay: 480,
    body: {
      results: [
        { id: 'IDL1100', number: 'ID-LH-100', route: 'LOS → LHR', price: 780, availability: 'available' },
      ],
      searchId: 'SRH-8291-X', cached: false,
    },
  },
  'POST /api/v1/bookings': {
    status: 201, delay: 740,
    body: {
      booking_reference: 'IDN-48291-LHR',
      status: 'confirmed',
      passenger: { name: 'James Okafor', email: 'james@example.com' },
      flight: { number: 'ID-LH-100', date: '2026-06-15', class: 'economy' },
      price: { base: 780, taxes: 93, total: 898 },
      issued_at: new Date().toISOString(),
    },
  },
  'GET /api/v1/bookings/:id': {
    status: 200, delay: 210,
    body: { booking_reference: 'IDN-48291-LHR', status: 'confirmed', passenger_name: 'James Okafor', origin: 'LOS', destination: 'LHR', departure_date: '2026-06-15' },
  },
  'DELETE /api/v1/bookings/:id': {
    status: 200, delay: 530,
    body: { message: 'Booking successfully cancelled', booking_reference: 'IDN-48291-LHR', refund_status: 'processing' },
  },
  'GET /api/v1/users/me': {
    status: 200, delay: 180,
    body: { id: 'usr_8291x', email: 'user@idanairlines.com', name: 'System User', role: 'engineer', tier: 'gold' },
  },
  'PUT /api/v1/users/me/preferences': {
    status: 200, delay: 290,
    body: { message: 'Preferences updated', preferences: { seat_class: 'business', home_airport: 'LOS', notifications: true } },
  },
  'GET /api/v1/flights/:id/status': {
    status: 200, delay: 160,
    body: { flight_id: 'IDL1100', status: 'on_time', gate: 'B12', terminal: '2', departure_time: '08:00', estimated_departure: '08:00' },
  },
  'POST /api/v1/checkin': {
    status: 200, delay: 620,
    body: { status: 'checked_in', boarding_pass: 'BP-IDN-48291', seat: '14A', gate: 'B12', boarding_time: '07:20', message: 'Check-in successful' },
  },
};

const DEFAULT_RESPONSE = { status: 404, delay: 100, body: { error: 'Endpoint not found', code: 'NOT_FOUND' } };

interface Header { key: string; value: string; id: string }

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-emerald-500 bg-emerald-50',
  POST: 'text-sky-500 bg-sky-50',
  PUT: 'text-amber-500 bg-amber-50',
  DELETE: 'text-red-500 bg-red-50',
  PATCH: 'text-violet-500 bg-violet-50',
};

interface DevToolsPageProps {
  isDark: boolean;
}

export default function DevToolsPage({ isDark }: DevToolsPageProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'notes' | 'docs' | 'tickets'>('history');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [endpoint, setEndpoint] = useState('/api/v1/flights');
  const [headers, setHeaders] = useState<Header[]>([
    { id: '1', key: 'Content-Type', value: 'application/json' },
    { id: '2', key: 'Authorization', value: 'Bearer <token>' },
  ]);
  const [body, setBody] = useState('{\n  \n}');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; time: number; body: unknown } | null>(null);
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);
  const [notes, setNotes] = useState<DeveloperNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [tickets, setTickets] = useState<DeveloperTicket[]>([]);
  const [ticketForm, setTicketForm] = useState({ title: '', description: '', priority: 'medium' as TicketPriority });
  const [copied, setCopied] = useState(false);
  const [docsExpanded, setDocsExpanded] = useState<string | null>(null);

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const panelBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const codeBg = isDark ? 'bg-gray-950 text-gray-200' : 'bg-gray-50 text-gray-800';

  const sendRequest = useCallback(async () => {
    setLoading(true);
    const start = Date.now();

    const mockKey = Object.keys(MOCK_RESPONSES).find(k => {
      const [m, p] = k.split(' ');
      const pattern = p.replace(/:[\w]+/g, '[^/]+');
      return m === method && new RegExp(`^${pattern}$`).test(endpoint);
    });

    const mock = mockKey ? MOCK_RESPONSES[mockKey] : DEFAULT_RESPONSE;
    await new Promise(r => setTimeout(r, mock.delay));

    const elapsed = Date.now() - start;
    const result = { status: mock.status, time: elapsed, body: mock.body };
    setResponse(result);

    const historyItem: RequestHistoryItem = {
      id: crypto.randomUUID(),
      method,
      endpoint,
      headers: headers.reduce<Record<string, string>>((acc, h) => { if (h.key) acc[h.key] = h.value; return acc; }, {}),
      body: method !== 'GET' && body.trim() ? (() => { try { return JSON.parse(body); } catch { return undefined; } })() : undefined,
      status_code: mock.status,
      response_body: mock.body,
      response_time_ms: elapsed,
      created_at: new Date().toISOString(),
    };
    setHistory(prev => [historyItem, ...prev.slice(0, 49)]);
    setLoading(false);
  }, [method, endpoint, headers, body]);

  const addHeader = () => setHeaders(h => [...h, { id: crypto.randomUUID(), key: '', value: '' }]);
  const removeHeader = (id: string) => setHeaders(h => h.filter(x => x.id !== id));
  const updateHeader = (id: string, field: 'key' | 'value', val: string) =>
    setHeaders(h => h.map(x => x.id === id ? { ...x, [field]: val } : x));

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.body, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    const note: DeveloperNote = { id: crypto.randomUUID(), content: noteText, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setNotes(n => [note, ...n]);
    setNoteText('');
  };

  const submitTicket = () => {
    if (!ticketForm.title || !ticketForm.description) return;
    const ticket: DeveloperTicket = { id: crypto.randomUUID(), ...ticketForm, status: 'open', created_at: new Date().toISOString() };
    setTickets(t => [ticket, ...t]);
    setTicketForm({ title: '', description: '', priority: 'medium' });
  };

  const statusColor = (s: number) => {
    if (s >= 200 && s < 300) return 'text-emerald-500';
    if (s >= 300 && s < 400) return 'text-amber-500';
    return 'text-red-500';
  };

  const priorityColor = (p: TicketPriority) => ({
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-sky-100 text-sky-700',
    high: 'bg-amber-100 text-amber-700',
    critical: 'bg-red-100 text-red-700',
  })[p];

  return (
    <div className={`${bg} min-h-screen`}>
      {/* Workspace header */}
      <div className={`${panelBg} border-b`}>
        <div className="max-w-full px-4 sm:px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
              <Terminal className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <div className={`text-sm font-semibold ${textPrimary}`}>Idan Airlines · Developer Workspace</div>
              <div className={`text-xs ${textSecondary}`}>Internal Engineering Tools · v2.4.1</div>
            </div>
          </div>
          <div className={`ml-auto flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            API Gateway · Online
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-112px)]">
        {/* LEFT PANEL - Request Builder */}
        <div className={`w-1/2 border-r flex flex-col ${panelBg}`} style={{ borderColor: isDark ? '#1f2937' : '#e5e7eb' }}>
          <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <Code2 className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
            <span className={`text-sm font-semibold ${textPrimary}`}>Request Builder</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Method + Endpoint */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${textSecondary}`}>Endpoint</label>
              <div className="flex gap-2">
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value as HttpMethod)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/30 min-w-[90px] ${inputBg}`}
                >
                  {(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as HttpMethod[]).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={endpoint}
                  onChange={e => setEndpoint(e.target.value)}
                  placeholder="/api/v1/endpoint"
                  className={`flex-1 px-3.5 py-2.5 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all ${inputBg}`}
                />
              </div>
            </div>

            {/* Quick endpoints */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${textSecondary}`}>Quick Endpoints</label>
              <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto">
                {MOCK_ENDPOINTS.map(ep => (
                  <button
                    key={`${ep.method}-${ep.path}`}
                    onClick={() => { setMethod(ep.method); setEndpoint(ep.path); }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                      isDark ? 'hover:bg-gray-800 border border-gray-800' : 'hover:bg-gray-100 border border-gray-100'
                    }`}
                  >
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${METHOD_COLORS[ep.method]}`}>
                      {ep.method}
                    </span>
                    <span className={`font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{ep.path}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Headers */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>Headers</label>
                <button onClick={addHeader} className={`flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700`}>
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {headers.map(h => (
                  <div key={h.id} className="flex gap-2">
                    <input
                      value={h.key}
                      onChange={e => updateHeader(h.id, 'key', e.target.value)}
                      placeholder="Header name"
                      className={`flex-1 px-3 py-2 rounded-lg border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500/40 ${inputBg}`}
                    />
                    <input
                      value={h.value}
                      onChange={e => updateHeader(h.id, 'value', e.target.value)}
                      placeholder="Value"
                      className={`flex-1 px-3 py-2 rounded-lg border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500/40 ${inputBg}`}
                    />
                    <button onClick={() => removeHeader(h.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            {method !== 'GET' && (
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${textSecondary}`}>Request Body (JSON)</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={8}
                  className={`w-full px-3.5 py-3 rounded-lg border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/30 resize-none transition-all ${inputBg}`}
                  spellCheck={false}
                />
              </div>
            )}
          </div>

          {/* Send button */}
          <div className={`p-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <button
              onClick={sendRequest}
              disabled={loading || !endpoint}
              className="w-full flex items-center justify-center gap-2 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400/60 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Request
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL - Response Viewer */}
        <div className={`w-1/2 flex flex-col ${panelBg}`}>
          <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2">
              <Layers className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
              <span className={`text-sm font-semibold ${textPrimary}`}>Response</span>
            </div>
            {response && (
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${statusColor(response.status)}`}>
                  {response.status}
                </span>
                <span className={`text-xs ${textSecondary}`}>{response.time}ms</span>
                <button
                  onClick={copyResponse}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${
                    isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                  }`}
                >
                  {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {/* Response content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!response && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Send className={`w-6 h-6 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                </div>
                <p className={`text-sm ${textSecondary}`}>Send a request to see the response</p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex items-center justify-center gap-3">
                <RefreshCw className={`w-5 h-5 animate-spin ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
                <span className={`text-sm ${textSecondary}`}>Waiting for response...</span>
              </div>
            )}

            {response && !loading && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Status bar */}
                <div className={`flex items-center gap-4 px-4 py-2 text-xs border-b ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={textSecondary}>Status:</span>
                    <span className={`font-bold ${statusColor(response.status)}`}>{response.status} {
                      response.status === 200 ? 'OK' : response.status === 201 ? 'Created' : response.status === 404 ? 'Not Found' : ''
                    }</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className={`w-3 h-3 ${textSecondary}`} />
                    <span className={textSecondary}>{response.time}ms</span>
                  </div>
                  {response.status >= 400 && (
                    <div className="flex items-center gap-1.5 text-amber-500">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Error response</span>
                    </div>
                  )}
                </div>

                {/* JSON viewer */}
                <div className="flex-1 overflow-auto">
                  <pre className={`text-xs p-4 min-h-full font-mono leading-relaxed ${codeBg}`}>
                    {JSON.stringify(response.body, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Bottom tabs */}
          <div className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex">
              {([
                { key: 'history', label: 'History', icon: Clock },
                { key: 'notes', label: 'Notes', icon: FileText },
                { key: 'docs', label: 'API Docs', icon: BookOpen },
                { key: 'tickets', label: 'Submit Ticket', icon: Ticket },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? `border-sky-600 ${isDark ? 'text-sky-400' : 'text-sky-600'}`
                      : `border-transparent ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={`h-56 overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
              {/* History tab */}
              {activeTab === 'history' && (
                <div className="p-3 space-y-1.5">
                  {history.length === 0 && (
                    <p className={`text-xs text-center py-8 ${textSecondary}`}>No requests yet</p>
                  )}
                  {history.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setMethod(item.method); setEndpoint(item.endpoint); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                        isDark ? 'hover:bg-gray-800' : 'hover:bg-white'
                      }`}
                    >
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase flex-shrink-0 ${METHOD_COLORS[item.method]}`}>
                        {item.method}
                      </span>
                      <span className={`font-mono flex-1 truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.endpoint}</span>
                      <span className={`font-bold flex-shrink-0 ${statusColor(item.status_code || 0)}`}>{item.status_code}</span>
                      <span className={`flex-shrink-0 ${textSecondary}`}>{item.response_time_ms}ms</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Notes tab */}
              {activeTab === 'notes' && (
                <div className="p-3">
                  <div className="flex gap-2 mb-3">
                    <input
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addNote()}
                      placeholder="Add a note... (Enter to save)"
                      className={`flex-1 px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40 ${inputBg}`}
                    />
                    <button onClick={addNote} className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {notes.length === 0 && <p className={`text-xs text-center py-4 ${textSecondary}`}>No notes yet</p>}
                    {notes.map(note => (
                      <div key={note.id} className={`flex items-start justify-between gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{note.content}</p>
                        <button onClick={() => setNotes(n => n.filter(x => x.id !== note.id))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Docs tab */}
              {activeTab === 'docs' && (
                <div className="p-3 space-y-1.5">
                  {MOCK_ENDPOINTS.map(ep => (
                    <div key={`${ep.method}-${ep.path}`} className={`rounded-lg overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                      <button
                        onClick={() => setDocsExpanded(prev => prev === `${ep.method}-${ep.path}` ? null : `${ep.method}-${ep.path}`)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left"
                      >
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${METHOD_COLORS[ep.method]}`}>{ep.method}</span>
                        <span className={`font-mono text-xs flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{ep.path}</span>
                        {docsExpanded === `${ep.method}-${ep.path}` ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                      </button>
                      {docsExpanded === `${ep.method}-${ep.path}` && (
                        <div className={`px-3 pb-2 text-xs ${textSecondary} border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} pt-2`}>
                          {ep.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tickets tab */}
              {activeTab === 'tickets' && (
                <div className="p-3">
                  <div className={`rounded-lg p-3 mb-3 space-y-2 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <input
                      value={ticketForm.title}
                      onChange={e => setTicketForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Ticket title"
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40 ${inputBg}`}
                    />
                    <textarea
                      value={ticketForm.description}
                      onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Describe the issue..."
                      rows={2}
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/40 resize-none ${inputBg}`}
                    />
                    <div className="flex gap-2">
                      <select
                        value={ticketForm.priority}
                        onChange={e => setTicketForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}
                        className={`flex-1 px-2 py-1.5 rounded-lg border text-xs focus:outline-none ${inputBg}`}
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="critical">Critical</option>
                      </select>
                      <button onClick={submitTicket} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-medium">
                        Submit
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {tickets.length === 0 && <p className={`text-xs text-center py-4 ${textSecondary}`}>No tickets submitted</p>}
                    {tickets.map(t => (
                      <div key={t.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.title}</p>
                          <p className={`text-[10px] truncate ${textSecondary}`}>{t.description}</p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${priorityColor(t.priority)}`}>
                          {t.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
