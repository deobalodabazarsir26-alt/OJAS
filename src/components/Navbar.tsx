import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Menu, X, Languages, LayoutDashboard, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const getDashboardRoute = () => {
    if (!user) return '/';
    if (user.User_Type === 'applicant') return '/applicant/dashboard';
    if (user.User_Type === 'office') return '/office/dashboard';
    if (user.User_Type === 'admin') return '/admin/dashboard';
    return '/';
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center group">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tighter uppercase group-hover:from-blue-700 group-hover:to-indigo-700 transition-all">OJAS</span>
              <span className="ml-2 text-sm font-medium text-gray-500 hidden sm:block font-hindi-support">{t('nav.system_name')}</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors mr-2"
              title={i18n.language === 'en' ? 'हिन्दी में बदलें' : 'Change to English'}
            >
              <Languages className="w-4 h-4 mr-1.5 text-blue-500" />
              {i18n.language === 'en' ? 'हिन्दी' : 'EN'}
            </button>
            <Link to="/" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'}`}>{t('nav.home')}</Link>
            
            {user ? (
              <div className="relative ml-2" ref={dropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center space-x-2 pl-4 pr-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 truncate max-w-[120px]">{user.User_Name}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 origin-top-right animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-gray-50 mb-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-1">{user.User_Type}</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{user.User_Name}</p>
                    </div>
                    <Link
                      to={getDashboardRoute()}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      onClick={() => setIsUserDropdownOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4 mr-3 text-blue-500" />
                      {t('nav.dashboard')}
                    </Link>
                    <div className="border-t border-gray-50 my-1"></div>
                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3 text-red-500" />
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3 ml-2 border-l pl-4 border-gray-200">
                <Link to="/login" className="text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">{t('nav.login')}</Link>
                <Link to="/signup" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all focus:ring-4 focus:ring-blue-500/20 font-hindi-support">{t('nav.register')}</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button and Lang toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 focus:outline-none"
            >
              <Languages className="h-5 w-5" />
              <span className="ml-1 text-xs font-bold">{i18n.language === 'en' ? 'हिन्दी' : 'EN'}</span>
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 focus:outline-none"
            >
              {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full left-0 animate-in slide-in-from-top-2">
          <div className="px-4 pt-2 pb-4 space-y-1">
            <Link to="/" className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${location.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
              <div className="flex items-center">
                {t('nav.home')}
              </div>
            </Link>
            
            {user ? (
              <>
                <div className="pt-4 pb-2">
                  <div className="px-4 py-2 bg-gray-50 rounded-xl mb-2 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{user.User_Name}</p>
                      <p className="text-xs font-medium text-gray-500 uppercase">{user.User_Type}</p>
                    </div>
                  </div>
                </div>
                <Link to={getDashboardRoute()} className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${location.pathname.includes('dashboard') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <div className="flex items-center">
                    <LayoutDashboard className="w-5 h-5 mr-3 text-blue-500" />
                    {t('nav.dashboard')}
                  </div>
                </Link>
                <div className="border-t border-gray-100 my-2"></div>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-center">
                    <LogOut className="w-5 h-5 mr-3 text-red-500" />
                    {t('nav.logout')}
                  </div>
                </button>
              </>
            ) : (
              <div className="pt-2 space-y-2">
                <Link to="/login" className="block w-full text-center px-4 py-3 rounded-xl text-base font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors">{t('nav.login')}</Link>
                <Link to="/signup" className="block w-full text-center px-4 py-3 rounded-xl text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">{t('nav.register')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
