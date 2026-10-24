"use client";

import { useEffect, useMemo, useState } from "react";
import "./storefront.css";

const fallbackProducts = [
  { id: 1, name: "Jean cargo azul", category: "Hombre", price: 95000, sizes: ["30", "32", "34"], featured: true, image: "https://placehold.co/760x940/CEDBE8/56306F?text=Jean+Cargo" },
  { id: 2, name: "Suéter tejido crema", category: "Hombre", price: 85000, sizes: ["S", "M", "L"], featured: true, image: "https://placehold.co/760x940/FFF3DE/56306F?text=Sueter+Crema" },
  { id: 3, name: "Vestido corto lila", category: "Mujer", price: 110000, sizes: ["S", "M", "L"], featured: true, image: "https://placehold.co/760x940/C5A9E0/56306F?text=Vestido+Lila" },
  { id: 4, name: "Falda midi plisada", category: "Mujer", price: 85000, sizes: ["S", "M", "L"], featured: false, image: "https://placehold.co/760x940/E8CFE1/56306F?text=Falda+Midi" },
  { id: 5, name: "Conjunto deportivo negro", category: "Deportivo", price: 125000, sizes: ["M", "L", "XL"], featured: true, image: "https://placehold.co/760x940/29242E/FFFFFF?text=Conjunto+Hombre" },
  { id: 6, name: "Leggings deportivos lila", category: "Deportivo", price: 78000, sizes: ["S", "M", "L"], featured: false, image: "https://placehold.co/760x940/B89BD4/FFFFFF?text=Leggings+Lila" },
  { id: 7, name: "Gorra lavanda", category: "Hombre", price: 45000, sizes: ["Única"], featured: false, image: "https://placehold.co/760x940/C5A9E0/56306F?text=Gorra+Lavanda" },
  { id: 8, name: "Jean wide leg negro", category: "Mujer", price: 105000, sizes: ["6", "8", "10", "12"], featured: false, image: "https://placehold.co/760x940/37323B/FFFFFF?text=Jean+Wide+Leg" },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://credgkfzeltaberkjgtu.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wC658A_Ey4-nnHKvNq_T9w_B649niw7";

const productSpriteIndex = {
  "Jean cargo azul": 0, "Jean clásico oscuro": 1, "Bermuda beige": 2, "Bermuda denim clara": 3,
  "Suéter tejido crema": 4, "Suéter oversize negro": 5, "Gorra lavanda": 6, "Chanclas negras": 7,
  "Jean mom fit azul": 8, "Jean wide leg negro": 9, "Falda midi plisada": 10, "Falda denim corta": 11,
  "Vestido corto lila": 12, "Vestido largo floral": 13, "Conjunto deportivo negro": 14,
  "Camiseta deportiva dry fit": 15, "Leggings deportivos lila": 16, "Top deportivo lavanda": 17,
  "Conjunto deportivo rosa": 18, "Sudadera deportiva gris": 19,
};

const normalizeProduct = (product) => ({
  ...product,
  price: Number(product.price),
  sizes: Array.isArray(product.sizes) ? product.sizes : [],
  image: product.images?.[0] && !product.images[0].includes("placehold.co") ? product.images[0] : null,
  spriteIndex: productSpriteIndex[product.name] ?? null,
  featured: product.is_featured,
});

function ProductVisual({ product }) {
  if (product.image && !product.image.includes("placehold.co")) return <img src={product.image} alt={product.name} />;
  const index = product.spriteIndex ?? productSpriteIndex[product.name] ?? 0;
  const column = index % 4;
  const row = Math.floor(index / 4);
  return <span className="product-visual" role="img" aria-label={product.name} style={{ backgroundPosition: `${(column * 100) / 3}% ${(row * 100) / 4}%` }} />;
}

const categories = [
  { name: "Mujer", caption: "Vestidos, jeans y faldas", mark: "M" },
  { name: "Hombre", caption: "Jeans, suéteres y accesorios", mark: "H" },
  { name: "Deportivo", caption: "Muévete con tu propio estilo", mark: "D" },
];

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default function Storefront() {
  const [products, setProducts] = useState(fallbackProducts);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogNotice, setCatalogNotice] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [selected, setSelected] = useState(null);
  const [size, setSize] = useState("");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerName: "", whatsapp: "", city: "Barranquilla", neighborhood: "", address: "",
    deliveryMethod: "Domicilio", paymentMethod: "Nequi", notes: "",
  });
  const [toast, setToast] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleProducts = useMemo(() => products.filter((product) => {
    if (filter === "Todos") return true;
    if (filter === "Deportivo") return product.collection === "Deportiva" || product.category === "Deportivo";
    return product.audience === filter || product.category === filter;
  }), [filter, products]);

  const heroProducts = products.length >= 3 ? products : fallbackProducts;

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/products?select=*&is_visible=eq.true&order=created_at.desc`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
        );
        if (!response.ok) throw new Error("No fue posible consultar el catálogo");
        const data = await response.json();
        if (active && data.length) setProducts(data.map(normalizeProduct));
        if (active && !data.length) setCatalogNotice("Muy pronto publicaremos nuevas prendas.");
      } catch {
        if (active) setCatalogNotice("Mostrando una selección temporal mientras actualizamos el catálogo.");
      } finally {
        if (active) setCatalogLoading(false);
      }
    }

    loadProducts();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("modal-open", Boolean(selected || cartOpen));
    return () => document.body.classList.remove("modal-open");
  }, [selected, cartOpen]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const openProduct = (product) => {
    setSelected(product);
    setSize("");
  };

  const closeProduct = () => {
    setSelected(null);
    setSize("");
  };

  const notify = (message, type = "info") => {
    setToast(null);
    window.requestAnimationFrame(() => setToast({ message, type, id: Date.now() }));
  };

  const addToCart = () => {
    if (!size) {
      notify("Selecciona una talla antes de continuar", "negative");
      return;
    }
    setCart((current) => [...current, { ...selected, selectedSize: size }]);
    notify(`${selected.name} se añadió a tu solicitud`, "positive");
    closeProduct();
  };

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price), 0);

  const removeFromCart = (index) => {
    setCart((current) => current.filter((_, itemIndex) => itemIndex !== index));
    notify("La prenda se retiró de tu solicitud", "info");
  };

  const updateOrderField = (event) => {
    const { name, value } = event.target;
    setOrderForm((current) => ({ ...current, [name]: value }));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!cart.length) return notify("Tu solicitud está vacía", "negative");
    if (!orderForm.customerName.trim() || !orderForm.whatsapp.trim() || !orderForm.neighborhood.trim() || !orderForm.address.trim()) {
      return notify("Completa los datos obligatorios del pedido", "negative");
    }

    const whatsappWindow = window.open("about:blank", "_blank");
    setSubmittingOrder(true);
    const orderCode = `M26-${Date.now().toString().slice(-8)}`;
    const orderId = crypto.randomUUID();
    try {
      const orderResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          id: orderId,
          order_code: orderCode,
          status: "Solicitud recibida",
          customer_name: orderForm.customerName.trim(),
          customer_whatsapp: orderForm.whatsapp.trim(),
          city: orderForm.city,
          neighborhood: orderForm.neighborhood.trim(),
          address: orderForm.address.trim(),
          delivery_method: orderForm.deliveryMethod,
          payment_method: orderForm.paymentMethod,
          subtotal,
          delivery_cost: 0,
          total: subtotal,
          notes: orderForm.notes.trim() || null,
        }),
      });
      if (!orderResponse.ok) throw new Error("No se pudo registrar el pedido");

      const itemResponse = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(cart.map((item) => ({
          order_id: orderId,
          product_id: item.id,
          product_name: item.name,
          selected_size: item.selectedSize,
          quantity: 1,
          unit_price: Number(item.price),
          line_total: Number(item.price),
        }))),
      });
      if (!itemResponse.ok) throw new Error("No se pudieron registrar las prendas");

      const itemLines = cart.map((item) => `• ${item.name} | Talla ${item.selectedSize} | ${money.format(item.price)}`).join("\n");
      const message = `Hola, Modo 26. Registré el pedido ${orderCode}.\n\n${itemLines}\n\nTotal: ${money.format(subtotal)}\nCliente: ${orderForm.customerName}\nCiudad: ${orderForm.city}\nBarrio: ${orderForm.neighborhood}\nEntrega: ${orderForm.deliveryMethod}\nPago: ${orderForm.paymentMethod}`;
      notify(`Pedido ${orderCode} registrado correctamente`, "positive");
      setCart([]);
      setCartOpen(false);
      setCheckoutOpen(false);
      const whatsappUrl = `https://wa.me/573027146025?text=${encodeURIComponent(message)}`;
      if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
      else window.location.href = whatsappUrl;
    } catch {
      whatsappWindow?.close();
      notify("No pudimos registrar el pedido. Intenta nuevamente.", "negative");
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <>
      <header className="site-header">
        <a href="#inicio" className="brand" aria-label="Modo 26, ir al inicio">
          <span className="brand-mark">26</span>
          <span>Modo 26<small>Tu estilo, tu modo</small></span>
        </a>
        <button className="menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="main-navigation"><span></span><span></span><span></span></button>
        {menuOpen && <button className="nav-backdrop" type="button" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
        <nav id="main-navigation" className={menuOpen ? "nav open" : "nav"} aria-label="Navegación principal">
          <div className="mobile-nav-heading"><span>Menú</span><button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">×</button></div>
          <a href="#inicio" onClick={() => setMenuOpen(false)}>Inicio</a>
          <a href="#catalogo" onClick={() => setMenuOpen(false)}>Catálogo</a>
          <a href="#recomendador" onClick={() => setMenuOpen(false)}>Encuentra tu estilo</a>
          <a href="https://instagram.com/the_beautystore26" target="_blank" rel="noreferrer">Instagram</a>
        </nav>
        <button className="cart-button" type="button" onClick={() => { setCartOpen(true); setCheckoutOpen(false); }} aria-label={`Solicitud con ${cart.length} prendas`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h2l1.8 10.1a2 2 0 0 0 2 1.7h7.9a2 2 0 0 0 1.9-1.4L21 7H6.1M9 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm8 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /></svg><b>Mi solicitud</b><span>{cart.length}</span></button>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-copy">
            <p className="eyebrow">Moda en Barranquilla y Soledad</p>
            <h1>Tu estilo,<br /><em>tu modo.</em></h1>
            <p className="hero-text">Prendas para cada versión de ti. Explora, combina y solicita tus favoritas directamente por WhatsApp.</p>
            <p className="request-note"><span>✓</span> Selecciona prendas y tallas. Confirmamos su disponibilidad por WhatsApp antes del pago.</p>
            <div className="hero-actions">
              <a className="button primary" href="#catalogo">Explorar catálogo <span>→</span></a>
              <a className="button secondary glass" href="#recomendador">Ayúdame a elegir</a>
            </div>
            <div className="hero-meta">
              <span><b>20+</b> prendas seleccionadas</span>
              <span><b>2</b> ciudades</span>
              <span><b>1:1</b> atención por WhatsApp</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Selección de prendas Modo 26">
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <article className="fashion-card main-card glass">
              <ProductVisual product={heroProducts[2]} />
              <div><span>Nueva vibra</span><strong>Vestido lila</strong></div>
            </article>
            <article className="fashion-card small-card glass">
              <ProductVisual product={heroProducts[0]} />
              <span>Favorito de la semana</span>
            </article>
            <div className="floating-note glass"><span>✦</span> Sujeto a confirmación</div>
          </div>
        </section>

        <section className="section" aria-labelledby="categories-title">
          <div className="section-heading">
            <div><p className="eyebrow">Explora a tu manera</p><h2 id="categories-title">¿Qué estás buscando hoy?</h2></div>
            <p>Encuentra prendas para tu estilo cotidiano, tus planes o tu próxima rutina.</p>
          </div>
          <div className="category-grid">
            {categories.map((category, index) => (
              <button className={`category-card category-${index + 1}`} key={category.name} type="button" onClick={() => { setFilter(category.name); document.querySelector("#catalogo")?.scrollIntoView(); }}>
                <span className="category-mark">{category.mark}</span>
                <span><strong>{category.name}</strong><small>{category.caption}</small></span>
                <b>→</b>
              </button>
            ))}
          </div>
        </section>

        <section className="section catalog-section" id="catalogo" aria-labelledby="catalog-title">
          <div className="section-heading catalog-heading">
            <div><p className="eyebrow">Catálogo Modo 26</p><h2 id="catalog-title">Elige lo que va contigo</h2></div>
            <div className="filter-row" aria-label="Filtrar productos">
              {["Todos", "Mujer", "Hombre", "Deportivo"].map((item) => (
                <button className={filter === item ? "filter active" : "filter"} type="button" key={item} onClick={() => setFilter(item)}>{item}</button>
              ))}
            </div>
          </div>
          {catalogLoading && <p className="catalog-status" role="status">Cargando prendas disponibles…</p>}
          {!catalogLoading && catalogNotice && <p className="catalog-status" role="status">{catalogNotice}</p>}
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <button className="product-image" type="button" onClick={() => openProduct(product)} aria-label={`Ver ${product.name}`}>
                  <ProductVisual product={product} />
                  {product.featured && <span className="tag">Destacado</span>}
                  <span className="availability-badge">Por confirmar</span>
                  <span className="quick-view">Ver prenda</span>
                </button>
                <div className="product-info">
                  <div><p>{product.category}</p><h3>{product.name}</h3></div>
                  <strong>{money.format(product.price)}</strong>
                </div>
                <div className="sizes">{product.sizes.map((item) => <span key={item}>{item}</span>)}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="section recommender glass" id="recomendador">
          <div className="recommender-icon">✦</div>
          <div><p className="eyebrow">Tu selección personal</p><h2>¿No sabes qué elegir?</h2><p>Responde unas preguntas sobre talla, ocasión, estilo y presupuesto para encontrar prendas que vayan contigo.</p></div>
          <button className="button primary" type="button" onClick={() => notify("El recomendador estará disponible en el siguiente avance", "info")}>Quiero una recomendación <span>→</span></button>
        </section>

        <section className="section how-it-works" aria-labelledby="steps-title">
          <div className="section-heading"><div><p className="eyebrow">Simple y cercano</p><h2 id="steps-title">Así compras en Modo 26</h2></div></div>
          <div className="steps">
            <article><span>01</span><h3>Elige tus prendas</h3><p>Explora el catálogo y selecciona tus tallas favoritas.</p></article>
            <article><span>02</span><h3>Completa tus datos</h3><p>Envía la solicitud sin crear una cuenta.</p></article>
            <article><span>03</span><h3>Recibe la confirmación</h3><p>Te confirmamos disponibilidad, pago y entrega por WhatsApp.</p></article>
          </div>
        </section>
      </main>

      <footer>
        <a href="#inicio" className="brand footer-brand"><span className="brand-mark">26</span><span>Modo 26<small>Tu estilo, tu modo</small></span></a>
        <p>Moda para hombre y mujer en Barranquilla y Soledad.</p>
        <div><a href="https://instagram.com/the_beautystore26" target="_blank" rel="noreferrer">Instagram</a><a href="#catalogo">Catálogo</a><a href="#recomendador">Recomendador</a><a href="/admin">Administración</a></div>
      </footer>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeProduct()}>
          <section className="product-modal glass" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="modal-close" type="button" onClick={closeProduct} aria-label="Cerrar detalle">×</button>
            <div className="modal-image"><ProductVisual product={selected} /><span className="tag">Sujeto a confirmación</span></div>
            <div className="modal-content">
              <p className="eyebrow">{selected.category} · {selected.reference || selected.id.toString().slice(0, 8)}</p>
              <h2 id="modal-title">{selected.name}</h2>
              <strong className="modal-price">{money.format(selected.price)}</strong>
              <p>{selected.description || "Una prenda seleccionada para combinar comodidad, versatilidad y el estilo propio de Modo 26."}</p>
              <fieldset><legend>Selecciona tu talla</legend><div className="size-picker">{selected.sizes.map((item) => <button className={size === item ? "selected" : ""} type="button" key={item} onClick={() => setSize(item)}>{item}</button>)}</div></fieldset>
              <button className="button primary full" type="button" onClick={addToCart}>Añadir a mi solicitud <span>→</span></button>
              <small className="availability">La añadiremos a tu solicitud. Antes del pago confirmaremos su disponibilidad por WhatsApp.</small>
            </div>
          </section>
        </div>
      )}
      {cartOpen && (
        <div className="modal-backdrop cart-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCartOpen(false)}>
          <aside className="cart-panel glass" role="dialog" aria-modal="true" aria-labelledby="cart-title">
            <button className="modal-close" type="button" onClick={() => setCartOpen(false)} aria-label="Cerrar solicitud">×</button>
            {!checkoutOpen ? (
              <>
                <div className="cart-heading"><p className="eyebrow">Prendas por confirmar</p><h2 id="cart-title">Mi solicitud <span>{cart.length}</span></h2></div>
                <div className="cart-items">
                  {!cart.length && <div className="empty-cart"><span>26</span><h3>Tu solicitud está vacía</h3><p>Explora el catálogo y elige una talla para añadir tu primera prenda.</p><button className="button secondary glass" type="button" onClick={() => setCartOpen(false)}>Seguir explorando</button></div>}
                  {cart.map((item, index) => (
                    <article className="cart-item" key={`${item.id}-${item.selectedSize}-${index}`}>
                      <div className="cart-thumb"><ProductVisual product={item} /></div>
                      <div><small>{item.category}</small><h3>{item.name}</h3><p>Talla {item.selectedSize}</p><strong>{money.format(item.price)}</strong></div>
                      <button className="remove-item" type="button" onClick={() => removeFromCart(index)} aria-label={`Quitar ${item.name}`}>×</button>
                    </article>
                  ))}
                </div>
                {!!cart.length && <div className="cart-summary"><div><span>Subtotal estimado</span><strong>{money.format(subtotal)}</strong></div><small>Esto no genera un cobro ni garantiza la reserva. Confirmaremos existencia, valor final, pago y entrega por WhatsApp.</small><button className="button primary full" type="button" onClick={() => setCheckoutOpen(true)}>Continuar solicitud <span>→</span></button></div>}
              </>
            ) : (
              <form className="checkout-form" onSubmit={submitOrder}>
                <button className="back-button" type="button" onClick={() => setCheckoutOpen(false)}>← Volver a mi solicitud</button>
                <div className="cart-heading"><p className="eyebrow">Pedido rápido</p><h2 id="cart-title">Datos de entrega</h2><p>Guardaremos la solicitud antes de abrir WhatsApp.</p></div>
                <div className="form-grid">
                  <label className="form-full"><span>Nombre completo *</span><input name="customerName" value={orderForm.customerName} onChange={updateOrderField} required placeholder="Tu nombre y apellido" /></label>
                  <label><span>Número de WhatsApp *</span><input name="whatsapp" value={orderForm.whatsapp} onChange={updateOrderField} required inputMode="tel" placeholder="300 000 0000" /></label>
                  <label><span>Ciudad *</span><select name="city" value={orderForm.city} onChange={updateOrderField}><option>Barranquilla</option><option>Soledad</option></select></label>
                  <label><span>Barrio *</span><input name="neighborhood" value={orderForm.neighborhood} onChange={updateOrderField} required placeholder="Nombre del barrio" /></label>
                  <label><span>Modalidad de entrega *</span><select name="deliveryMethod" value={orderForm.deliveryMethod} onChange={updateOrderField}><option>Domicilio</option><option>Recogida en punto acordado</option><option>Coordinado por WhatsApp</option></select></label>
                  <label className="form-full"><span>Dirección de entrega *</span><input name="address" value={orderForm.address} onChange={updateOrderField} required placeholder="Dirección o punto de referencia" /></label>
                  <label className="form-full"><span>Medio de pago *</span><select name="paymentMethod" value={orderForm.paymentMethod} onChange={updateOrderField}><option>Nequi</option><option>Transferencia bancaria</option><option>Efectivo contra entrega</option></select></label>
                  <label className="form-full"><span>Indicaciones adicionales</span><textarea name="notes" value={orderForm.notes} onChange={updateOrderField} rows="3" placeholder="Conjunto, torre, horario u otra indicación" /></label>
                </div>
                <div className="checkout-total"><span>Total de la solicitud</span><strong>{money.format(subtotal)}</strong></div>
                <p className="checkout-disclaimer">Al continuar registraremos tu solicitud. No se realizará ningún cobro; primero confirmaremos la disponibilidad por WhatsApp.</p>
                <button className="button primary full" type="submit" disabled={submittingOrder}>{submittingOrder ? "Registrando solicitud…" : "Enviar solicitud y abrir WhatsApp"}<span>→</span></button>
              </form>
            )}
          </aside>
        </div>
      )}
      {toast && (
        <div className={`toast toast-${toast.type}`} role={toast.type === "negative" ? "alert" : "status"} aria-live="polite">
          <span className="toast-icon" aria-hidden="true">
            {toast.type === "positive" ? (
              <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.7 7.7-5.4 5.4a1 1 0 0 1-1.4 0l-2.6-2.6 1.4-1.4 1.9 1.9 4.7-4.7 1.4 1.4Z" /></svg>
            ) : toast.type === "negative" ? (
              <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z" /></svg>
            )}
          </span>
          <span className="toast-copy"><strong>{toast.type === "positive" ? "Agregado" : toast.type === "negative" ? "Falta un paso" : "Modo 26"}</strong><small>{toast.message}</small></span>
        </div>
      )}
    </>
  );
}
