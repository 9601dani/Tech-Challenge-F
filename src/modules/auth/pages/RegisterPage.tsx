import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { httpRequest } from "../../../shared/services/httpClient";
import type { AuthResponse } from "../types/auth.types";

interface RegisterPageProps {
  onAuthenticated: (session: AuthResponse) => void | Promise<void>;
}

export function RegisterPage({ onAuthenticated }: RegisterPageProps) {
  const [fullName, setFullName] = useState("");
  const [identification, setIdentification] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await httpRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ companyId: 1, fullName, identification, email, password }),
      });
      await onAuthenticated(session);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7ff] px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-[#e1e3f4] bg-white p-8 shadow-xl shadow-indigo-100/50 sm:p-10">
        <Link className="text-sm font-bold text-[#2f2eaa]" to="/">← Volver a la tienda</Link>
        <p className="mt-8 text-sm font-bold uppercase tracking-[0.25em] text-[#dc2626]">Registro</p>
        <h1 className="mt-3 text-3xl font-black text-[#0f172a]">Crea tu cuenta</h1>
        <p className="mt-2 text-sm leading-6 text-[#64748b]">Guarda tus direcciones, consulta tus pedidos y completa tu compra.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-[#334155]">Nombre completo<input className="mt-2 w-full rounded-xl border border-[#d9dcf4] bg-[#fafaff] px-4 py-3 outline-none focus:border-[#2f2eaa]" onChange={(event) => setFullName(event.target.value)} required value={fullName} /></label>
          <label className="block text-sm font-semibold text-[#334155]">NIT o identificación<input className="mt-2 w-full rounded-xl border border-[#d9dcf4] bg-[#fafaff] px-4 py-3 outline-none focus:border-[#2f2eaa]" onChange={(event) => setIdentification(event.target.value)} required value={identification} /></label>
          <label className="block text-sm font-semibold text-[#334155]">Correo electrónico<input className="mt-2 w-full rounded-xl border border-[#d9dcf4] bg-[#fafaff] px-4 py-3 outline-none focus:border-[#2f2eaa]" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
          <label className="block text-sm font-semibold text-[#334155]">Contraseña<input className="mt-2 w-full rounded-xl border border-[#d9dcf4] bg-[#fafaff] px-4 py-3 outline-none focus:border-[#2f2eaa]" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button className="w-full rounded-xl bg-[#2f2eaa] px-4 py-3.5 font-bold text-white transition hover:bg-[#25248e] disabled:opacity-60" disabled={loading} type="submit">{loading ? "Creando cuenta..." : "Crear cuenta"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-[#64748b]">¿Ya tienes cuenta? <Link className="font-bold text-[#2f2eaa]" to="/login">Inicia sesión</Link></p>
      </section>
    </main>
  );
}
