import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const masterDataItems = [
  { label: 'Patients', path: '/patients', adminOnly: false },
  { label: 'Clinics', path: '/clinics', adminOnly: false },
  { label: 'Doctors', path: '/doctors', adminOnly: true },
  { label: 'Configurations', path: '/configurations', adminOnly: true },
];

const systemItems = [
  { label: 'User Management', path: '/users', adminOnly: true },
];

function Dropdown({ label, items, isAdmin }: {
  label: string;
  items: { label: string; path: string; adminOnly: boolean }[];
  isAdmin: boolean;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visibleItems = items.filter(i => !i.adminOnly || isAdmin);
  const isActive = visibleItems.some(i => i.path === location.pathname);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (visibleItems.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        {label}
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          {visibleItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2 text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu({ email, isAdmin, onLogout }: {
  email: string;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
      >
        <div className="text-right">
          <div className="text-sm font-medium text-gray-700">{email}</div>
          <div className="text-xs text-gray-400">{isAdmin ? 'Admin' : 'Operator'}</div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            My Profile
          </Link>
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Change Password
          </Link>
          <div className="border-t border-gray-100" />
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'ROLE_ADMIN';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClass = (active: boolean) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-1">
              <span className="text-lg font-bold text-blue-600 mr-4">Lifeline Call Log</span>

              <Link to="/dashboard" className={navLinkClass(location.pathname === '/dashboard')}>
                Dashboard
              </Link>

              <Link to="/requests" className={navLinkClass(location.pathname === '/requests')}>
                Requests
              </Link>

              <Dropdown label="Master Data" items={masterDataItems} isAdmin={isAdmin} />

              {isAdmin && <Dropdown label="System" items={systemItems} isAdmin={isAdmin} />}
            </div>

            <UserMenu
              email={user?.email ?? user?.username ?? ''}
              isAdmin={isAdmin}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
