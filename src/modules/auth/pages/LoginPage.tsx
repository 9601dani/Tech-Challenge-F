import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { login } from "../services/authApi";
import type { AuthResponse } from "../types/auth.types";

interface LoginPageProps {
  onAuthenticated: (session: AuthResponse) => void | Promise<void>;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState("cliente@shopcart.test");
  const [password, setPassword] = useState("Cliente123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await login({ email, password });
      await onAuthenticated(session);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f0f1ff] via-white to-[#fff1f3] px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[#e1e3f4] bg-white p-8 shadow-xl shadow-indigo-100/50 sm:p-10">
        <Link className="text-sm font-bold text-[#2f2eaa]" to="/">← Volver a la tienda</Link>
        <div className="mt-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-[#2f2eaa]">shop<span className="text-[#dc2626]">cart</span></p>
          <h1 className="mt-5 text-3xl font-black text-[#0f172a]">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-[#64748b]">Accede a tu cuenta para continuar con tu compra.</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-[#334155]">Correo electrónico<input className="mt-2 w-full rounded-xl border border-[#d9dcf4] bg-[#fafaff] px-4 py-3 outline-none transition focus:border-[#2f2eaa]" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
          <label className="block text-sm font-semibold text-[#334155]">Contraseña<input className="mt-2 w-full rounded-xl border border-[#d9dcf4] bg-[#fafaff] px-4 py-3 outline-none transition focus:border-[#2f2eaa]" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button className="w-full rounded-xl bg-[#2f2eaa] px-4 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-[#25248e] disabled:cursor-not-allowed disabled:opacity-60" disabled={loading} type="submit">{loading ? "Ingresando..." : "Iniciar sesión →"}</button>
        </form>

        <div className="my-7 border-t border-[#e8e9f5]" />
        <p className="text-center text-sm text-[#64748b]">¿No tienes una cuenta? <Link className="font-bold text-[#dc2626]" to="/register">Regístrate</Link></p>
      </section>
    </main>
  );
}
