"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Tag, Trash2, Edit } from "lucide-react";

type VariantRow = { name: string; imageUrl: string };
type SpecRow = { label: string; value: string };

type ProductForm = {
  title: string;
  description: string;
  info: string;
  priceRupees: string;
  mrpRupees: string;
  brand: string;
  pack: string;
  optionLabel: string;
  imageUrls: string[];
  sizes: string[];
  colors: string[];
  variants: VariantRow[];
  specs: SpecRow[];
  inStock: boolean;
  storeCategory: string;
};

const CATEGORIES = ["ZONOFIT_COMMON", "PRODUCTS", "SPORTS_ACTIVITIES", "APPAREL_GEAR", "RECOVERY_WELLNESS"];

function emptyForm(): ProductForm {
  return {
    title: "",
    description: "",
    info: "",
    priceRupees: "",
    mrpRupees: "",
    brand: "",
    pack: "",
    optionLabel: "",
    imageUrls: [""],
    sizes: [""],
    colors: [""],
    variants: [{ name: "", imageUrl: "" }],
    specs: [{ label: "", value: "" }],
    inStock: true,
    storeCategory: "ZONOFIT_COMMON",
  };
}

function rupees(paise: unknown): string {
  const amount = Number(paise);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  const value = amount / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function asUrlList(value: unknown): string[] {
  let raw = value;
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => String(entry || "").trim()).filter((url) => url.startsWith("http") || url.startsWith("/"));
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://api.zonofit.com").replace(/\/$/, "");

/** Formats uploaded and external photo URLs so they resolve reliably across dev and production. */
function displayPhoto(url: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/uploads/")) return `${API_BASE}${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "";
}

function photosOf(item: { imageUrls?: unknown; imageUrl?: string }): string[] {
  const list = asUrlList(item.imageUrls).map(displayPhoto).filter(Boolean);
  const single = item.imageUrl ? displayPhoto(item.imageUrl) : "";
  if (single && !list.includes(single)) list.unshift(single);
  return list;
}

type ShopOrder = {
  id: string;
  quantity: number;
  totalPaise: number;
  creditsSpent: number;
  status: string;
  selectedSize?: string | null;
  selectedColor?: string | null;
  addressJson?: string | null;
  createdAt: string;
  item?: { title?: string; imageUrl?: string; imageUrls?: unknown };
  user?: { id?: string; name?: string | null; phone?: string | null; email?: string | null };
};

type OrderGroup = {
  id: string;
  createdAt: string;
  addressJson?: string | null;
  user?: ShopOrder["user"];
  lines: ShopOrder[];
  status: string;
};

type ShopTicket = {
  id: string;
  subject?: string;
  message?: string;
  status?: string;
  priority?: string;
  createdAt?: string;
  user?: { name?: string | null; email?: string | null } | null;
  gym?: { name?: string | null } | null;
};

type Desk = "orders" | "enquiries" | "products";
type OrderFilter = "ALL" | "PLACED" | "PROCESSING" | "COMPLETED" | "CANCELLED";

const SHOP_TICKET = /shop|order|marketplace|product|deliver|enquiry|inquiry/i;

function groupStatus(lines: ShopOrder[]): string {
  const statuses = lines.map((line) => (line.status || "PLACED").toUpperCase());
  if (statuses.some((status) => status === "ENQUIRY")) return "ENQUIRY";
  if (statuses.length > 0 && statuses.every((status) => status === "COMPLETED")) return "COMPLETED";
  if (statuses.length > 0 && statuses.every((status) => status === "CANCELLED")) return "CANCELLED";
  if (statuses.some((status) => status === "PROCESSING")) return "PROCESSING";
  return "PLACED";
}

function groupShopOrders(orders: ShopOrder[]): OrderGroup[] {
  const sorted = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const groups: OrderGroup[] = [];
  for (const order of sorted) {
    const last = groups[groups.length - 1];
    const userId = order.user?.id || "";
    const gap = last ? Math.abs(new Date(last.createdAt).getTime() - new Date(order.createdAt).getTime()) : Number.POSITIVE_INFINITY;
    const sameCheckout = Boolean(
      last &&
      userId &&
      userId === (last.user?.id || "") &&
      (last.addressJson || "") === (order.addressJson || "") &&
      gap < 8000,
    );
    if (last && sameCheckout) last.lines.push(order);
    else {
      groups.push({
        id: order.id,
        createdAt: order.createdAt,
        addressJson: order.addressJson,
        user: order.user,
        lines: [order],
        status: "PLACED",
      });
    }
  }
  return groups.map((group) => ({ ...group, status: groupStatus(group.lines) }));
}

function statusLabel(status: string): string {
  if (status === "PLACED") return "Placed";
  if (status === "PROCESSING") return "Processing";
  if (status === "COMPLETED") return "Completed";
  if (status === "ENQUIRY") return "Enquiry";
  if (status === "CANCELLED") return "Cancelled";
  return status;
}

function statusClass(status: string): string {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (status === "PROCESSING") return "bg-blue-50 text-blue-700";
  if (status === "ENQUIRY") return "bg-violet-50 text-violet-700";
  if (status === "CANCELLED") return "bg-gray-100 text-gray-500";
  return "bg-amber-50 text-amber-700";
}

function addressLines(value?: string | null): string {
  if (!value) return "No address saved";
  try {
    const address = JSON.parse(value) as Record<string, string>;
    const who = [address.fullName, address.phoneNumber ? `+91 ${address.phoneNumber}` : ""].filter(Boolean).join(" · ");
    const where = [address.flatHouse, address.areaStreet, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(", ");
    return [who, where].filter(Boolean).join(" — ");
  } catch {
    return "No address saved";
  }
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry || "")).filter(Boolean) : [];
}

