"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, ImagePlus, LayoutGrid, List, LoaderCircle, Package, PackageCheck, PackagePlus, Pencil, Plus, Save, Search, Star, Trash2, X } from "lucide-react";

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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);
  const [productFlight, setProductFlight] = useState(null);
  const [viewMode, setViewMode] = useState("grid");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await api("products?select=*&order=created_at.desc") || []);
    } catch { notify("No fue posible consultar los productos.", "negative"); }
    finally { setLoading(false); }
  }, [api, notify]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => {
    if (!recentlyAddedId) return undefined;
    const scrollTimer = window.setTimeout(() => {
      document.querySelector(`[data-product-id="${recentlyAddedId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
    const clearTimer = window.setTimeout(() => setRecentlyAddedId(null), 2600);
    return () => { window.clearTimeout(scrollTimer); window.clearTimeout(clearTimer); };
  }, [recentlyAddedId]);
  useEffect(() => {
    if (!productFlight) return undefined;
    const timer = window.setTimeout(() => setProductFlight(null), 1150);
    return () => window.clearTimeout(timer);
  }, [productFlight]);

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

  const deleteProduct = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const deleted = await api(`products?id=eq.${deleteTarget.id}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
      if (!deleted?.some((item) => item.id === deleteTarget.id)) throw new Error("No fue posible confirmar la eliminación.");
      setProducts((current) => current.filter((item) => item.id !== deleteTarget.id));
      notify(`${deleteTarget.name} fue eliminado del catálogo.`, "positive");
      setDeleteTarget(null);
    } catch (error) {
      const usedInOrder = error.message?.includes("23503") || error.message?.includes("foreign key");
      notify(usedInOrder ? "Este producto pertenece a un pedido y no se puede eliminar. Puedes ocultarlo del catálogo." : "No fue posible eliminar el producto. No se realizó ningún cambio.", "negative");
    } finally {
      setDeleting(false);
    }
  };

  const handleProductSaved = useCallback(async (savedProduct, wasNew) => {
    setEditor(null);
    if (wasNew && savedProduct?.id) {
      setProductFlight(savedProduct);
      setRecentlyAddedId(savedProduct.id);
    }
    await loadProducts();
  }, [loadProducts]);

  return <>
    <header className="products-header"><div><p className="admin-eyebrow">Gestión del catálogo</p><h1>Productos</h1><p>Crea, organiza y controla las prendas que ven tus clientes.</p></div><button className="new-product" onClick={() => setEditor({ ...emptyProduct })}><Plus size={18} aria-hidden="true" /> Nueva prenda</button></header>
    <div className="product-metrics"><span><i><Package size={18} aria-hidden="true" /></i><strong>{products.length}</strong> productos</span><span><i><Eye size={18} aria-hidden="true" /></i><strong>{products.filter((p) => p.is_visible).length}</strong> visibles</span><span><i><Star size={18} aria-hidden="true" /></i><strong>{products.filter((p) => p.is_featured).length}</strong> destacados</span></div>
    <div className="orders-card product-admin-card">
      <div className="product-toolbar">
        <div className="catalog-title"><span><Package size={19} aria-hidden="true" /></span><div><h2>Catálogo registrado</h2><small>{filtered.length} resultados</small></div></div>
        <label className="product-search"><Search size={17} aria-hidden="true" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar referencia o nombre..." aria-label="Buscar productos" /></label>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)} aria-label="Filtrar por visibilidad"><option>Todos</option><option>Visibles</option><option>Ocultos</option></select>
        <div className="view-switch" aria-label="Cambiar vista"><button className={viewMode === "grid" ? "active" : ""} type="button" onClick={() => setViewMode("grid")} aria-label="Vista de tarjetas" aria-pressed={viewMode === "grid"}><LayoutGrid size={17} /></button><button className={viewMode === "table" ? "active" : ""} type="button" onClick={() => setViewMode("table")} aria-label="Vista de tabla" aria-pressed={viewMode === "table"}><List size={18} /></button></div>
      </div>
      {loading ? <div className="admin-empty">Consultando productos…</div> : !filtered.length ? <div className="admin-empty"><span>26</span><h3>No hay productos para mostrar</h3><p>Crea una prenda o modifica los filtros.</p></div> : viewMode === "grid" ? <div className="admin-product-grid">{filtered.map((product) => <article className={`admin-product ${recentlyAddedId === product.id ? "just-added" : ""}`} data-product-id={product.id} key={product.id}>
        <ProductThumbnail product={product} />
        <div className="admin-product-copy"><small>{product.reference} · {product.category}</small><h3>{product.name}</h3><strong>{money.format(product.price)}</strong><div className="product-sizes">{product.sizes?.length ? product.sizes.map((item) => <span key={item}>{item}</span>) : <em>Sin tallas</em>}</div></div>
        <ProductActions product={product} onEdit={() => setEditor({ ...product, occasions: product.occasions || [], sizes: product.sizes || [] })} onToggle={toggle} onDelete={() => setDeleteTarget(product)} />
      </article>)}</div> : <div className="product-table-wrap"><table className="product-table"><thead><tr><th>Producto</th><th>Referencia</th><th>Categoría</th><th>Tallas</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map((product) => <tr className={recentlyAddedId === product.id ? "just-added" : ""} data-product-id={product.id} key={product.id}><td><div className="table-product"><ProductThumbnail product={product} compact /><strong>{product.name}</strong></div></td><td>{product.reference}</td><td>{product.category}</td><td><div className="table-sizes">{product.sizes?.join(" · ") || "—"}</div></td><td className="table-price">{money.format(product.price)}</td><td><span className={`product-status ${product.is_visible ? "visible" : "hidden"}`}><i />{product.is_visible ? "Visible" : "Oculto"}</span></td><td><ProductActions compact product={product} onEdit={() => setEditor({ ...product, occasions: product.occasions || [], sizes: product.sizes || [] })} onToggle={toggle} onDelete={() => setDeleteTarget(product)} /></td></tr>)}</tbody></table></div>}
    </div>
    {productFlight && <div className="product-flight" aria-hidden="true"><span><PackagePlus size={30} /></span><small>{productFlight.reference || "Nueva prenda"}</small></div>}
    {editor && <ProductEditor product={editor} session={session} api={api} onClose={() => setEditor(null)} onSaved={handleProductSaved} notify={notify} />}
    {deleteTarget && <div className="admin-backdrop delete-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !deleting && setDeleteTarget(null)}>
      <section className="delete-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-product-title">
        <button className="detail-close" type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} aria-label="Cerrar"><X size={20} aria-hidden="true" /></button>
        <p className="admin-eyebrow">Eliminar producto</p>
        <h2 id="delete-product-title">¿Eliminar {deleteTarget.name}?</h2>
        <p>Se eliminará <strong>{deleteTarget.reference}</strong> de forma permanente. Esta acción no se puede deshacer.</p>
        <div className="delete-confirm-actions">
          <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</button>
          <button className="confirm-delete" type="button" onClick={deleteProduct} disabled={deleting}>{deleting ? <LoaderCircle className="icon-spin" size={17} aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}{deleting ? "Eliminando…" : "Sí, eliminar producto"}</button>
        </div>
      </section>
    </div>}
  </>;
}

