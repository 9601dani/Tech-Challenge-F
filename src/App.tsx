import { useState } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Navbar } from "./shared/components/Navbar";
import { StorefrontPage } from "./modules/catalog/pages/StorefrontPage";
import { LoginPage } from "./modules/auth/pages/LoginPage";
import { RegisterPage } from "./modules/auth/pages/RegisterPage";
import { CheckoutPage } from "./modules/cart/pages/CheckoutPage";
import { ProtectedRoute } from "./shared/guards/ProtectedRoute";
import type { AuthResponse } from "./modules/auth/types/auth.types";
import type { CartItem } from "./modules/catalog/types/catalog.types";
import { addCartItem } from "./modules/cart/services/cartApi";
import { clearGuestCart, readGuestCart } from "./modules/cart/services/guestCartStorage";

const SESSION_KEY = "shopcart.session";

function readSession(): AuthResponse | null {
  const storedSession = sessionStorage.getItem(SESSION_KEY);
  return storedSession ? (JSON.parse(storedSession) as AuthResponse) : null;
}

function ApplicationRoutes() {
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthResponse | null>(readSession);
  const [cart, setCart] = useState<CartItem[]>([]);

  async function handleAuthenticated(newSession: AuthResponse) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));

    try {
      const guestItems = readGuestCart();
      for (const item of guestItems) {
        await addCartItem(item.id, item.quantity);
      }
      clearGuestCart();
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
        <Route path="*" element={<><Navbar cartItems={cart.reduce((total, item) => total + item.quantity, 0)} isAuthenticated={Boolean(session)} onLogout={handleLogout} userEmail={session?.user.email} /><StorefrontPage isAuthenticated={Boolean(session)} onCartChange={setCart} /></>} />
      </Routes>
    </>
  );
}

function App() {
  return <BrowserRouter><ApplicationRoutes /></BrowserRouter>;
}

export default App;
