
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useTranslation } from "react-i18next";

const AuthButton = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      trackEvent('profile_menu_opened', { location: 'header' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center" style={{ gap: '12px' }}>
        <Link
          to="/sign-in"
          className="no-underline flex items-center justify-center transition-all"
          style={{
            color: 'var(--color-cream)',
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            fontWeight: 500,
            padding: '8px 20px',
            borderRadius: '6px',
            border: '1.5px solid rgba(245,240,232,0.7)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-cream)';
            e.currentTarget.style.color = 'var(--color-red)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-cream)';
          }}
        >
          {t("navigation.signIn")}
        </Link>
        <Link
          to="/sign-up"
          className="no-underline flex items-center justify-center transition-all"
          style={{
            backgroundColor: '#000000',
            color: 'var(--color-cream)',
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            fontWeight: 600,
            padding: '8px 20px',
            borderRadius: '6px',
            border: 'none',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A1A1A')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#000000')}
        >
          {t("navigation.signUp")}
        </Link>
      </div>
    );
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="flex items-center" style={{ gap: '6px' }}>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center transition-all focus:outline-none"
            style={{ gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="rounded-full"
                style={{
                  width: '36px',
                  height: '36px',
                  border: '1.5px solid rgba(245,240,232,0.5)',
                }}
              />
            ) : (
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: '#A01000',
                  border: '1.5px solid rgba(245,240,232,0.5)',
                  color: 'var(--color-cream)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {initial}
              </div>
            )}
            <ChevronDown
              className="transition-colors"
              style={{ width: '16px', height: '16px', color: 'rgba(245,240,232,0.7)' }}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-4 py-2">
            <p className="font-medium" style={{ color: 'var(--color-cream)' }}>{user?.name}</p>
            <p className="text-sm" style={{ color: 'var(--color-cream-muted)' }}>{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/account" className="cursor-pointer">{t("navigation.accountSettings")}</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            style={{ color: '#C81400' }}
            onClick={() => {
              signOut();
              setOpen(false);
            }}
          >
            {t("navigation.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AuthButton;
