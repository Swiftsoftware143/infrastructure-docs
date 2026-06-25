import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Users, Code2, Zap, Settings, Globe, Puzzle, LogOut, User, Layers, Workflow, Scan } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, testId: "nav-dashboard" },
  { to: "/clients", label: "Clients", icon: Users, testId: "nav-clients" },
  { to: "/personal-websites", label: "Personal Websites", icon: Globe, testId: "nav-personal-websites" },
  { to: "/widget-requests", label: "Widget Requests", icon: Puzzle, testId: "nav-widget-requests" },
  { to: "/automation", label: "Automation", icon: Workflow, testId: "nav-automation" },
  { to: "/scan-reports", label: "Scan Reports", icon: Scan, testId: "nav-scan-reports" },
  { to: "/embed", label: "Embed Code", icon: Code2, testId: "nav-embed" },
  { to: "/plan-settings", label: "Plan Settings", icon: Layers, testId: "nav-plan-settings" },
  { to: "/settings", label: "Settings", icon: Settings, testId: "nav-settings" },
];

export default function Sidebar() {
  const { signOut, user } = useAuth();

  return (
    <aside
      data-testid="sidebar"
      className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-[#1a1d27] border-r border-[#2e3245]"
    >
      <div className="px-6 py-7 border-b border-[#2e3245]">
        <div className="flex items-center gap-2.5 logo-container">
          <img 
            src="/logo.jpg" 
            alt="ADASwift" 
            className="h-9 w-9 rounded-lg object-cover logo-transparent"
          />
          <div className="leading-tight">
            <div
              className="font-black text-white tracking-tight text-[15px]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              ADASwift
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#64748b] font-semibold">
              Widget Platform
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-testid={item.testId}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-red-500/10 text-white border border-red-500/30 shadow-lg shadow-red-500/10"
                  : "text-[#94a3b8] hover:text-white hover:bg-white/5 border border-transparent"
              }`
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-[#2e3245]">
        {/* Profile link */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-2 ${
              isActive
                ? "bg-red-500/10 text-white border border-red-500/30 shadow-lg shadow-red-500/10"
                : "text-[#94a3b8] hover:text-white hover:bg-white/5 border border-transparent"
            }`
          }
        >
          <User className="h-4 w-4 shrink-0" />
          <span>Profile</span>
        </NavLink>
        
        {/* User info */}
        {user && (
          <div className="px-3 mb-3">
            <div className="text-xs text-[#64748b]">Signed in as</div>
            <div className="text-sm text-white font-medium truncate">{user.email}</div>
          </div>
        )}
        
        {/* Sign out button */}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white hover:bg-white/5 transition-all duration-200"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="px-6 py-5 border-t border-[#2e3245]">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[#64748b] font-semibold mb-1">
          Powered by
        </div>
        <div className="text-sm text-white font-medium">SwiftImpact Solutions</div>
        <div className="text-xs text-[#64748b] mt-0.5">Making the web accessible</div>
      </div>
    </aside>
  );
}
