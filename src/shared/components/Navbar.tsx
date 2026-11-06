import { Link } from "react-router-dom";

interface NavbarProps {
  isAuthenticated: boolean;
  userName?: string;
  onLogout: () => void;
}

export function Navbar({ isAuthenticated, userName, onLogout }: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#d9dcf4] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
        <Link className="text-xl font-black tracking-tight text-[#2f2eaa]" to="/">
          shop<span className="text-[#dc2626]">cart</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-semibold text-[#2f2eaa] sm:block">{userName}</span>
              <button className="rounded-xl border border-[#dc2626] px-3 py-2 text-sm font-bold text-[#dc2626] transition hover:bg-[#fef2f2]" onClick={onLogout} type="button">
                Salir
              </button>
            </div>
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
