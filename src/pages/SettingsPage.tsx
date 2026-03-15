import { useState } from 'react';
import { Bell, Moon, Sun, Shield, Globe, CreditCard, Trash2, Save, ChevronRight } from 'lucide-react';

interface SettingsPageProps {
  isDark: boolean;
  onToggleDark: () => void;
}

export default function SettingsPage({ isDark, onToggleDark }: SettingsPageProps) {
  const [notifications, setNotifications] = useState({
    bookingConfirmations: true,
    flightUpdates: true,
    promotions: false,
    mileageAlerts: true,
    smsAlerts: false,
  });
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('USD');
  const [saved, setSaved] = useState(false);

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls = isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';
  const dividerCls = isDark ? 'border-gray-700' : 'border-gray-100';

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-sky-600' : (isDark ? 'bg-gray-600' : 'bg-gray-300')
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  const SettingRow = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div className={`flex items-center justify-between py-4 border-b last:border-0 ${dividerCls}`}>
      <div>
        <p className={`text-sm font-medium ${textPrimary}`}>{label}</p>
        {desc && <p className={`text-xs mt-0.5 ${textSecondary}`}>{desc}</p>}
      </div>
      {children}
    </div>
  );

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
    <div className={`${cardBg} rounded-xl border p-5 mb-5`}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-sky-50'}`}>
          <Icon className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
        </div>
        <h3 className={`text-sm font-bold ${textPrimary}`}>{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className={`${bg} min-h-screen py-8`}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-2xl font-bold ${textPrimary}`}>Settings</h1>
            <p className={`text-sm mt-1 ${textSecondary}`}>Manage your account and preferences</p>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {/* Appearance */}
        <Section title="Appearance" icon={Moon}>
          <SettingRow label="Dark Mode" desc="Switch to dark interface">
            <div className="flex items-center gap-2">
              <Sun className={`w-4 h-4 ${isDark ? 'text-gray-600' : 'text-amber-500'}`} />
              <Toggle checked={isDark} onChange={onToggleDark} />
              <Moon className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-gray-400'}`} />
            </div>
          </SettingRow>
          <SettingRow label="Language">
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${inputCls}`}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
              <option value="yo">Yorùbá</option>
            </select>
          </SettingRow>
          <SettingRow label="Currency">
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${inputCls}`}
            >
              <option value="USD">USD — US Dollar</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="EUR">EUR — Euro</option>
              <option value="NGN">NGN — Nigerian Naira</option>
              <option value="AED">AED — UAE Dirham</option>
            </select>
          </SettingRow>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          {[
            { key: 'bookingConfirmations' as const, label: 'Booking Confirmations', desc: 'Receive instant booking and cancellation confirmations' },
            { key: 'flightUpdates' as const, label: 'Flight Status Updates', desc: 'Gate changes, delays, and boarding notifications' },
            { key: 'mileageAlerts' as const, label: 'Mileage Alerts', desc: 'Notifications when miles are earned or about to expire' },
            { key: 'promotions' as const, label: 'Promotions & Offers', desc: 'Special fare deals and loyalty program offers' },
            { key: 'smsAlerts' as const, label: 'SMS Alerts', desc: 'Receive critical updates via text message' },
          ].map(n => (
            <SettingRow key={n.key} label={n.label} desc={n.desc}>
              <Toggle
                checked={notifications[n.key]}
                onChange={() => setNotifications(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
              />
            </SettingRow>
          ))}
        </Section>

        {/* Privacy & Security */}
        <Section title="Privacy & Security" icon={Shield}>
          {[
            { label: 'Two-Factor Authentication', desc: 'Add extra security to your account' },
            { label: 'Login History', desc: 'View recent sign-in activity' },
            { label: 'Data Privacy', desc: 'Manage how your data is used' },
          ].map(item => (
            <div key={item.label} className={`flex items-center justify-between py-4 border-b last:border-0 ${dividerCls}`}>
              <div>
                <p className={`text-sm font-medium ${textPrimary}`}>{item.label}</p>
                <p className={`text-xs mt-0.5 ${textSecondary}`}>{item.desc}</p>
              </div>
              <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            </div>
          ))}
        </Section>

        {/* Payment Methods */}
        <Section title="Payment Methods" icon={CreditCard}>
          <div className={`flex items-center justify-between py-4 border-b ${dividerCls}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-7 rounded flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <CreditCard className={`w-4 h-4 ${textSecondary}`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${textPrimary}`}>Visa ending in 4242</p>
                <p className={`text-xs ${textSecondary}`}>Expires 12/27</p>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? 'bg-sky-900/30 text-sky-400' : 'bg-sky-50 text-sky-700'}`}>Default</span>
          </div>
          <button className={`w-full py-3 text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors`}>
            + Add new payment method
          </button>
        </Section>

        {/* Integrations */}
        <Section title="Regional Settings" icon={Globe}>
          <SettingRow label="Time Zone">
            <select className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none ${inputCls}`}>
              <option>Africa/Lagos (GMT+1)</option>
              <option>Europe/London (GMT+0)</option>
              <option>America/New_York (GMT-5)</option>
              <option>Asia/Dubai (GMT+4)</option>
            </select>
          </SettingRow>
        </Section>

        {/* Danger zone */}
        <div className={`${isDark ? 'bg-red-950/20 border-red-900/30' : 'bg-red-50 border-red-100'} rounded-xl border p-5`}>
          <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-red-400' : 'text-red-700'}`}>Danger Zone</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Delete Account</p>
              <p className={`text-xs ${isDark ? 'text-red-400/70' : 'text-red-500'}`}>Permanently delete your account and all travel data</p>
            </div>
            <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              isDark ? 'border-red-800 text-red-400 hover:bg-red-900/30' : 'border-red-200 text-red-600 hover:bg-red-100'
            }`}>
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
