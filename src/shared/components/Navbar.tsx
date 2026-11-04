import { Link } from "react-router-dom";

interface NavbarProps {
  cartItems: number;
  isAuthenticated: boolean;
  userEmail?: string;
  onLogout: () => void;
}

export function Navbar({ cartItems, isAuthenticated, userEmail, onLogout }: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#d9dcf4] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
        <Link className="text-xl font-black tracking-tight text-[#2f2eaa]" to="/">
          shop<span className="text-[#dc2626]">cart</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <button className="relative rounded-xl p-2 text-[#0f172a] transition hover:bg-[#eef0ff]" type="button" aria-label="Ver carrito">
            {cartItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[11px] font-bold text-white">
                {cartItems}
              </span>
            )}
          </button>
          {isAuthenticated ? (
            <button className="hidden text-sm font-semibold text-[#2f2eaa] sm:block" onClick={onLogout} type="button">
              {userEmail} · Salir
            </button>
          ) : (
            <>
              <Link className="hidden text-sm font-semibold text-[#2f2eaa] sm:block" to="/login">Iniciar sesión</Link>
              <Link className="rounded-xl bg-[#2f2eaa] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#25248e]" to="/register">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
