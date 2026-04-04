"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Package2, Search, UploadCloud } from "lucide-react";
import { type HeaderNavItemId } from "@/components/animated-header-nav";
import { LiveHeader } from "@/components/live-shopping-page";
import {
  type LiveInventoryProduct,
  type LiveInventoryStatus,
} from "@/lib/live-shopping-inventory";
import { readLiveShoppingInventoryFromApi } from "@/lib/state-api";

const inventoryTabs: Array<{ id: LiveInventoryStatus; label: string }> = [
  { id: "active", label: "Actif" },
  { id: "draft", label: "Brouillons" },
  { id: "inactive", label: "Inactif" },
];

function count(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function euros(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export function LiveShoppingInventoryPage() {
  const router = useRouter();
  const [status, setStatus] = useState<LiveInventoryStatus>("active");
  const [search, setSearch] = useState("");
  const [bulkEdit, setBulkEdit] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [products, setProducts] = useState<LiveInventoryProduct[]>([]);

  useEffect(() => {
    let active = true;

    const syncInventory = async () => {
      const next = await readLiveShoppingInventoryFromApi([]);

      if (!active) {
        return;
      }

      setProducts(next);
    };

    void syncInventory();

    const handleFocus = () => {
      void syncInventory();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleNav = (item: HeaderNavItemId) => {
    if (item === "home") return router.push("/");
    if (item === "shop") return router.push("/marketplace");
    if (item === "watch") return router.push("/live-shopping");
    if (item === "search") return router.push("/live-shopping");
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (product.status !== status) return false;
      if (!query) return true;
      return `${product.title} ${product.categoryLabel} ${product.sku}`.toLowerCase().includes(query);
    });
  }, [products, search, status]);

  return (
      <div className="min-h-screen bg-white">
        <LiveHeader
          onNavClick={handleNav}
          onCreateClick={() => router.push("/live-shopping/schedule")}
          onNotificationsClick={() => setToast("Notifications live ouvertes.")}
          onMessagesClick={() => setToast("Messagerie live ouverte.")}
        />

      <section className="pt-[120px]">
        <div className="w-full px-8 pb-20">
          <div className="mb-12 flex items-start justify-between gap-6">
            <div>
              <h1 className="text-[38px] font-medium tracking-[-0.04em] text-[#101522]">Inventaire</h1>
              <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-[#66768c]">
                Gere les produits que tu mets en avant pendant les lives, garde tes brouillons au propre et reserve certains lots pour les ventes live.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setToast("Import medias: connecte au mobile et au cloud.")}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white text-[#101522]"
              >
                <UploadCloud className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/live-shopping/inventory/new")}
                className="inline-flex h-11 items-center justify-center rounded-[10px] bg-[#2b6fff] px-5 text-[14px] font-medium tracking-[-0.01em] text-white"
              >
                Creer un produit
              </button>
            </div>
          </div>

          <div className="mb-8 flex items-center justify-between gap-8">
            <div className="flex items-center gap-7">
              {inventoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatus(tab.id)}
                  className={`relative pb-3 text-[16px] transition ${
                    status === tab.id ? "font-semibold text-[#101522]" : "text-[#7a889b]"
                  }`}
                >
                  {tab.label}
                  {status === tab.id ? <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#2b6fff]" /> : null}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-5">
              <label className="flex items-center gap-3 text-[14px] text-[#101522]">
                Modification groupee
                <button
                  type="button"
                  aria-pressed={bulkEdit}
                  onClick={() => setBulkEdit((value) => !value)}
                  className={`relative h-8 w-14 rounded-full border transition ${
                    bulkEdit ? "border-[#2b6fff] bg-[#2b6fff]" : "border-black/10 bg-[#eef2f7]"
                  }`}
                >
                  <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${bulkEdit ? "left-[30px]" : "left-1"}`} />
                </button>
              </label>
              <div className="relative w-[230px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0ba]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher des produits"
                  className="h-[46px] w-full rounded-full border border-black/8 bg-white pl-11 pr-4 text-[14px] text-[#101522] outline-none placeholder:text-[#8ea0ba]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[10px] border border-black/8 bg-white">
            <div className="grid grid-cols-[44px_1.6fr_1.1fr_0.9fr_1fr_0.8fr_0.8fr_0.8fr] gap-4 border-b border-black/6 px-6 py-5 text-[14px] font-medium text-[#101522]">
              <div className="flex items-center">
                <div className="h-5 w-5 rounded-[6px] border border-black/10" />
              </div>
              <div>Produit</div>
              <div className="inline-flex items-center gap-1">Categorie <ChevronDown className="h-3.5 w-3.5 text-[#8ea0ba]" /></div>
              <div className="inline-flex items-center gap-1">Quantite <ChevronDown className="h-3.5 w-3.5 text-[#8ea0ba]" /></div>
              <div className="inline-flex items-center gap-1">Prix et format <ChevronDown className="h-3.5 w-3.5 text-[#8ea0ba]" /></div>
              <div>Etat</div>
              <div>A la une</div>
              <div>Actions</div>
            </div>

            {filteredProducts.length ? (
              <div className="divide-y divide-black/6">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="grid grid-cols-[44px_1.6fr_1.1fr_0.9fr_1fr_0.8fr_0.8fr_0.8fr] gap-4 px-6 py-5 text-[14px] text-[#101522]">
                    <div className="flex items-center">
                      <div className="h-5 w-5 rounded-[6px] border border-black/10" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative h-14 w-14 overflow-hidden rounded-[10px] bg-[#f2f5fa]">
                        <Image src={product.cover} alt={product.title} fill sizes="56px" className="object-cover" />
                      </div>
                      <div>
                        <p className="font-medium tracking-[-0.01em] text-[#101522]">{product.title}</p>
                        <p className="mt-1 text-[13px] text-[#7a889b]">{product.sku}</p>
                      </div>
                    </div>
                    <div className="flex items-center">{product.categoryLabel}</div>
                    <div className="flex items-center">{count(product.quantity)}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium tracking-[-0.01em]">{euros(product.price)}</span>
                      <span className="text-[#7a889b]">{product.mode === "auction" ? "Enchere" : "Direct"}</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${
                        product.status === "active"
                          ? "bg-[#ecf8f1] text-[#198754]"
                          : product.status === "draft"
                            ? "bg-[#fff7e8] text-[#b67817]"
                            : "bg-[#f0f3f7] text-[#6e7a8a]"
                      }`}>
                        {product.status === "active" ? "Actif" : product.status === "draft" ? "Brouillon" : "Inactif"}
                      </span>
                    </div>
                    <div className="flex items-center">{product.reserveForLive ? "Oui" : "Non"}</div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => router.push(`/live-shopping/inventory/new?product=${product.id}`)}
                        className="rounded-[10px] border border-black/8 px-3 py-2 text-[13px] font-medium text-[#101522]"
                      >
                        Editer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-[#101522] text-white">
                  <Package2 className="h-7 w-7" />
                </div>
                <p className="mt-5 text-[20px] font-medium tracking-[-0.02em] text-[#101522]">Il n&apos;y a rien ici pour le moment.</p>
                <p className="mt-2 max-w-[420px] text-[14px] leading-6 text-[#7a889b]">
                  Cree ton premier produit pour le reserver ensuite a un live ou l&apos;ajouter a ta boutique en direct.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/live-shopping/inventory/new")}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-[10px] bg-[#2b6fff] px-5 text-[14px] font-medium tracking-[-0.01em] text-white"
                >
                  Creer un produit
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[200] rounded-[10px] border border-[#d9e3f3] bg-white px-4 py-3 text-[14px] font-medium text-[#101522] shadow-[0_18px_42px_rgba(8,12,24,0.12)]">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
