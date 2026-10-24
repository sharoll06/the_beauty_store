"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "./admin.css";
import ProductsPanel from "./ProductsPanel";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://credgkfzeltaberkjgtu.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wC658A_Ey4-nnHKvNq_T9w_B649niw7";
const statuses = ["Solicitud recibida", "Validando disponibilidad", "Confirmado", "Pendiente de pago", "Pagado", "En preparación", "En camino", "Entregado", "No disponible", "Cancelado"];
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

export default function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [section, setSection] = useState("orders");

  useEffect(() => {
    const saved = sessionStorage.getItem("modo26-admin-session");
    if (saved) {
      try { setSession(JSON.parse(saved)); } catch { sessionStorage.removeItem("modo26-admin-session"); }
    }
  }, []);

  const api = useCallback(async (path, options = {}) => {
    const token = session?.access_token || SUPABASE_KEY;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers || {}) },
    });
    if (!response.ok) throw new Error(await response.text());
    if (response.status === 204) return null;
    return response.json();
  }, [session]);

  const loadOrders = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await api("orders?select=*,order_items(*)&order=created_at.desc");
      setOrders(data || []);
    } catch {
      setNotice({ type: "negative", text: "No fue posible consultar los pedidos." });
    } finally { setLoading(false); }
  }, [api, session]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const login = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify(credentials),
      });
      if (!response.ok) throw new Error("Acceso inválido");
      const data = await response.json();
      sessionStorage.setItem("modo26-admin-session", JSON.stringify(data));
      setSession(data);
      setNotice({ type: "positive", text: "Bienvenida al panel de Modo 26." });
    } catch { setNotice({ type: "negative", text: "Correo o contraseña incorrectos." }); }
    finally { setLoading(false); }
  };

  const logout = () => {
    sessionStorage.removeItem("modo26-admin-session");
    setSession(null); setOrders([]); setSelected(null);
  };

  const updateStatus = async (order, status) => {
    try {
      await api(`orders?id=eq.${order.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status, updated_at: new Date().toISOString() }) });
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
      setSelected((current) => current?.id === order.id ? { ...current, status } : current);
      setNotice({ type: "positive", text: `Pedido ${order.order_code} actualizado.` });
    } catch { setNotice({ type: "negative", text: "No fue posible actualizar el estado." }); }
  };

  const notify = useCallback((text, type = "positive") => setNotice({ text, type }), []);

  const filtered = useMemo(() => orders.filter((order) => {
    const matchText = `${order.order_code} ${order.customer_name} ${order.customer_whatsapp}`.toLowerCase().includes(query.toLowerCase());
    return matchText && (statusFilter === "Todos" || order.status === statusFilter);
  }), [orders, query, statusFilter]);

  const counts = useMemo(() => ({
    new: orders.filter((o) => o.status === "Solicitud recibida").length,
    process: orders.filter((o) => ["Validando disponibilidad", "Confirmado", "Pendiente de pago", "Pagado", "En preparación", "En camino"].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === "Entregado").length,
    total: orders.length,
  }), [orders]);

  if (!session) return (
    <main className="admin-login">
      <a href="/" className="admin-brand"><span>26</span><strong>Modo 26<small>Administración</small></strong></a>
      <form className="login-card" onSubmit={login}>
        <p className="admin-eyebrow">Acceso privado</p><h1>Todo tu negocio,<br /><em>en un vistazo.</em></h1>
        <p>Ingresa con la cuenta administrativa creada en Supabase.</p>
        <label><span>Correo</span><input type="email" required value={credentials.email} onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} placeholder="correo@ejemplo.com" /></label>
        <label><span>Contraseña</span><input type="password" required value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} placeholder="••••••••" /></label>
        <button disabled={loading}>{loading ? "Ingresando…" : "Ingresar al panel"}<span>→</span></button>
        <a href="/">← Volver a la tienda</a>
      </form>
      {notice && <AdminToast notice={notice} />}
    </main>
  );

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/" className="admin-brand"><span>26</span><strong>Modo 26<small>Administración</small></strong></a>
        <nav><button className={section === "orders" ? "active" : ""} onClick={() => setSection("orders")}>Pedidos</button><button className={section === "products" ? "active" : ""} onClick={() => setSection("products")}>Productos</button><a href="/" target="_blank" rel="noreferrer">Ver tienda ↗</a></nav>
        <button onClick={logout}>Cerrar sesión</button>
      </aside>
      <section className="admin-content" id="pedidos">
        {section === "products" ? <ProductsPanel api={api} session={session} notify={notify} /> : <>
        <header><div><p className="admin-eyebrow">Panel administrativo</p><h1>Pedidos</h1><p>Consulta las solicitudes y acompaña cada entrega.</p></div><button className="refresh" onClick={loadOrders}>↻ Actualizar</button></header>
        <div className="metric-grid">
          <article><span>Nuevas</span><strong>{counts.new}</strong><i className="dot new" /></article>
          <article><span>En proceso</span><strong>{counts.process}</strong><i className="dot process" /></article>
          <article><span>Entregadas</span><strong>{counts.delivered}</strong><i className="dot delivered" /></article>
          <article><span>Total</span><strong>{counts.total}</strong><i className="dot total" /></article>
        </div>
        <div className="orders-card">
          <div className="orders-toolbar"><div><h2>Solicitudes recientes</h2><small>{filtered.length} resultados</small></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar código o cliente" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>Todos</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div>
          {loading ? <div className="admin-empty">Consultando pedidos…</div> : !filtered.length ? <div className="admin-empty"><span>26</span><h3>No hay pedidos para mostrar</h3><p>Las nuevas solicitudes aparecerán aquí automáticamente.</p></div> : (
            <div className="orders-list">{filtered.map((order) => <article key={order.id} className="order-row">
              <div><small>Código</small><strong>{order.order_code}</strong></div><div><small>Cliente</small><strong>{order.customer_name}</strong><span>{order.city}</span></div><div><small>Fecha</small><strong>{date.format(new Date(order.created_at))}</strong></div><div><small>Total</small><strong>{money.format(order.total)}</strong></div><div><small>Estado</small><span className={`status status-${statuses.indexOf(order.status)}`}>{order.status}</span></div><button onClick={() => setSelected(order)}>Ver pedido →</button>
            </article>)}</div>
          )}
        </div></>}
      </section>
      {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} onStatus={updateStatus} />}
      {notice && <AdminToast notice={notice} />}
    </main>
  );
}

function OrderDetail({ order, onClose, onStatus }) {
  const whatsapp = `https://wa.me/57${String(order.customer_whatsapp).replace(/\D/g, "")}`;
  return <div className="admin-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><aside className="order-detail">
    <button className="detail-close" onClick={onClose} aria-label="Cerrar">×</button>
    <p className="admin-eyebrow">{order.order_code}</p><h2>Detalle del pedido</h2>
    <div className="detail-block"><h3>Cliente y entrega</h3><dl><div><dt>Cliente</dt><dd>{order.customer_name}</dd></div><div><dt>WhatsApp</dt><dd>{order.customer_whatsapp}</dd></div><div><dt>Ubicación</dt><dd>{order.address}, {order.neighborhood}, {order.city}</dd></div><div><dt>Entrega</dt><dd>{order.delivery_method}</dd></div><div><dt>Pago</dt><dd>{order.payment_method}</dd></div></dl></div>
    <div className="detail-block"><h3>Prendas</h3>{(order.order_items || []).map((item) => <div className="detail-item" key={item.id}><span><strong>{item.product_name}</strong><small>Talla {item.selected_size} · Cantidad {item.quantity}</small></span><b>{money.format(item.line_total)}</b></div>)}</div>
    {order.notes && <div className="detail-block"><h3>Indicaciones</h3><p>{order.notes}</p></div>}
    <div className="detail-total"><span>Total</span><strong>{money.format(order.total)}</strong></div>
    <label className="status-control"><span>Estado actual</span><select value={order.status} onChange={(e) => onStatus(order, e.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
    <a className="whatsapp-action" href={whatsapp} target="_blank" rel="noreferrer">Abrir conversación en WhatsApp ↗</a>
  </aside></div>;
}

function AdminToast({ notice }) { return <div className={`admin-toast ${notice.type}`} role="status"><span>{notice.type === "positive" ? "✓" : "!"}</span>{notice.text}</div>; }