function ProductThumbnail({ product, compact = false }) {
  return <div className={`admin-product-image ${compact ? "compact" : ""}`}>{product.images?.[0] && !product.images[0].includes("placehold.co") ? <img src={product.images[0]} alt={product.name} /> : <span>26</span>}{!compact && <i className={product.is_visible ? "visible" : "hidden"}>{product.is_visible ? "Visible" : "Oculto"}</i>}</div>;
}

function ProductActions({ product, onEdit, onToggle, onDelete, compact = false }) {
  return <div className={`admin-product-actions ${compact ? "compact" : ""}`}><button onClick={onEdit} aria-label={`Editar ${product.name}`} title="Editar"><Pencil size={15} aria-hidden="true" />{!compact && "Editar"}</button><button onClick={() => onToggle(product, "is_visible")} aria-label={product.is_visible ? `Ocultar ${product.name}` : `Mostrar ${product.name}`} title={product.is_visible ? "Ocultar" : "Mostrar"}>{product.is_visible ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}{!compact && (product.is_visible ? "Ocultar" : "Mostrar")}</button><button className={product.is_featured ? "featured" : ""} onClick={() => onToggle(product, "is_featured")} aria-label={product.is_featured ? `Quitar ${product.name} de destacados` : `Destacar ${product.name}`} aria-pressed={product.is_featured} title={product.is_featured ? "Quitar destacado" : "Destacar"}><Star size={15} fill={product.is_featured ? "currentColor" : "none"} aria-hidden="true" />{!compact && (product.is_featured ? "Destacado" : "Destacar")}</button><button className="delete-product" onClick={onDelete} aria-label={`Eliminar ${product.name}`} title="Eliminar"><Trash2 size={15} aria-hidden="true" />{!compact && "Eliminar"}</button></div>;
}

