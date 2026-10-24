"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://credgkfzeltaberkjgtu.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wC658A_Ey4-nnHKvNq_T9w_B649niw7";
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const emptyProduct = { reference: "", name: "", category: "Jeans", audience: "Mujer", collection: "Casual", style: "Urbano", occasions: [], description: "", price: "", sizes: [], images: [], is_visible: true, is_featured: false };
const categories = ["Jeans", "Bermudas", "Suéteres", "Gorras", "Chanclas", "Faldas", "Vestidos", "Conjuntos deportivos", "Camisetas deportivas", "Leggings", "Tops deportivos", "Sudaderas"];
const styles = ["Urbano", "Clásico", "Relajado", "Minimalista", "Moderno", "Elegante", "Romántico", "Athleisure", "Deporte"];
const sizeOptions = ["Única", "S", "M", "L", "XL", "6", "8", "10", "12", "14", "28", "30", "32", "34", "36", "38", "39", "40", "41", "42"];
const occasionOptions = ["Trabajo", "Universidad", "Salida casual", "Salida nocturna", "Reunión informal", "Cena", "Cumpleaños", "Concierto", "Evento", "Evento de día", "Fin de semana", "Vacaciones", "Viaje", "Playa", "Hogar", "Gimnasio", "Entrenamiento", "Running", "Yoga", "Caminata"];

export default function ProductsPanel({ api, session, notify }) {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await api("products?select=*&order=created_at.desc") || []);
    } catch { notify("No fue posible consultar los productos.", "negative"); }
    finally { setLoading(false); }
  }, [api, notify]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const filtered = useMemo(() => products.filter((product) => {
    const matches = `${product.reference} ${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    return matches && (visibility === "Todos" || (visibility === "Visibles" ? product.is_visible : !product.is_visible));
  }), [products, query, visibility]);

  const toggle = async (product, field) => {
    const value = !product[field];
    try {
      await api(`products?id=eq.${product.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ [field]: value, updated_at: new Date().toISOString() }) });
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, [field]: value } : item));
      notify(field === "is_visible" ? `Producto ${value ? "visible" : "oculto"}.` : `Producto ${value ? "marcado" : "retirado"} como destacado.`, "positive");
    } catch { notify("No fue posible actualizar el producto.", "negative"); }
  };

  return <>
    <header className="products-header"><div><p className="admin-eyebrow">Gestión del catálogo</p><h1>Productos</h1><p>Crea prendas y controla lo que ven tus clientes.</p></div><button className="new-product" onClick={() => setEditor({ ...emptyProduct })}>+ Nueva prenda</button></header>
    <div className="product-metrics"><span><strong>{products.length}</strong> productos</span><span><strong>{products.filter((p) => p.is_visible).length}</strong> visibles</span><span><strong>{products.filter((p) => p.is_featured).length}</strong> destacados</span></div>
    <div className="orders-card product-admin-card">
      <div className="orders-toolbar"><div><h2>Catálogo registrado</h2><small>{filtered.length} resultados</small></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar referencia o nombre" /><select value={visibility} onChange={(e) => setVisibility(e.target.value)}><option>Todos</option><option>Visibles</option><option>Ocultos</option></select></div>
      {loading ? <div className="admin-empty">Consultando productos…</div> : !filtered.length ? <div className="admin-empty"><span>26</span><h3>No hay productos para mostrar</h3><p>Crea una prenda o modifica los filtros.</p></div> : <div className="admin-product-grid">{filtered.map((product) => <article className="admin-product" key={product.id}>
        <div className="admin-product-image">{product.images?.[0] && !product.images[0].includes("placehold.co") ? <img src={product.images[0]} alt="" /> : <span>26</span>}<i className={product.is_visible ? "visible" : "hidden"}>{product.is_visible ? "Visible" : "Oculto"}</i></div>
        <div className="admin-product-copy"><small>{product.reference} · {product.category}</small><h3>{product.name}</h3><strong>{money.format(product.price)}</strong><p>{product.sizes?.join(" · ") || "Sin tallas"}</p></div>
        <div className="admin-product-actions"><button onClick={() => setEditor({ ...product, occasions: product.occasions || [], sizes: product.sizes || [] })}>Editar</button><button onClick={() => toggle(product, "is_visible")}>{product.is_visible ? "Ocultar" : "Mostrar"}</button><button className={product.is_featured ? "featured" : ""} onClick={() => toggle(product, "is_featured")}>★</button></div>
      </article>)}</div>}
    </div>
    {editor && <ProductEditor product={editor} session={session} api={api} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); loadProducts(); }} notify={notify} />}
  </>;
}