export default function AdminMarketplacePage() {
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [tickets, setTickets] = useState<ShopTicket[]>([]);
  const [desk, setDesk] = useState<Desk>("orders");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("ALL");
  const [busyKey, setBusyKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<{ kind: "image" | "variant"; index: number } | null>(null);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/marketplace", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/marketplace/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/support", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data.tickets) ? data.tickets as ShopTicket[] : [];
      setTickets(list.filter((ticket) => SHOP_TICKET.test(`${ticket.subject || ""} ${ticket.message || ""}`)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchOrders();
    fetchTickets();
  }, []);

  const setGroupStatus = async (group: OrderGroup, status: string) => {
    const key = `${group.id}:${status}`;
    setBusyKey(key);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch("/api/admin/marketplace/orders/status", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: group.lines.map((line) => line.id), status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(typeof data.message === "string" ? data.message : "Could not update that order.");
        return;
      }
      await fetchOrders();
      if (status === "ENQUIRY") setDesk("enquiries");
    } catch (err) {
      console.error(err);
      alert("Could not update that order.");
    } finally {
      setBusyKey("");
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      await fetch(`/api/admin/support/${ticketId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      fetchTickets();
    } catch (err) {
      console.error(err);
      alert("Could not update that enquiry.");
    }
  };

  const setField = <K extends "title" | "description" | "info" | "priceRupees" | "mrpRupees" | "brand" | "pack" | "optionLabel" | "storeCategory" | "inStock">(
    name: K,
    value: ProductForm[K],
  ) => {
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const chooseImage = (kind: "image" | "variant", index: number) => {
    uploadTarget.current = { kind, index };
    fileRef.current?.click();
  };

  const onImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const target = uploadTarget.current;
    if (!file || !target) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/admin/marketplace/image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string") {
        throw new Error(typeof data.message === "string" ? data.message : "Could not upload that image.");
      }
      const url = data.url;
      setFormData((current) => {
        if (target.kind === "image") {
          const next = [...current.imageUrls];
          next[target.index] = url;
          return { ...current, imageUrls: next };
        }
        const next = [...current.variants];
        const row = next[target.index] || { name: "", imageUrl: "" };
        next[target.index] = { ...row, imageUrl: url };
        return { ...current, variants: next };
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const url = editItemId ? `/api/admin/marketplace/${editItemId}` : "/api/admin/marketplace";
      const method = editItemId ? "PUT" : "POST";
      const payload = {
        title: formData.title,
        description: formData.description,
        priceRupees: formData.priceRupees,
        inStock: formData.inStock,
        storeCategory: formData.storeCategory,
        imageUrls: formData.imageUrls.map((url) => url.trim()).filter(Boolean),
        sizes: formData.sizes.map((size) => size.trim()).filter(Boolean),
        colors: formData.colors.map((color) => color.trim()).filter(Boolean),
        brand: formData.brand,
        info: formData.info,
        pack: formData.pack,
        optionLabel: formData.optionLabel,
        mrpRupees: formData.mrpRupees,
        variants: formData.variants.filter((row) => row.name.trim()),
        specs: formData.specs.filter((row) => row.label.trim() && row.value.trim()),
      };

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Failed to save: " + (err.message || "Unknown error"));
        setSaving(false);
        return;
      }

      alert(editItemId ? "Marketplace item updated." : "Marketplace item added.");
      setShowForm(false);
      setEditItemId(null);
      setFormData(emptyForm());
      fetchItems();
    } catch (err) {
      console.error(err);
      alert("Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Delete this product? It will leave the shop.")) return;
    try {
      const token = localStorage.getItem("zonofit_portal_token");
      const res = await fetch(`/api/admin/marketplace/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Failed to delete: " + (err.message || "Unknown error"));
        return;
      }
      fetchItems();
    } catch (err) {
      console.error(err);
      alert("Failed to delete item.");
    }
  };

  const handleEditClick = (item: any) => {
    const photos = photosOf(item);
    const variants = Array.isArray(item.variants) ? item.variants : [];
    const specs = Array.isArray(item.specs) ? item.specs : [];
    const sizes = textList(item.sizes);
    const colors = textList(item.colors);
    setFormData({
      title: item.title || "",
      description: item.description || "",
      info: item.info || "",
      priceRupees: rupees(item.pricePaise),
      mrpRupees: rupees(item.mrpPaise),
      brand: item.brand || "",
      pack: item.pack || "",
      optionLabel: item.optionLabel || "",
      imageUrls: photos.length ? photos : [""],
      sizes: sizes.length ? sizes : [""],
      colors: colors.length ? colors : [""],
      variants: variants.length
        ? variants.map((row: VariantRow) => ({ name: row?.name || "", imageUrl: row?.imageUrl || "" }))
        : [{ name: "", imageUrl: "" }],
      specs: specs.length
        ? specs.map((row: SpecRow) => ({ label: row?.label || "", value: row?.value || "" }))
        : [{ label: "", value: "" }],
      inStock: item.inStock !== false,
      storeCategory: item.storeCategory || "ZONOFIT_COMMON",
    });
    setEditItemId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return <div className="p-8 text-gray-500 font-medium">Loading Marketplace...</div>;

  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black";
  const groups = groupShopOrders(orders);
  const orderGroups = groups.filter((group) => group.status !== "ENQUIRY");
  const enquiryGroups = groups.filter((group) => group.status === "ENQUIRY");
  const visibleOrders = orderGroups.filter((group) => orderFilter === "ALL" || group.status === orderFilter);
  const deskCopy = {
    orders: "Each card is one member checkout. Move it through placed, processing, and completed.",
    enquiries: "Orders a member needs help with, plus support messages about the shop.",
    products: "Add a product, or delete one. Only the name is required. The shop shows the fields you fill in.",
  }[desk];

  const renderGroup = (group: OrderGroup) => {
    const when = new Date(group.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
    const rupeesTotal = group.lines.reduce((sum, line) => sum + (line.totalPaise || 0), 0);
    const credits = group.lines.reduce((sum, line) => sum + (line.creditsSpent || 0), 0);
    const actions = [
      { status: "PROCESSING", label: "Mark processing" },
      { status: "COMPLETED", label: "Mark completed" },
      { status: "ENQUIRY", label: "Mark as enquiry" },
      { status: "PLACED", label: "Back to placed" },
      { status: "CANCELLED", label: "Cancel order" },
    ].filter((action) => action.status !== group.status);
    return (
      <article key={group.id} className="rounded-2xl border border-gray-100 bg-[#F6F8F5] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Order #{group.id.slice(0, 8).toUpperCase()}</p>
            <p className="mt-1 font-bold text-black">{group.user?.name || "Member"}</p>
            <p className="text-sm text-gray-600">
              {[group.user?.phone, group.user?.email].filter(Boolean).join(" · ") || "No phone or email"}
            </p>
          </div>
          <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-lg ${statusClass(group.status)}`}>{statusLabel(group.status)}</span>
        </div>
        <p className="text-sm text-gray-600 mt-3">{addressLines(group.addressJson)}</p>
        <div className="mt-3 space-y-2">
          {group.lines.map((line) => {
            const photo = photosOf(line.item || {})[0];
            const option = [line.selectedColor, line.selectedSize].filter(Boolean).join(" · ");
            return (
              <div key={line.id} className="flex gap-3 rounded-xl bg-white p-2">
                {photo ? (
                  <img src={photo} alt="" className="h-14 w-14 rounded-lg object-cover bg-gray-100 shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-gray-100 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-black">{line.item?.title || "Product"} × {line.quantity}</p>
                  {option ? <p className="text-xs text-gray-500 mt-0.5">{option}</p> : null}
                  <p className="text-xs font-bold text-gray-500 mt-1">₹{Math.round((line.totalPaise || 0) / 100)} · {line.creditsSpent || 0} credits</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs font-bold text-gray-500 mt-3">{when} · {group.lines.length} {group.lines.length === 1 ? "item" : "items"} · ₹{Math.round(rupeesTotal / 100)} · {credits} credits</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action) => {
            const key = `${group.id}:${action.status}`;
            const quiet = action.status === "CANCELLED" || action.status === "PLACED";
            return (
              <button
                key={action.status}
                type="button"
                disabled={busyKey === key}
                onClick={() => setGroupStatus(group, action.status)}
                className={`rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50 ${quiet ? "border border-gray-200 bg-white text-gray-700" : "bg-black text-white"}`}
              >
                {busyKey === key ? "Saving..." : action.label}
              </button>
            );
          })}
        </div>
      </article>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black">Marketplace</h1>
          <p className="text-gray-500 mt-1 text-sm">{deskCopy}</p>
        </div>
        {desk === "products" ? (
          <button
            onClick={() => {
              if (!showForm) {
                setEditItemId(null);
                setFormData(emptyForm());
              }
              setShowForm(!showForm);
            }}
            className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> {showForm ? "Cancel" : "Add Item"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { fetchOrders(); fetchTickets(); }}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-black"
          >
            Refresh
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["orders", "Orders", orderGroups.length],
          ["enquiries", "Enquiries", enquiryGroups.length + tickets.length],
          ["products", "Products", items.length],
        ] as const).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setDesk(id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${desk === id ? "bg-black text-white" : "bg-white text-gray-600 border border-gray-200"}`}
          >
            {label} <span className={desk === id ? "text-white/70" : "text-gray-400"}>{count}</span>
          </button>
        ))}
      </div>

      {desk === "orders" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {(["ALL", "PLACED", "PROCESSING", "COMPLETED", "CANCELLED"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setOrderFilter(filter)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold ${orderFilter === filter ? "bg-[#0C1F14] text-white" : "bg-gray-50 text-gray-600"}`}
              >
                {filter === "ALL" ? "All" : statusLabel(filter)}
              </button>
            ))}
          </div>
          {visibleOrders.length === 0 ? (
            <p className="text-sm text-gray-400">{orders.length === 0 ? "No shop orders yet." : "Nothing in this status."}</p>
          ) : (
            <div className="space-y-3">{visibleOrders.map(renderGroup)}</div>
          )}
        </div>
      )}

      {desk === "enquiries" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-black">Order enquiries</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">Mark an order as an enquiry when a member needs help with delivery, a product, or a payment in credits.</p>
            {enquiryGroups.length === 0 ? (
              <p className="text-sm text-gray-400">No order enquiries yet. Open Orders and choose Mark as enquiry.</p>
            ) : (
              <div className="space-y-3">{enquiryGroups.map(renderGroup)}</div>
            )}
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xl font-bold text-black">Support messages</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">Tickets whose subject or message mentions the shop, an order, a product, or delivery.</p>
            {tickets.length === 0 ? (
              <p className="text-sm text-gray-400">No shop support messages yet.</p>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-black">{ticket.subject || "Support message"}</p>
                        <p className="text-xs text-gray-500 mt-1">#{ticket.id.slice(0, 8).toUpperCase()} · {ticket.user?.name || ticket.gym?.name || "Member"}{ticket.priority ? ` · ${ticket.priority}` : ""}</p>
                      </div>
                      <select
                        value={ticket.status || "OPEN"}
                        onChange={(event) => updateTicketStatus(ticket.id, event.target.value)}
                        className="bg-gray-50 border border-gray-200 text-sm font-bold rounded-lg p-2"
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>
                    {ticket.message ? <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{ticket.message}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {desk === "products" && showForm && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-black mb-1">{editItemId ? "Edit Item" : "Add New Item"}</h2>
          <p className="text-sm text-gray-500 mb-4">Leave a box empty when the product does not need it. Paste image links. Several images are allowed.</p>
          <form onSubmit={handleCreateItem} className="space-y-4 max-w-3xl">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Name</label>
              <input type="text" required value={formData.title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. Premium Protein Shaker" className={inputClass} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Price (₹) <span className="font-medium text-gray-400">optional</span></label>
                <input type="number" min="0" step="0.01" value={formData.priceRupees} onChange={(e) => setField("priceRupees", e.target.value)} placeholder="299" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Compare-at price (₹) <span className="font-medium text-gray-400">optional</span></label>
                <input type="number" min="0" step="0.01" value={formData.mrpRupees} onChange={(e) => setField("mrpRupees", e.target.value)} placeholder="399" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Brand <span className="font-medium text-gray-400">optional</span></label>
                <input type="text" value={formData.brand} onChange={(e) => setField("brand", e.target.value)} placeholder="MuscleBlaze" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Pack or size label <span className="font-medium text-gray-400">optional</span></label>
                <input type="text" value={formData.pack} onChange={(e) => setField("pack", e.target.value)} placeholder="1 kg, 700 ml, Pair" className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">Images <span className="font-medium text-gray-400">optional</span></label>
              <p className="text-sm text-gray-500 mb-2">Upload a JPEG, PNG, or WebP from your computer, or paste a direct picture address. A Google Drive share link does not work. Leave this blank and the product still appears without a photo.</p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onImageFile} />
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.imageUrls.filter((url) => url.trim().startsWith("http") || url.trim().startsWith("/")).map((url, i) => {
                  const resolved = displayPhoto(url);
                  return (
                    <div key={`${url}-${i}`} className="relative h-20 w-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      <img
                        src={resolved}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                          const fallback = e.currentTarget.parentElement?.querySelector(".img-fallback");
                          if (fallback) (fallback as HTMLElement).style.display = "flex";
                        }}
                      />
                      <div className="img-fallback hidden absolute inset-0 flex-col items-center justify-center p-1 bg-amber-50 text-amber-800 text-[10px] text-center font-bold">
                        <span>404 or Missing</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                {formData.imageUrls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const next = [...formData.imageUrls];
                        next[index] = e.target.value;
                        setFormData({ ...formData, imageUrls: next });
                      }}
                      placeholder="https://example.com/photo.jpg"
                      className={inputClass}
                    />
                    <button type="button" disabled={uploading} onClick={() => chooseImage("image", index)} className="shrink-0 rounded-xl border border-gray-200 px-3 text-sm font-bold text-black disabled:text-gray-400">
                      {uploading ? "Uploading" : "Upload"}
                    </button>
                    {formData.imageUrls.length > 1 && (
                      <button type="button" onClick={() => setFormData({ ...formData, imageUrls: formData.imageUrls.filter((_, i) => i !== index) })} className="px-3 text-gray-400 hover:text-red-500">Remove</button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setFormData({ ...formData, imageUrls: [...formData.imageUrls, ""] })} className="mt-2 text-sm font-bold text-emerald-700">Add another image</button>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">Description <span className="font-medium text-gray-400">optional</span></label>
              <textarea value={formData.description} onChange={(e) => setField("description", e.target.value)} placeholder="What the buyer should know" className={`${inputClass} min-h-[90px]`} />
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Info <span className="font-medium text-gray-400">optional</span></label>
              <textarea value={formData.info} onChange={(e) => setField("info", e.target.value)} placeholder="Use, care, ingredients, or anything else" className={`${inputClass} min-h-[80px]`} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Sizes <span className="font-medium text-gray-400">optional, one box each</span></label>
                <div className="space-y-2">
                  {formData.sizes.map((size, index) => (
                    <div key={index} className="flex gap-2">
                      <input type="text" value={size} onChange={(e) => {
                        const next = [...formData.sizes];
                        next[index] = e.target.value;
                        setFormData({ ...formData, sizes: next });
                      }} placeholder="S, M, 1 kg, or any size" className={inputClass} />
                      {formData.sizes.length > 1 && (
                        <button type="button" onClick={() => setFormData({ ...formData, sizes: formData.sizes.filter((_, i) => i !== index) })} className="px-3 text-gray-400 hover:text-red-500">Remove</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setFormData({ ...formData, sizes: [...formData.sizes, ""] })} className="mt-2 text-sm font-bold text-emerald-700">Add a size</button>
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Colours <span className="font-medium text-gray-400">optional, one box each</span></label>
                <div className="space-y-2">
                  {formData.colors.map((color, index) => (
                    <div key={index} className="flex gap-2">
                      <input type="text" value={color} onChange={(e) => {
                        const next = [...formData.colors];
                        next[index] = e.target.value;
                        setFormData({ ...formData, colors: next });
                      }} placeholder="Black, Grey, or any colour" className={inputClass} />
                      {formData.colors.length > 1 && (
                        <button type="button" onClick={() => setFormData({ ...formData, colors: formData.colors.filter((_, i) => i !== index) })} className="px-3 text-gray-400 hover:text-red-500">Remove</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setFormData({ ...formData, colors: [...formData.colors, ""] })} className="mt-2 text-sm font-bold text-emerald-700">Add a colour</button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">Variant name <span className="font-medium text-gray-400">optional, for flavour, weight, or any other choice</span></label>
              <input type="text" value={formData.optionLabel} onChange={(e) => setField("optionLabel", e.target.value)} placeholder="Flavour, Weight, Colour, or any word you want" className={inputClass} />
              <div className="mt-3 space-y-2">
                {formData.variants.map((row, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                    <input type="text" value={row.name} onChange={(e) => {
                      const next = [...formData.variants];
                      next[index] = { ...row, name: e.target.value };
                      setFormData({ ...formData, variants: next });
                    }} placeholder="Variant, e.g. Chocolate" className={inputClass} />
                    <div className="flex gap-2">
                      <input type="url" value={row.imageUrl} onChange={(e) => {
                        const next = [...formData.variants];
                        next[index] = { ...row, imageUrl: e.target.value };
                        setFormData({ ...formData, variants: next });
                      }} placeholder="Image for this variant, optional" className={inputClass} />
                      <button type="button" disabled={uploading} onClick={() => chooseImage("variant", index)} className="shrink-0 rounded-xl border border-gray-200 px-3 text-sm font-bold text-black disabled:text-gray-400">
                        {uploading ? "Uploading" : "Upload"}
                      </button>
                    </div>
                    <button type="button" onClick={() => setFormData({ ...formData, variants: formData.variants.filter((_, i) => i !== index).concat(formData.variants.length === 1 ? [{ name: "", imageUrl: "" }] : []) })} className="text-sm text-gray-400 hover:text-red-500">Remove</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setFormData({ ...formData, variants: [...formData.variants, { name: "", imageUrl: "" }] })} className="mt-2 text-sm font-bold text-emerald-700">Add a variant</button>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">Extra fields <span className="font-medium text-gray-400">optional, each one is its own label and value</span></label>
              <div className="space-y-2">
                {formData.specs.map((row, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                    <input type="text" value={row.label} onChange={(e) => {
                      const next = [...formData.specs];
                      next[index] = { ...row, label: e.target.value };
                      setFormData({ ...formData, specs: next });
                    }} placeholder="Label, e.g. Material" className={inputClass} />
                    <input type="text" value={row.value} onChange={(e) => {
                      const next = [...formData.specs];
                      next[index] = { ...row, value: e.target.value };
                      setFormData({ ...formData, specs: next });
                    }} placeholder="Value" className={inputClass} />
                    <button type="button" onClick={() => setFormData({ ...formData, specs: formData.specs.filter((_, i) => i !== index).concat(formData.specs.length === 1 ? [{ label: "", value: "" }] : []) })} className="text-sm text-gray-400 hover:text-red-500">Remove</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setFormData({ ...formData, specs: [...formData.specs, { label: "", value: "" }] })} className="mt-2 text-sm font-bold text-emerald-700">Add a detail</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Store category <span className="font-medium text-gray-400">optional</span></label>
                <select value={formData.storeCategory} onChange={(e) => setField("storeCategory", e.target.value)} className={inputClass}>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-black pb-3">
                <input type="checkbox" checked={formData.inStock} onChange={(e) => setField("inStock", e.target.checked)} />
                In stock
              </label>
            </div>

            <button type="submit" disabled={saving} className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              <Tag size={18} /> {saving ? "Saving..." : "Save Item"}
            </button>
          </form>
        </div>
      )}

      {desk === "products" && (<>
      <div className="flex items-center gap-2 overflow-x-auto pb-4">
        {["ALL", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filterCategory === cat ? "bg-black text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
          >
            {cat === "ALL" ? "All Items" : cat.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.filter((item) => filterCategory === "ALL" || item.storeCategory === filterCategory).map((item) => {
          const photos = photosOf(item);
          const sizes = textList(item.sizes);
          const colors = textList(item.colors);
          const variants = Array.isArray(item.variants) ? item.variants.map((row: VariantRow) => row?.name).filter(Boolean) : [];
          const specs = Array.isArray(item.specs) ? item.specs.filter((row: SpecRow) => row?.label && row?.value) : [];
          return (
            <div key={item.id} className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
              {photos[0] ? (
                <img src={photos[0]} alt={item.title} className="h-48 w-full object-cover bg-gray-100" />
              ) : (
                <div className="h-48 w-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">No image yet</div>
              )}
              {photos.length > 1 && (
                <div className="flex gap-2 px-4 pt-3">
                  {photos.slice(1, 5).map((url) => (
                    <img key={url} src={url} alt="" className="h-12 w-12 rounded-lg object-cover bg-gray-100 border border-gray-200" />
                  ))}
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                      {item.storeCategory?.replace(/_/g, " ")}
                    </span>
                    <h3 className="font-bold text-lg text-black">{item.title}</h3>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 font-bold text-sm px-2 py-1 rounded-lg">
                    {item.pricePaise > 0 ? `₹${(item.pricePaise / 100).toFixed(0)}` : "No price"}
                  </span>
                </div>
                {item.brand ? <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{item.brand}</p> : null}
                {item.description ? <p className="text-sm text-gray-500 flex-1 mt-1">{item.description}</p> : <div className="flex-1" />}
                {item.info ? <p className="text-xs text-gray-500 mt-2">{item.info}</p> : null}
                {item.pack ? <p className="text-xs text-gray-600 mt-2">Pack: {item.pack}</p> : null}
                {(colors.length > 0 || sizes.length > 0 || variants.length > 0 || specs.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                    {colors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Colour:</span>
                        {colors.map((color: string) => (
                          <span key={color} className="text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-semibold border border-purple-100">{color}</span>
                        ))}
                      </div>
                    )}
                    {sizes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Size:</span>
                        {sizes.map((size: string) => (
                          <span key={size} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold border border-blue-100">{size}</span>
                        ))}
                      </div>
                    )}
                    {variants.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">{item.optionLabel || "Variant"}:</span>
                        {variants.map((name: string) => (
                          <span key={name} className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold border border-emerald-100">{name}</span>
                        ))}
                      </div>
                    )}
                    {specs.map((row: SpecRow) => (
                      <p key={`${row.label}-${row.value}`} className="text-xs text-gray-600"><span className="font-bold">{row.label}:</span> {row.value}</p>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${item.inStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {item.inStock ? "In Stock" : "Out of Stock"}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditClick(item)} className="text-gray-400 hover:text-black p-1"><Edit size={16} /></button>
                    <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {items.filter((item) => filterCategory === "ALL" || item.storeCategory === filterCategory).length === 0 && (
          <div className="col-span-full p-12 text-center text-gray-400 font-medium bg-white rounded-3xl border border-dashed border-gray-200">
            No marketplace items found in this category.
          </div>
        )}
      </div>
      </>)}
    </div>
  );
}
