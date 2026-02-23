import { Link, useLocation } from "react-router-dom";
import { Home, Plus, List, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

function NavItem({ to, icon, label, active }: NavItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center justify-center gap-1 h-full min-h-[48px] transition-colors",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className="w-6 h-6 flex items-center justify-center">
        {icon}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-40 safe-area-inset-bottom"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-4 h-16">
        <NavItem
          to="/dashboard"
          icon={<Home size={20} />}
          label={t("navigation.home", { defaultValue: "Home" })}
          active={location.pathname === "/" || location.pathname === "/dashboard"}
        />
        <NavItem
          to="/mystery/create"
          icon={<Plus size={20} />}
          label={t("navigation.create", { defaultValue: "Create" })}
          active={location.pathname.includes("/mystery/create") || location.pathname.includes("/mystery/new")}
        />
        <NavItem
          to="/dashboard"
          icon={<List size={20} />}
          label={t("navigation.mysteries", { defaultValue: "Mysteries" })}
          active={location.pathname.includes("/mystery/") && !location.pathname.includes("/create") && !location.pathname.includes("/new")}
        />
        <NavItem
          to="/account"
          icon={<User size={20} />}
          label={t("navigation.account", { defaultValue: "Account" })}
          active={location.pathname.includes("/account")}
        />
      </div>
    </nav>
  );
}