function ProductEditor({ product, session, api, onClose, onSaved, notify }) {
  const [form, setForm] = useState(product);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));

  const uploadImages = async () => {
    if (!files.length) return form.images || [];
    const uploaded = [];
    for (const file of files) {
      const cleanReference = form.reference.trim().replace(/[^a-zA-Z0-9-_]/g, "-");
      const cleanName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      const path = `${cleanReference}/${Date.now()}-${cleanName}`;
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/products/${path}`, { method: "POST", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": file.type, "x-upsert": "false" }, body: file });
      if (!response.ok) throw new Error("No fue posible subir una imagen");
      uploaded.push(`${SUPABASE_URL}/storage/v1/object/public/products/${path}`);
    }
    return [...(form.images || []), ...uploaded];
  };

  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      if (!form.sizes.length) throw new Error("Selecciona al menos una talla");
      const images = await uploadImages();
      const payload = { reference: form.reference.trim(), name: form.name.trim(), category: form.category, audience: form.audience, collection: form.collection, style: form.style, occasions: form.occasions, description: form.description.trim() || null, price: Number(form.price), sizes: form.sizes, images, is_visible: form.is_visible, is_featured: form.is_featured, updated_at: new Date().toISOString() };
      if (form.id) await api(`products?id=eq.${form.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload) });
      else await api("products", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload) });
      notify(form.id ? "Producto actualizado correctamente." : "Producto creado correctamente.", "positive"); onSaved();
    } catch { notify("No fue posible guardar. Revisa la referencia y los campos.", "negative"); }
    finally { setSaving(false); }
  };

  const removeImage = (url) => setForm((current) => ({ ...current, images: current.images.filter((image) => image !== url) }));

  return <div className="admin-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="product-editor" onSubmit={save}>
    <button className="detail-close" type="button" onClick={onClose} aria-label="Cerrar">×</button><p className="admin-eyebrow">{form.id ? "Editar producto" : "Nuevo producto"}</p><h2>{form.id ? form.name : "Agregar una prenda"}</h2>
    <div className="product-form-grid"><label><span>Referencia *</span><input name="reference" required value={form.reference} onChange={set} placeholder="MOD-P-021" /></label><label><span>Nombre *</span><input name="name" required value={form.name} onChange={set} /></label><label><span>Categoría *</span><select name="category" value={form.category} onChange={set}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Precio *</span><input name="price" required min="1" type="number" value={form.price} onChange={set} /></label><label><span>Público *</span><select name="audience" value={form.audience} onChange={set}><option>Mujer</option><option>Hombre</option><option>Unisex</option></select></label><label><span>Colección *</span><select name="collection" value={form.collection} onChange={set}><option>Casual</option><option>Deportiva</option></select></label><label className="editor-full"><span>Estilo *</span><select name="style" value={form.style} onChange={set}>{styles.map((item) => <option key={item}>{item}</option>)}</select></label><MultiChoice label="Tallas disponibles *" options={sizeOptions} value={form.sizes} onChange={(sizes) => setForm((current) => ({ ...current, sizes }))} /><MultiChoice label="Ocasiones" options={occasionOptions} value={form.occasions} onChange={(occasions) => setForm((current) => ({ ...current, occasions }))} /><label className="editor-full"><span>Descripción</span><textarea name="description" rows="3" value={form.description || ""} onChange={set} /></label><label className="editor-full upload-zone"><span>Fotografías</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles([...e.target.files])} /><small>{files.length ? `${files.length} fotografía(s) nueva(s)` : "Puedes seleccionar varias imágenes JPG, PNG o WEBP."}</small></label></div>
    {!!form.images?.length && <div className="existing-images">{form.images.map((url) => <div key={url}><img src={url} alt="" /><button type="button" onClick={() => removeImage(url)}>×</button></div>)}</div>}
    <div className="editor-switches"><label><input type="checkbox" name="is_visible" checked={form.is_visible} onChange={set} /> Visible en el catálogo</label><label><input type="checkbox" name="is_featured" checked={form.is_featured} onChange={set} /> Producto destacado</label></div>
    <button className="save-product" disabled={saving}>{saving ? "Guardando…" : "Guardar producto"}</button>
  </form></div>;
}

function MultiChoice({ label, options, value, onChange }) {
  const toggle = (option) => onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  return <fieldset className="multi-choice editor-full"><legend>{label}</legend><div>{options.map((option) => <button type="button" key={option} className={value.includes(option) ? "selected" : ""} onClick={() => toggle(option)} aria-pressed={value.includes(option)}>{value.includes(option) && <span>✓</span>}{option}</button>)}</div></fieldset>;
}
