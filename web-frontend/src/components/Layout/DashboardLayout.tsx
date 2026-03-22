import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useI18n } from '../../i18n/I18nProvider';
import {
    LayoutDashboard,
    PlusCircle,
    Search,
    Briefcase,
    MessageSquare,
    UserCircle,
    LogOut,
    Menu,
    X,
    Wallet,
    ShieldCheck
} from 'lucide-react';
import ToastStack from '../Notifications/ToastStack';
import { useChatStore } from '../../store/useChatStore';

const DashboardLayout: React.FC = () => {
    const { user, logout } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const totalUnread = useChatStore(state => state.totalUnread());
    const navigate = useNavigate();
    const { t, lang, setLanguage, languages } = useI18n();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    // Define navigation based on Roles
    const commonLinks = [
        { name: t('nav.message'), path: '/chat', icon: MessageSquare },
        { name: t('nav.profile'), path: '/profile', icon: UserCircle },
    ];

    const employerLinks = [
        { name: t('nav.dashboard'), path: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.findVendors'), path: '/vendors', icon: Search },
        { name: t('nav.postTask'), path: '/tasks/create', icon: PlusCircle },
        { name: t('nav.myTasks'), path: '/my-tasks', icon: Briefcase },
        { name: t('nav.payments'), path: '/payments', icon: Wallet },
    ];

    const vendorLinks = [
        { name: t('nav.dashboard'), path: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.findTasks'), path: '/tasks', icon: Search },
        { name: t('nav.myJobs'), path: '/my-jobs', icon: Briefcase },
        { name: t('nav.earnings'), path: '/earnings', icon: Wallet },
        { name: t('nav.verification'), path: '/verification', icon: ShieldCheck },
    ];

    const adminLinks = [
        { name: t('nav.admin'), path: '/admin', icon: LayoutDashboard },
    ];

    const links = user?.role === 'employer' ? employerLinks : vendorLinks;
    const allLinks = [...links, ...(user?.role === 'admin' ? adminLinks : []), ...commonLinks];

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
          className="fixed inset-0 bg-gray-800 bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <span className="text-2xl font-bold text-blue-600">WERA</span>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="px-4 py-2 mt-4">
            <div className="flex items-center p-3 mb-4 bg-blue-50 rounded-lg">
                <div className="ml-2">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-blue-600 capitalize">{user?.role}</p>
                </div>
            </div>
            <div className="mt-2">
              <label className="text-xs text-gray-500">Language</label>
              <select
                value={lang}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
        </div>

        <nav className="px-4 space-y-1">
          {allLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            const isMessages = link.path.startsWith('/chat');
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                <span className="flex-1 flex items-center justify-between">
                  {link.name}
                  {isMessages && totalUnread > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-semibold px-2 py-0.5 min-w-[20px]">
                      {totalUnread}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
          >
            <LogOut className="mr-3 h-5 w-5" />
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ToastStack />
        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow-sm h-16 flex items-center px-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="ml-4 text-xl font-bold text-gray-900">WERA</span>
          <div className="ml-auto">
            <select
              value={lang}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="border border-gray-200 rounded-md px-2 py-1 text-xs"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
