import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { ProductCard } from "../components/ProductCard";
import { getManufacturedAvailability, listPublicCategories, listPublicProducts } from "../services/catalogApi";
import type { CatalogCategory, PublicCatalogFilters } from "../services/catalogApi";
import type { CartItem, ProductCardData, ProductVariantAttribute } from "../types/catalog.types";
import { getProductVariantBySku } from "../services/catalogApi";
import { addCartItem, addGuestCartItem, applyCoupon, clearCartItems, clearGuestCartBackend, getCart, getGuestCart, removeCartItem, removeCoupon, removeGuestCartItem, updateCartItem, updateGuestCartItem } from "../../cart/services/cartApi";
import { clearGuestCart, readGuestCart, readGuestCartToken, saveGuestCart } from "../../cart/services/guestCartStorage";
import type { Permission } from "../../auth/types/auth.types";

interface StorefrontPageProps {
  onCartChange: (items: CartItem[]) => void;
  isAuthenticated: boolean;
  permissions?: Permission[];
}

const formatVariantLines = (productName: string, variantName: string | null | undefined): string[] => {
  if (!variantName || variantName === "Predeterminado" || variantName.trim().toLocaleLowerCase() === productName.trim().toLocaleLowerCase()) return [];

  let label = variantName.trim();
  const productFirstWord = productName.trim().split(/\s+/)[0];

  if (productFirstWord && label.toLocaleLowerCase().startsWith(`${productFirstWord.toLocaleLowerCase()} `)) {
    label = label.slice(productFirstWord.length).trim();
  }

  const sizeMatch = label.match(/^(.*?)(?:\s+talla\s+|\s+)(XXXL|XXL|XL|XS|L|M|S)$/i);
  if (!sizeMatch) return [label];

  return [sizeMatch[1].trim(), sizeMatch[2].toUpperCase()];
};

const isDefaultCartVariant = (item: CartItem): boolean =>
  /(?:^|-)DEFAULT$/i.test(item.sku) ||
  !item.variantName ||
  item.variantName === "Predeterminado" ||
  item.variantName.trim().toLocaleLowerCase() === item.name.trim().toLocaleLowerCase();

const formatAttributeLines = (attributes: ProductVariantAttribute[] | undefined): string[] => {
  if (!attributes?.length) return [];
  return [...attributes]
    .sort((left, right) => {
      const order = (attribute: ProductVariantAttribute) => attribute.attributeName.toLocaleLowerCase().includes("color") ? 1 : 2;
      return order(left) - order(right);
    })
    .map((attribute) => attribute.attributeValue)
    .filter(Boolean);
};

const getCartVariantLines = (item: CartItem): string[] => {
  if (isDefaultCartVariant(item)) return [];
  const attributeLines = formatAttributeLines(item.attributes);
  return attributeLines.length > 0 ? attributeLines : formatVariantLines(item.name, item.variantName);
};