function ProductEditor({ product, session, api, onClose, onSaved, notify }) {
  const [form, setForm] = useState(product);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);
  const isNew = !product.id;
  const [creationId] = useState(() => product.id || crypto.randomUUID());
  const set = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));

  const uploadImages = async () => {
    if (!files.length) return form.images || [];
    const uploaded = [];
    for (const file of files) {
      const storageFolder = form.reference?.trim() || `${form.category}-${crypto.randomUUID()}`;
      const cleanReference = storageFolder.replace(/[^a-zA-Z0-9-_]/g, "-");
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
      const payload = { name: form.name.trim(), category: form.category, audience: form.audience, collection: form.collection, style: form.style, occasions: form.occasions, description: form.description.trim() || null, price: Number(form.price), sizes: form.sizes, images, is_visible: form.is_visible, is_featured: form.is_featured, updated_at: new Date().toISOString() };
      let savedProduct;
      if (!isNew) {
        payload.reference = form.reference;
        const updated = await api(`products?id=eq.${form.id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
        savedProduct = updated?.[0] || { ...form, ...payload };
      } else {
        payload.id = creationId;
        const saved = await api("products", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
        savedProduct = saved?.find((item) => item.id === creationId);
        if (!savedProduct) throw new Error("No fue posible confirmar el producto creado.");
      }
      notify(isNew ? "Producto creado correctamente." : "Producto actualizado correctamente.", "positive");
      setSaveComplete(true);
      window.setTimeout(() => onSaved(savedProduct, isNew), 430);
    } catch (error) {
      if (isNew) {
        try {
          const existing = await api(`products?id=eq.${creationId}&select=*`);
          if (existing?.length) {
            notify("Producto creado correctamente.", "positive");
            setSaveComplete(true);
            window.setTimeout(() => onSaved(existing[0], true), 430);
            return;
          }
        } catch {}
      }
      notify(error.message || "No fue posible guardar el producto. No se creó ningún registro.", "negative");
    }
    finally { setSaving(false); }
  };

  const removeImage = (url) => setForm((current) => ({ ...current, images: current.images.filter((image) => image !== url) }));

  return <div className="admin-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="product-editor" onSubmit={save}>
    <button className="detail-close" type="button" onClick={onClose} aria-label="Cerrar"><X size={20} aria-hidden="true" /></button><p className="admin-eyebrow">{form.id ? "Editar producto" : "Nuevo producto"}</p><h2>{form.id ? form.name : "Agregar una prenda"}</h2>
    <div className="product-form-grid"><label><span>Nombre *</span><input name="name" required value={form.name} onChange={set} /></label><label><span>Categoría *</span><select name="category" value={form.category} onChange={set}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Precio *</span><input name="price" required min="1" type="number" value={form.price} onChange={set} /></label><label><span>Público *</span><select name="audience" value={form.audience} onChange={set}><option>Mujer</option><option>Hombre</option><option>Unisex</option></select></label><label><span>Colección *</span><select name="collection" value={form.collection} onChange={set}><option>Casual</option><option>Deportiva</option></select></label><label className="editor-full"><span>Estilo *</span><select name="style" value={form.style} onChange={set}>{styles.map((item) => <option key={item}>{item}</option>)}</select></label><MultiChoice label="Tallas disponibles *" options={sizeOptions} value={form.sizes} onChange={(sizes) => setForm((current) => ({ ...current, sizes }))} /><MultiChoice label="Ocasiones" options={occasionOptions} value={form.occasions} onChange={(occasions) => setForm((current) => ({ ...current, occasions }))} /><label className="editor-full"><span>Descripción</span><textarea name="description" rows="3" value={form.description || ""} onChange={set} /></label><label className="editor-full upload-zone"><span><ImagePlus size={16} aria-hidden="true" /> Fotografías</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles([...e.target.files])} /><small>{files.length ? `${files.length} fotografía(s) nueva(s)` : "Puedes seleccionar varias imágenes JPG, PNG o WEBP."}</small></label></div>
    {!!form.images?.length && <div className="existing-images">{form.images.map((url) => <div key={url}><img src={url} alt="" /><button type="button" onClick={() => removeImage(url)} aria-label="Quitar fotografía"><X size={15} aria-hidden="true" /></button></div>)}</div>}
    <div className="editor-switches"><label><input type="checkbox" name="is_visible" checked={form.is_visible} onChange={set} /> Visible en el catálogo</label><label><input type="checkbox" name="is_featured" checked={form.is_featured} onChange={set} /> Producto destacado</label></div>
    <button className={`save-product ${saveComplete ? "success" : ""}`} disabled={saving || saveComplete}>{saveComplete ? <><PackageCheck size={20} aria-hidden="true" />Producto listo</> : saving ? <><LoaderCircle className="icon-spin" size={19} aria-hidden="true" />Guardando…</> : <><Save size={19} aria-hidden="true" />Guardar producto</>}</button>
  </form></div>;
}

function MultiChoice({ label, options, value, onChange }) {
  const toggle = (option) => onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  return <fieldset className="multi-choice editor-full"><legend>{label}</legend><div>{options.map((option) => <button type="button" key={option} className={value.includes(option) ? "selected" : ""} onClick={() => toggle(option)} aria-pressed={value.includes(option)}>{value.includes(option) && <PackageCheck size={13} aria-hidden="true" />}{option}</button>)}</div></fieldset>;
}


