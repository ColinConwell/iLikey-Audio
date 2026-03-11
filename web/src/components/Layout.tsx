import { Outlet, NavLink } from "react-router-dom";
import { Music, Library, Settings } from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/", icon: Music, label: "Now Playing" },
  { to: "/library", icon: Library, label: "Library" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-brand-400">iLikey Audio</h1>
          <nav className="flex gap-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-brand-600/20 text-brand-400"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  )
                }
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