export function StorefrontPage({ onCartChange, isAuthenticated, permissions = [] }: StorefrontPageProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availability, setAvailability] = useState<"" | "true" | "false">("");
  const [sortBy, setSortBy] = useState<PublicCatalogFilters["sortBy"]>("name");
  const [sortDirection, setSortDirection] = useState<PublicCatalogFilters["sortDirection"]>("asc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 12, totalItems: 0, totalPages: 0 });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  function clearCouponState() {
    setCouponCode(null);
    setCouponDiscount(0);
  }

  async function enrichCartAvailability(items: CartItem[]): Promise<CartItem[]> {
    const availabilityByVariant = new Map<number, number>();
    products.forEach((product) => {
      product.variants?.forEach((variant) => availabilityByVariant.set(Number(variant.id), variant.availableQuantity));
      if (product.variants?.length === 0 || !product.variants) {
        availabilityByVariant.set(Number(product.id), product.availableQuantity ?? 0);
      }
    });

    const compositeProductIds = [...new Set([
      ...products.filter((product) => product.isComposite && product.productId).map((product) => Number(product.productId)),
      ...items.filter((item) => item.isComposite && item.productId).map((item) => Number(item.productId)),
    ])];

    await Promise.all(compositeProductIds.map(async (productId) => {
      try {
        const availability = await getManufacturedAvailability(productId);
        availability.forEach((variant) => availabilityByVariant.set(Number(variant.variantId), variant.availableQuantity));
      } catch {
        // Se conserva el último valor disponible si no se puede consultar la receta.
      }
    }));

    return items.map((item) => ({
      ...item,
      availableQuantity: availabilityByVariant.get(Number(item.id)) ?? item.availableQuantity,
    }));
  }

  async function enrichCartAttributes(items: CartItem[]): Promise<CartItem[]> {
    return Promise.all(items.map(async (item) => {
      if (isDefaultCartVariant(item)) return item;

      try {
        const variants = await getProductVariantBySku(item.sku);
        const variant = variants.find((candidate) => candidate.id === item.id);
        return variant?.attributes?.length ? { ...item, attributes: variant.attributes } : item;
      } catch {
        return item;
      }
    }));
  }

  async function hydrateCart(items: CartItem[]): Promise<CartItem[]> {
    const availableItems = await enrichCartAvailability(items);
    return enrichCartAttributes(availableItems);
  }

  useEffect(() => {
    listPublicCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      const loadGuestCart = readGuestCartToken() ? getGuestCart() : Promise.resolve(readGuestCart());
      loadGuestCart
        .then(async (items) => {
          const hydratedGuestCart = await hydrateCart(items);
          saveGuestCart(hydratedGuestCart);
          setCart(hydratedGuestCart);
          onCartChange(hydratedGuestCart);
        })
        .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el carrito visitante"));
      return;
    }

    getCart()
      .then(async (items) => {
        const enrichedItems = await hydrateCart(items);
        setCart(enrichedItems);
        onCartChange(enrichedItems);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el carrito");
      });
  }, [isAuthenticated, onCartChange]);

  useEffect(() => {
    if (!products.length || !cart.length) return;
    void enrichCartAvailability(cart).then((enrichedItems) => {
      setCart(enrichedItems);
      onCartChange(enrichedItems);
    });
  }, [products]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    const filters: PublicCatalogFilters = {
      search,
      categoryId: categoryId ? Number(categoryId) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      available: availability === "" ? undefined : availability === "true",
      sortBy,
      sortDirection,
      page,
      pageSize: 12,
    };

    listPublicProducts(filters)
      .then((result) => {
        if (active) {
          setProducts(result.products);
          setPagination(result.pagination);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar los productos");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, categoryId, minPrice, maxPrice, availability, sortBy, sortDirection, page]);

  function resetToFirstPage<T extends string>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setCategoryId("");
    setMinPrice("");
    setMaxPrice("");
    setAvailability("");
    setSortBy("name");
    setSortDirection("asc");
    setPage(1);
  }

  async function addToCart(product: ProductCardData) {
    if (!isAuthenticated) {
      try {
        const nextCart = await addGuestCartItem(product.id);
        const hydratedGuestCart = await hydrateCart(nextCart);
        saveGuestCart(hydratedGuestCart);
        setCart(hydratedGuestCart);
        onCartChange(hydratedGuestCart);
        clearCouponState();
        setError("");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "No se pudo agregar el producto al carrito visitante");
      }
      return;
    }

    try {
      const nextCart = await addCartItem(product.id);
      const enrichedItems = await hydrateCart(nextCart);
      setCart(enrichedItems);
      onCartChange(enrichedItems);
      clearCouponState();
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo agregar el producto al carrito");
    }
  }

  async function changeQuantity(productId: number, quantity: number) {
    const item = cart.find((cartItem) => cartItem.id === productId);
    if (!item) return;

    if (item.availableQuantity !== undefined && quantity > item.availableQuantity) {
      setError(`Solo hay ${item.availableQuantity} unidad(es) disponible(s) de ${item.name}.`);
      return;
    }

    if (!isAuthenticated || item.saleItemId === undefined) {
      try {
        const nextCart = item.saleItemId === undefined
          ? cart.filter((cartItem) => cartItem.id !== productId)
          : quantity <= 0
            ? await removeGuestCartItem(item.saleItemId)
            : await updateGuestCartItem(item.saleItemId, quantity);
        const hydratedGuestCart = await hydrateCart(nextCart);
        saveGuestCart(hydratedGuestCart);
        setCart(hydratedGuestCart);
        onCartChange(hydratedGuestCart);
        clearCouponState();
        setError("");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el carrito visitante");
      }
      return;
    }

    try {
      const nextCart = quantity <= 0
        ? await removeCartItem(item.saleItemId)
        : await updateCartItem(item.saleItemId, quantity);
      const enrichedItems = await hydrateCart(nextCart);
      setCart(enrichedItems);
      onCartChange(enrichedItems);
      clearCouponState();
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el carrito");
    }
  }

  async function handleClearCart() {
    if (!isAuthenticated) {
      clearGuestCartBackend()
        .then(() => {
          clearGuestCart();
          setCart([]);
          onCartChange([]);
          clearCouponState();
          setError("");
        })
        .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "No se pudo limpiar el carrito visitante"));
      return;
    }

    try {
      const saleItemIds = cart
        .map((item) => item.saleItemId)
        .filter((saleItemId): saleItemId is number => saleItemId !== undefined);

      await clearCartItems(saleItemIds);
      setCart([]);
      onCartChange([]);
      clearCouponState();
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo limpiar el carrito");
    }
  }

  async function handleApplyCoupon() {
    if (!isAuthenticated) {
      await Swal.fire({ icon: "info", title: "Inicia sesión", text: "Debes iniciar sesión para aplicar un cupón.", confirmButtonColor: "#2f2eaa" });
      navigate("/login");
      return;
    }

    const result = await Swal.fire({
      title: "Aplicar cupón",
      input: "text",
      inputLabel: "Código del cupón",
      inputPlaceholder: "Ej. DESCUENTO10",
      showCancelButton: true,
      confirmButtonText: "Aplicar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2f2eaa",
      inputValidator: (value) => !value.trim() ? "Ingresa el código del cupón." : undefined,
    });
    if (!result.isConfirmed) return;

    try {
      const applied = await applyCoupon(String(result.value).trim().toUpperCase());
      setCouponCode(applied.couponCode);
      setCouponDiscount(Number(applied.discountAmount));
      await Swal.fire({ icon: "success", title: "Cupón aplicado", text: `Descuento aplicado: Q ${Number(applied.discountAmount).toFixed(2)}`, confirmButtonColor: "#2f2eaa" });
      setError("");
    } catch (requestError) {
      await Swal.fire({
        icon: "error",
        title: "No se pudo aplicar el cupón",
        text: requestError instanceof Error ? requestError.message : "No se pudo aplicar el cupón",
        confirmButtonColor: "#2f2eaa",
      });
    }
  }

  async function handleRemoveCoupon() {
    try {
      await removeCoupon();
      setCouponCode(null);
      setCouponDiscount(0);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo retirar el cupón");
    }
  }

  const cartSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartTotal = Math.max(0, cartSubtotal - couponDiscount);
  const canEditProducts = permissions.some((permission) => permission.feature === "CATALOG_PRODUCTS" && permission.enabled && permission.canEdit);

  return (
    <main className="min-h-screen bg-[#f7f7ff] text-[#0f172a]">
      <section className="mx-auto grid w-full max-w-none gap-8 px-0 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_380px]" id="products">
        <div>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#dc2626]">Catálogo</p>
              <h2 className="mt-2 text-3xl font-black text-[#0f172a] sm:text-4xl">Productos destacados</h2>
            </div>
            {canEditProducts && <button className="rounded-xl bg-[#2f2eaa] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#25248e]" onClick={() => navigate("/catalog/products/manage")} type="button">Editar productos</button>}
            <label className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-[#d9dcf4] bg-white px-4 py-3 text-[#64748b] shadow-sm">
              <span>⌕</span>
              <input className="w-full bg-transparent text-sm text-[#0f172a] outline-none" onChange={(event) => resetToFirstPage(setSearch, event.target.value)} placeholder="Buscar por nombre o SKU" value={search} />
            </label>
          </div>

          <div className="mt-6 grid gap-3 rounded-2xl border border-[#d9dcf4] bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="text-xs font-bold uppercase tracking-wide text-[#64748b]">Categoría<select className="field mt-1 w-full" onChange={(event) => resetToFirstPage(setCategoryId, event.target.value)} value={categoryId}><option value="">Todas</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="text-xs font-bold uppercase tracking-wide text-[#64748b]">Precio mínimo<input className="field mt-1 w-full" min="0" onChange={(event) => resetToFirstPage(setMinPrice, event.target.value)} placeholder="Q 0.00" type="number" value={minPrice} /></label>
            <label className="text-xs font-bold uppercase tracking-wide text-[#64748b]">Precio máximo<input className="field mt-1 w-full" min="0" onChange={(event) => resetToFirstPage(setMaxPrice, event.target.value)} placeholder="Q 0.00" type="number" value={maxPrice} /></label>
            <label className="text-xs font-bold uppercase tracking-wide text-[#64748b]">Disponibilidad<select className="field mt-1 w-full" onChange={(event) => resetToFirstPage(setAvailability, event.target.value as "" | "true" | "false")} value={availability}><option value="">Todas</option><option value="true">Disponibles</option><option value="false">Agotados</option></select></label>
            <label className="text-xs font-bold uppercase tracking-wide text-[#64748b]">Ordenar por<select className="field mt-1 w-full" onChange={(event) => { setSortBy(event.target.value as PublicCatalogFilters["sortBy"]); setPage(1); }} value={sortBy}><option value="name">Nombre</option><option value="price">Precio</option><option value="createdAt">Más recientes</option></select></label>
            <label className="text-xs font-bold uppercase tracking-wide text-[#64748b]">Dirección<select className="field mt-1 w-full" onChange={(event) => { setSortDirection(event.target.value as PublicCatalogFilters["sortDirection"]); setPage(1); }} value={sortDirection}><option value="asc">Ascendente</option><option value="desc">Descendente</option></select></label>
            <button className="self-end rounded-xl border border-[#d9dcf4] px-4 py-3 text-sm font-bold text-[#2f2eaa] transition hover:bg-[#eef0ff]" onClick={clearFilters} type="button">Borrar filtros</button>
          </div>

          {loading && <p className="py-20 text-center text-[#64748b]">Cargando productos...</p>}
          {error && <p className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>}
          {!loading && !error && <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {products.map((product) => <ProductCard directVariantMatch={Boolean(search.trim() && product.sku.trim().toLocaleLowerCase() === search.trim().toLocaleLowerCase())} key={product.id} onAdd={addToCart} product={product} />)}
          </div>}
          {!loading && !error && products.length === 0 && <p className="py-20 text-center text-[#64748b]">No encontramos productos con esos criterios.</p>}
          {!loading && !error && pagination.totalPages > 1 && <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d9dcf4] bg-white px-4 py-3 shadow-sm"><p className="text-sm text-[#64748b]">Mostrando página {pagination.page} de {pagination.totalPages} · {pagination.totalItems} resultados</p><div className="flex gap-2"><button className="rounded-lg border border-[#d9dcf4] px-4 py-2 text-sm font-bold text-[#2f2eaa] disabled:cursor-not-allowed disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Anterior</button><button className="rounded-lg bg-[#2f2eaa] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))} type="button">Siguiente</button></div></div>}
        </div>

        <aside className="flex h-fit flex-col rounded-2xl border border-[#d9dcf4] bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:min-h-[560px]">
          <div className="flex items-center justify-between border-b border-[#eef0ff] pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#dc2626]">Tu compra</p>
              <h2 className="mt-1 text-2xl font-black text-[#0f172a]">Carrito</h2>
            </div>
            <span className="rounded-full bg-[#eef0ff] px-3 py-1 text-sm font-bold text-[#2f2eaa]">{cart.reduce((total, item) => total + item.quantity, 0)}</span>
          </div>

          {cart.length === 0 ? (
            <div className="py-14 text-center text-[#64748b]">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f1ff] text-2xl">🛒</div>
              <p className="font-semibold">Tu carrito está vacío</p>
              <p className="mt-1 text-sm">Agrega productos para comenzar.</p>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-5">
                {cart.map((item) => (
                  <div className="flex" key={item.id}>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold leading-tight text-[#0f172a]">{item.name}</p>
                      {getCartVariantLines(item).map((line) => (
                        <p className="break-words text-xs font-medium leading-tight text-[#64748b]" key={line}>{line}</p>
                      ))}
                      <p className="mt-1 text-sm font-bold text-[#2f2eaa]">Q {item.price.toFixed(2)}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-[#d9dcf4]">
                          <button className="px-2 py-1 text-[#2f2eaa]" onClick={() => changeQuantity(item.id, item.quantity - 1)} type="button">−</button>
                          <span className="min-w-7 text-center text-sm font-bold">{item.quantity}</span>
                          <button
                            className="px-2 py-1 text-[#2f2eaa] disabled:cursor-not-allowed disabled:text-[#c7c9df]"
                            disabled={item.availableQuantity !== undefined && item.quantity >= item.availableQuantity}
                            onClick={() => changeQuantity(item.id, item.quantity + 1)}
                            title={item.availableQuantity !== undefined && item.quantity >= item.availableQuantity ? "Existencia máxima alcanzada" : "Aumentar cantidad"}
                            type="button"
                          >+</button>
                        </div>
                        <button className="text-xs font-semibold text-[#dc2626] hover:underline" onClick={() => changeQuantity(item.id, 0)} type="button">Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#eef0ff] pt-4">
                {couponCode ? <div className="mb-3 flex items-center justify-between rounded-lg bg-[#eef0ff] px-3 py-2 text-sm"><span><strong>Cupón {couponCode}</strong><br /><span className="text-[#2f2eaa]">Descuento: Q {couponDiscount.toFixed(2)}</span></span><button className="text-xs font-bold text-[#dc2626] hover:underline" onClick={() => void handleRemoveCoupon()} type="button">Quitar</button></div> : <button className="mb-3 w-full rounded-xl border border-[#d9dcf4] px-4 py-2 text-sm font-bold text-[#2f2eaa] transition hover:bg-[#eef0ff]" onClick={() => void handleApplyCoupon()} type="button">Aplicar cupón</button>}
                <div className="flex justify-between text-sm text-[#64748b]"><span>Subtotal</span><span>Q {cartSubtotal.toFixed(2)}</span></div>
                {couponDiscount > 0 && <div className="mt-1 flex justify-between text-sm text-emerald-700"><span>Descuento</span><span>- Q {couponDiscount.toFixed(2)}</span></div>}
                <div className="mt-2 flex justify-between text-lg font-black text-[#0f172a]"><span>Total</span><span className="text-[#2f2eaa]">Q {cartTotal.toFixed(2)}</span></div>
                <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
                  <button className="rounded-xl bg-[#2f2eaa] px-4 py-3 font-bold text-white transition hover:bg-[#25248e]" onClick={() => navigate("/checkout")} type="button">Continuar al pago</button>
                  <button aria-label="Limpiar carrito" className="rounded-xl border border-[#fecaca] px-4 py-3 text-[#dc2626] transition hover:bg-[#fef2f2]" onClick={handleClearCart} title="Limpiar carrito" type="button">🗑</button>
                </div>
              </div>
            </>
          )}
        </aside>
      </section>

    </main>
  );
}
