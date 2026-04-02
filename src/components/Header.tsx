
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
              className="text-[15px] transition-colors"
              style={{ color: 'var(--color-cream)', fontFamily: 'var(--font-body)', fontWeight: 500, textDecoration: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
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
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 border-b shadow-lg z-50" style={{ backgroundColor: 'var(--color-red)', borderColor: 'var(--color-cream-border)' }}>
          <div className="p-4 space-y-4">
            <div className="flex justify-center">
              <Link
                to="/support"
                className="text-sm font-medium transition-colors no-underline"
                style={{ color: 'var(--color-cream)' }}
                aria-label={t('navigation.support')}
              >
                {t('navigation.support')}
              </Link>
              <LanguageSwitcher />
            </div>

            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3 py-3" style={{ borderBottom: '1px solid var(--color-cream-border)' }}>
                  {user?.avatar && (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="font-medium text-sm font-inter" style={{ color: 'var(--color-cream)' }}>{user?.name}</span>
                </div>
                <Button
                  asChild
                  className="w-full h-12 no-underline text-base font-inter"
                  onClick={toggleMenu}
                >
                  <Link to="/dashboard">{t('navigation.dashboard')}</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-12 no-underline text-base font-inter"
                  onClick={toggleMenu}
                >
                  <Link to="/account">{t('navigation.account', 'Account Settings')}</Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 no-underline text-base font-inter"
                  onClick={() => {
                    signOut();
                    toggleMenu();
                  }}
                >
                  {t('navigation.signOut')}
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  className="w-full h-12 no-underline text-base font-inter flex items-center justify-center"
                  style={{ color: 'var(--color-cream)', border: '1px solid var(--color-cream-border)', borderRadius: '4px' }}
                  onClick={toggleMenu}
                >
                  {t('navigation.signIn')}
                </Link>
                <Link
                  to="/sign-up"
                  className="btn-on-red w-full no-underline"
                  onClick={toggleMenu}
                >
                  {t('navigation.signUp')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
