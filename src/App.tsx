import { useState } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Navbar } from "./shared/components/Navbar";
import { Sidebar } from "./shared/components/Sidebar";
import { StorefrontPage } from "./modules/catalog/pages/StorefrontPage";
import { LoginPage } from "./modules/auth/pages/LoginPage";
import { RegisterPage } from "./modules/auth/pages/RegisterPage";
import { CheckoutPage } from "./modules/cart/pages/CheckoutPage";
import { OrdersPage } from "./modules/order/pages/OrdersPage";
import { MyOrdersPage } from "./modules/order/pages/MyOrdersPage";
import { ProtectedRoute } from "./shared/guards/ProtectedRoute";
import { PermissionRoute } from "./shared/guards/PermissionRoute";
import { ProductManagementPage } from "./modules/catalog/pages/ProductManagementPage";
import { CategoryManagementPage } from "./modules/catalog/pages/CategoryManagementPage";
import type { AuthResponse } from "./modules/auth/types/auth.types";
import type { CartItem } from "./modules/catalog/types/catalog.types";
import type { ReactNode } from "react";
import { claimGuestCart } from "./modules/cart/services/cartApi";
import { clearGuestCart, readGuestCartToken } from "./modules/cart/services/guestCartStorage";

const SESSION_KEY = "shopcart.session";

function readSession(): AuthResponse | null {
  const storedSession = sessionStorage.getItem(SESSION_KEY);
  return storedSession ? (JSON.parse(storedSession) as AuthResponse) : null;
}

function getUserDisplayName(email?: string): string {
  if (!email) return "Usuario";
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

interface WorkspaceLayoutProps {
  children: ReactNode;
  session: AuthResponse | null;
  onLogout: () => void;
}

function WorkspaceLayout({ children, session, onLogout }: WorkspaceLayoutProps) {
  return (
    <>
      <Navbar isAuthenticated={Boolean(session)} onLogout={onLogout} userName={getUserDisplayName(session?.user.email)} />
      <div className="min-h-[calc(100vh-73px)] bg-[#f7f7ff]">
        <div className="flex w-full flex-col gap-5 px-3 sm:px-4 lg:flex-row lg:gap-6 lg:px-5">
          {session && <Sidebar permissions={session.permissions} />}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </>
  );
}

function ApplicationRoutes() {
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthResponse | null>(readSession);
  const [, setCart] = useState<CartItem[]>([]);

  async function handleAuthenticated(newSession: AuthResponse) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));

    try {
      if (readGuestCartToken()) {
        await claimGuestCart();
        clearGuestCart();
      }
    } catch (migrationError) {
      sessionStorage.removeItem(SESSION_KEY);
      throw migrationError instanceof Error
        ? new Error(`La sesión se creó, pero no se pudo migrar el carrito: ${migrationError.message}`)
        : new Error("La sesión se creó, pero no se pudo migrar el carrito.");
    }

    setSession(newSession);
    navigate("/");
  }

  function handleLogout() {
    clearGuestCart();
    sessionStorage.clear();
    setCart([]);
    setSession(null);
    navigate("/");
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage onAuthenticated={handleAuthenticated} />} />
        <Route path="/register" element={<RegisterPage onAuthenticated={handleAuthenticated} />} />
        <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="/catalog/products/manage" element={<PermissionRoute permissions={session?.permissions ?? []} feature="CATALOG_PRODUCTS" action="canEdit"><WorkspaceLayout session={session} onLogout={handleLogout}><ProductManagementPage canEdit={Boolean(session?.permissions.some((permission) => permission.feature === "CATALOG_PRODUCTS" && permission.enabled && permission.canEdit))} canDelete={Boolean(session?.permissions.some((permission) => permission.feature === "CATALOG_PRODUCTS" && permission.enabled && permission.canDelete))} /></WorkspaceLayout></PermissionRoute>} />
        <Route path="/catalog/categories/manage" element={<PermissionRoute permissions={session?.permissions ?? []} feature="CATALOG_PRODUCTS" action="canEdit"><WorkspaceLayout session={session} onLogout={handleLogout}><CategoryManagementPage /></WorkspaceLayout></PermissionRoute>} />
        <Route path="/orders" element={<ProtectedRoute><WorkspaceLayout session={session} onLogout={handleLogout}><OrdersPage permissions={session?.permissions ?? []} /></WorkspaceLayout></ProtectedRoute>} />
        <Route path="/my-orders" element={<ProtectedRoute><WorkspaceLayout session={session} onLogout={handleLogout}><MyOrdersPage permissions={session?.permissions ?? []} /></WorkspaceLayout></ProtectedRoute>} />
        <Route path="*" element={<WorkspaceLayout session={session} onLogout={handleLogout}><StorefrontPage isAuthenticated={Boolean(session)} permissions={session?.permissions ?? []} onCartChange={setCart} /></WorkspaceLayout>} />
      </Routes>
    </>
  );
}

function App() {
  return <BrowserRouter><ApplicationRoutes /></BrowserRouter>;
}

export default App;
