
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import AuthButton from "./AuthButton";
import { useTranslation } from 'react-i18next';

const Header = () => {
  const { isAuthenticated, user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="py-3 px-3 md:py-4 md:px-8 border-b sticky top-0 z-50" style={{ backgroundColor: 'var(--color-red)', borderColor: 'var(--color-cream-border)' }}>
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2 mr-4 md:mr-8 no-underline">
            <span className="text-lg md:text-2xl font-display" style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-display)' }}>
              MYSTERY MAKER
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
          </nav>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center space-x-4">
          <Link
            to="/support"
            className="text-[15px] transition-colors"
            style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)', fontWeight: 400, textDecoration: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            aria-label={t('navigation.support')}
          >
            {t('navigation.support')}
          </Link>
          <LanguageSwitcher />
          {isAuthenticated && (
            <Link
              to="/dashboard"
              className="text-[15px] transition-all px-4 py-2 rounded-md"
              style={{ backgroundColor: 'var(--color-cream)', color: 'var(--color-red)', fontFamily: 'var(--font-body)', fontWeight: 600, textDecoration: 'none', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.15)'; }}
            >
              {t('navigation.dashboard')}
            </Link>
          )}
          <AuthButton />
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-3 -mr-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
          style={{ color: 'var(--color-cream)' }}
          onClick={toggleMenu}
          aria-label={t("navigation.toggleMenu")}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 shadow-lg z-50" style={{ backgroundColor: 'var(--color-red)', borderBottom: '1px solid var(--color-cream-border)' }}>
          <div className="p-5 flex flex-col" style={{ gap: '12px' }}>
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3 pb-3" style={{ borderBottom: '1px solid rgba(245,240,232,0.2)' }}>
                  {user?.avatar && (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                  )}
                  <span className="font-medium text-sm" style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)' }}>{user?.name}</span>
                </div>
                <button
                  className="w-full h-12 text-base flex items-center justify-center"
                  style={{ color: 'var(--color-cream)', border: '1.5px solid rgba(245,240,232,0.5)', borderRadius: '6px', fontFamily: 'var(--font-body)', fontWeight: 500, background: 'none', cursor: 'pointer' }}
                  onClick={() => { signOut(); toggleMenu(); }}
                >
                  {t('navigation.signOut')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/sign-up"
                  className="w-full h-12 no-underline text-base flex items-center justify-center"
                  style={{ backgroundColor: '#000', color: 'var(--color-cream)', borderRadius: '6px', fontFamily: 'var(--font-body)', fontWeight: 600 }}
                  onClick={toggleMenu}
                >
                  {t('navigation.signUp')}
                </Link>
                <Link
                  to="/sign-in"
                  className="w-full h-12 no-underline text-base flex items-center justify-center"
                  style={{ color: 'var(--color-cream)', border: '1.5px solid rgba(245,240,232,0.5)', borderRadius: '6px', fontFamily: 'var(--font-body)', fontWeight: 500 }}
                  onClick={toggleMenu}
                >
                  {t('navigation.signIn')}
                </Link>
              </>
            )}
            <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(245,240,232,0.15)' }}>
              <Link
                to="/support"
                className="text-sm no-underline"
                style={{ color: 'rgba(245,240,232,0.7)', fontFamily: 'var(--font-body)' }}
                onClick={toggleMenu}
              >
                {t('navigation.support')}
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
