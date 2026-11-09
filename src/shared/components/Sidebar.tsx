import { useState } from "react";
import { NavLink } from "react-router-dom";
import type { Permission } from "../../modules/auth/types/auth.types";

interface SidebarProps {
  permissions: Permission[];
}

const moduleDefinitions = [
  { feature: "CATALOG_PRODUCTS", label: "Catálogo", icon: "▦", path: "/" },
  { feature: "CART", label: "Carrito", icon: "🛒", path: "/#products" },
  { feature: "ORDERS", label: "Pedidos", icon: "▤", path: "/orders" },
  { feature: "MYORDERS", label: "Mis pedidos", icon: "▤", path: "/my-orders" },
  { feature: "INVENTORY", label: "Inventario", icon: "◈", path: "/inventory" },
  { feature: "CHECKOUT", label: "Checkout", icon: "✓", path: "/checkout" },
  { feature: "REPORTS", label: "Reportes", icon: "▥", path: "/reports" },
  { feature: "USERS", label: "Usuarios", icon: "♙", path: "/users" },
  { feature: "COUPONS", label: "Cupones", icon: "%", path: "/coupons" },
  { feature: "AUDIT", label: "Bitácora", icon: "◷", path: "/audit" },
];

export function Sidebar({ permissions }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const visibleModules = moduleDefinitions.filter((module) =>
    permissions.some((permission) => permission.feature === module.feature && permission.enabled && permission.canRead),
  );

  if (visibleModules.length === 0) return null;

  return (
    <aside className={`shrink-0 self-start transition-[width] duration-200 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] ${collapsed ? "w-16 lg:w-16" : "w-full lg:w-48"}`}>
      <nav aria-label="Módulos disponibles" className={`rounded-2xl border border-[#d9dcf4] bg-white shadow-sm ${collapsed ? "p-2" : "p-3"}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && <p className="px-3 pb-3 pt-2 text-xs font-black uppercase tracking-[0.2em] text-[#dc2626]">Módulos</p>}
          <button
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef0ff] text-sm font-bold text-[#2f2eaa] transition hover:bg-[#dfe2ff]"
            onClick={() => setCollapsed((current) => !current)}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            type="button"
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>
        <div className={`gap-2 ${collapsed ? "hidden lg:grid lg:grid-cols-1" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1"}`}>
          {visibleModules.map((module) => (
            <NavLink
              className={({ isActive }) => `flex items-center rounded-xl py-3 text-sm font-bold transition ${collapsed ? "justify-center px-1" : "gap-3 px-3"} ${isActive ? "bg-[#eef0ff] text-[#2f2eaa]" : "text-[#64748b] hover:bg-[#f7f7ff] hover:text-[#2f2eaa]"}`}
              key={module.feature}
              to={module.path}
              title={collapsed ? module.label : undefined}
            >
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f1ff] text-base text-[#2f2eaa]">{module.icon}</span>
              {!collapsed && <span>{module.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
}
