"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ImagePlus,
  ScanLine,
  UploadCloud,
} from "lucide-react";
import { type HeaderNavItemId } from "@/components/animated-header-nav";
import { LiveHeader } from "@/components/live-shopping-page";
import { liveShoppingCategories, liveShoppingEvents } from "@/lib/live-shopping-data";
import {
  createLiveShoppingInventoryProduct,
  type LiveInventoryMode,
  type LiveInventoryProduct,
  type LiveInventoryStatus,
} from "@/lib/live-shopping-inventory";
import { type LiveShoppingScheduledLive } from "@/lib/live-shopping-schedule";
import {
  readLiveShoppingInventoryFromApi,
  readLiveShoppingScheduleFromApi,
  writeLiveShoppingInventoryToApi,
} from "@/lib/state-api";

const deliveryProfiles = ["Expedition 48h", "Expedition 72h", "Remise en main propre", "Premium assuree"];
const dangerousGoodsOptions = ["Pas de matieres dangereuses", "Contient des piles", "Produit cosmetique", "Verification manuelle"];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 rounded-full border transition ${
        checked ? "border-[#2b6fff] bg-[#2b6fff]" : "border-black/10 bg-[#eef2f7]"
      }`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${checked ? "left-[30px]" : "left-1"}`} />
    </button>
  );
}

function PriceModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-4 py-3 text-[14px] font-semibold transition ${
        active ? "bg-[#101522] text-white" : "bg-[#f6f8fb] text-[#101522]"
      }`}
    >
      {label}
    </button>
  );
}

export function LiveShoppingProductCreatePage({
  productId = null,
}: {
  productId?: string | null;
}) {
  const router = useRouter();

  const [inventory, setInventory] = useState<LiveInventoryProduct[]>([]);
  const [scheduledLives, setScheduledLives] = useState<LiveShoppingScheduledLive[]>([]);
  const existingProduct = useMemo(
    () => (productId ? inventory.find((product) => product.id === productId) ?? null : null),
    [inventory, productId],
  );

  const [coverName, setCoverName] = useState<string | null>(existingProduct?.cover ? existingProduct.cover.split("/").pop() ?? null : null);
  const [categoryId, setCategoryId] = useState(existingProduct?.categoryId ?? "trading-card-games");
  const [title, setTitle] = useState(existingProduct?.title ?? "");
  const [description, setDescription] = useState(existingProduct?.description ?? "");
  const [quantity, setQuantity] = useState(existingProduct ? String(existingProduct.quantity) : "");
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [mode, setMode] = useState<LiveInventoryMode>(existingProduct?.mode ?? "fixed");
  const [price, setPrice] = useState(existingProduct ? String(existingProduct.price) : "");
  const [flashSale, setFlashSale] = useState(existingProduct?.flashSale ?? false);
  const [acceptOffers, setAcceptOffers] = useState(existingProduct?.acceptOffers ?? true);
  const [reserveForLive, setReserveForLive] = useState(existingProduct?.reserveForLive ?? false);
  const [selectedLive, setSelectedLive] = useState(existingProduct?.liveSlug ?? "");
  const [deliveryProfile, setDeliveryProfile] = useState(existingProduct?.deliveryProfile ?? deliveryProfiles[0]);
  const [dangerousGoods, setDangerousGoods] = useState(existingProduct?.dangerousGoods ?? dangerousGoodsOptions[0]);
  const [costPerItem, setCostPerItem] = useState(existingProduct?.costPerItem ?? "");
  const [sku, setSku] = useState(existingProduct?.sku ?? "");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const [nextInventory, nextSchedule] = await Promise.all([
        readLiveShoppingInventoryFromApi([]),
        readLiveShoppingScheduleFromApi([]),
      ]);

      if (!active) {
        return;
      }

      const resolvedInventory = nextInventory;
      setInventory(resolvedInventory);
      setScheduledLives(nextSchedule);

      if (!productId) {
        return;
      }

      const loadedProduct = resolvedInventory.find((product) => product.id === productId);

      if (!loadedProduct) {
        return;
      }

      setCoverName(loadedProduct.cover ? loadedProduct.cover.split("/").pop() ?? null : null);
      setCategoryId(loadedProduct.categoryId);
      setTitle(loadedProduct.title);
      setDescription(loadedProduct.description);
      setQuantity(String(loadedProduct.quantity));
      setMode(loadedProduct.mode);
      setPrice(String(loadedProduct.price));
      setFlashSale(loadedProduct.flashSale);
      setAcceptOffers(loadedProduct.acceptOffers);
      setReserveForLive(loadedProduct.reserveForLive);
      setSelectedLive(loadedProduct.liveSlug ?? "");
      setDeliveryProfile(loadedProduct.deliveryProfile);
      setDangerousGoods(loadedProduct.dangerousGoods);
      setCostPerItem(loadedProduct.costPerItem);
      setSku(loadedProduct.sku);
    })();

    return () => {
      active = false;
    };
  }, [productId]);

  const liveTargetOptions = useMemo(() => {
    const eventOptions = liveShoppingEvents.map((event) => ({
      value: event.slug,
      label: event.title,
    }));

    const scheduledOptions = scheduledLives.map((live) => {
      const date = live.liveDate || "date a confirmer";
      const time = live.liveTime || "--:--";
      return {
        value: `schedule:${live.id}`,
        label: `${live.title} (${date} ${time})`,
      };
    });

    const merged = [...scheduledOptions, ...eventOptions];
    const unique = new Map<string, { value: string; label: string }>();

    for (const item of merged) {
      if (!unique.has(item.value)) {
        unique.set(item.value, item);
      }
    }

    return [...unique.values()];
  }, [scheduledLives]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleNav = (item: HeaderNavItemId) => {
    if (item === "home") return router.push("/");
    if (item === "shop") return router.push("/marketplace");
    if (item === "watch") return router.push("/live-shopping");
    if (item === "search") return router.push("/live-shopping");
  };

  const handleSave = async (status: LiveInventoryStatus) => {
    if (!title.trim() || !price.trim() || !quantity.trim()) {
      setToast("Completer le titre, le prix et la quantite.");
      return;
    }

    const selectedCategory = liveShoppingCategories.find((category) => category.id === categoryId) ?? liveShoppingCategories[0];
    const draft = {
      title: title.trim(),
      categoryId,
      categoryLabel: selectedCategory.label,
      description: description.trim() || "Produit ajoute depuis l'inventaire live.",
      quantity: Number.parseInt(quantity, 10) || 0,
      price: Number.parseInt(price, 10) || 0,
      status,
      mode,
      currentBid: mode === "auction" ? Number.parseInt(price, 10) || 0 : null,
      bidIncrement: mode === "auction" ? Math.max(1, Math.round((Number.parseInt(price, 10) || 0) * 0.05)) : null,
      reserveForLive,
      liveSlug: reserveForLive ? selectedLive || null : null,
      flashSale,
      acceptOffers,
      cover: existingProduct?.cover ?? "/figma-assets/photo-feed/photo-grid-6.jpg",
      deliveryProfile,
      dangerousGoods,
      costPerItem: costPerItem.trim(),
      sku: sku.trim() || `LIVE-${Date.now()}`,
    };

    const next = existingProduct
      ? inventory.map((product) => (product.id === existingProduct.id ? { ...existingProduct, ...draft } : product))
      : [createLiveShoppingInventoryProduct(draft), ...inventory];

    setInventory(next);
    await writeLiveShoppingInventoryToApi(next);
    setToast(status === "draft" ? "Brouillon enregistre." : "Produit publie.");
    window.setTimeout(() => router.push("/live-shopping/inventory"), 700);
  };

  return (
      <div className="min-h-screen bg-white">
        <LiveHeader
          onNavClick={handleNav}
          onCreateClick={() => router.push("/live-shopping/schedule")}
          onNotificationsClick={() => setToast("Notifications live ouvertes.")}
          onMessagesClick={() => setToast("Messagerie live ouverte.")}
        />

      <section className="pt-[120px]">
        <div className="w-full px-8 pb-32">
          <div className="mb-10 flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/live-shopping/inventory")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#101522]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-[38px] font-medium tracking-[-0.04em] text-[#101522]">
              {existingProduct ? "Modifier un produit" : "Creer un produit"}
            </h1>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
            <div className="space-y-6">
              <div className="rounded-[10px] border border-black/8 bg-white p-7">
                <h2 className="text-[24px] font-medium tracking-[-0.03em] text-[#101522]">Medias</h2>
                <div className="mt-5 rounded-[10px] border border-dashed border-[#d6dfed] bg-[#fbfdff] px-6 py-10">
                  <label className="flex cursor-pointer flex-col items-center justify-center text-center">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(event) => setCoverName(event.target.files?.[0]?.name ?? null)}
                    />
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff] text-[#2b6fff]">
                      <ImagePlus className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-[18px] font-medium tracking-[-0.02em] text-[#101522]">Clique pour telecharger ou glisse ton media</p>
                    <p className="mt-2 text-[14px] leading-6 text-[#7a889b]">{coverName ?? "Commence par choisir la photo principale du produit."}</p>
                  </label>
                </div>
                <div className="mt-5 flex items-center justify-between rounded-[10px] border border-black/8 px-5 py-4">
                  <div className="flex items-start gap-4">
                    <UploadCloud className="mt-1 h-5 w-5 text-[#101522]" />
                    <div>
                      <p className="font-medium tracking-[-0.01em] text-[#101522]">Telechargement mobile</p>
                      <p className="mt-1 text-[14px] text-[#7a889b]">Telecharge des photos et des videos directement depuis ton telephone.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setToast("Envoi mobile active: scanne le QR pour televerser depuis ton telephone.")}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#101522] px-5 text-[14px] font-medium tracking-[-0.01em] text-white"
                  >
                    Essaie
                  </button>
                </div>
              </div>

              <div className="rounded-[10px] border border-black/8 bg-white p-7">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-[24px] font-medium tracking-[-0.03em] text-[#101522]">Details du produit</h2>
                  <button
                    type="button"
                    onClick={() => setToast("Scanner code-barres: pret a connecter au flux d inventaire.")}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-black/8 px-5 text-[14px] font-medium text-[#101522]"
                  >
                    <ScanLine className="h-4 w-4" />
                    Utiliser un code-barres
                  </button>
                </div>

                <p className="mb-4 text-[13px] font-medium text-[#7a889b]">Categories recentes</p>
                <div className="mb-5 flex flex-wrap gap-2">
                  {["Cartes Pokemon", "One Piece", "Selection premium"].map((tag) => (
                    <span key={tag} className="rounded-[10px] border border-[#d7e4f7] px-4 py-2 text-[13px] text-[#101522]">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <select
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                      className="h-14 w-full appearance-none rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none"
                    >
                      {liveShoppingCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0ba]" />
                  </div>

                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Titre *"
                    className="h-14 w-full rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none"
                  />

                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Description *"
                    className="h-36 w-full resize-none rounded-[10px] border border-black/10 px-4 py-4 text-[15px] text-[#101522] outline-none"
                  />

                  <input
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder="Quantite *"
                    inputMode="numeric"
                    className="h-14 w-full rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none"
                  />
                </div>
              </div>

              <div className="rounded-[10px] border border-black/8 bg-white p-7">
                <div className="flex items-start justify-between gap-8">
                  <div>
                    <h2 className="text-[24px] font-medium tracking-[-0.03em] text-[#101522]">Variantes</h2>
                    <p className="mt-2 text-[14px] leading-6 text-[#7a889b]">Ajoute differentes couleurs ou tailles, et des quantites pour ce produit.</p>
                  </div>
                  <Toggle checked={variantsEnabled} onChange={setVariantsEnabled} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[10px] border border-black/8 bg-white p-6">
                <h2 className="text-[24px] font-medium tracking-[-0.03em] text-[#101522]">Prix</h2>
                <div className="mt-5 flex rounded-full bg-[#f5f7fb] p-1">
                  <PriceModeButton active={mode === "fixed"} label="Achat immediat" onClick={() => setMode("fixed")} />
                  <PriceModeButton active={mode === "auction"} label="Vente aux encheres" onClick={() => setMode("auction")} />
                </div>
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder={mode === "auction" ? "Prix de depart en (EUR) *" : "Prix en (EUR) *"}
                  inputMode="numeric"
                  className="mt-5 h-14 w-full rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none"
                />

                <div className="mt-5 space-y-5">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="font-medium tracking-[-0.01em] text-[#101522]">Vente Flash</p>
                      <p className="mt-1 text-[14px] leading-6 text-[#7a889b]">Pour activer les ventes flash sur ce produit.</p>
                    </div>
                    <Toggle checked={flashSale} onChange={setFlashSale} />
                  </div>
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="font-medium tracking-[-0.01em] text-[#101522]">Accepter les offres</p>
                      <p className="mt-1 text-[14px] leading-6 text-[#7a889b]">Active cette option si tu souhaites accepter des offres en live ou en boutique.</p>
                    </div>
                    <Toggle checked={acceptOffers} onChange={setAcceptOffers} />
                  </div>
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="font-medium tracking-[-0.01em] text-[#101522]">Reserver pour le live</p>
                      <p className="mt-1 text-[14px] leading-6 text-[#7a889b]">Active cette option pour rendre ce produit achetable uniquement en live.</p>
                    </div>
                    <Toggle checked={reserveForLive} onChange={setReserveForLive} />
                  </div>
                </div>

                {reserveForLive ? (
                  <div className="relative mt-5">
                    <select
                      value={selectedLive}
                      onChange={(event) => setSelectedLive(event.target.value)}
                      className="h-14 w-full appearance-none rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none"
                    >
                      <option value="">Lives *</option>
                      {liveTargetOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0ba]" />
                  </div>
                ) : null}
              </div>

              <div className="rounded-[10px] border border-black/8 bg-white p-6">
                <h2 className="text-[24px] font-medium tracking-[-0.03em] text-[#101522]">Livraison</h2>
                <div className="mt-5 space-y-4">
                  <div className="relative">
                    <select
                      value={deliveryProfile}
                      onChange={(event) => setDeliveryProfile(event.target.value)}
                      className="h-14 w-full appearance-none rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none"
                    >
                      {deliveryProfiles.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0ba]" />
                  </div>
                  <div className="relative">
                    <select
                      value={dangerousGoods}
                      onChange={(event) => setDangerousGoods(event.target.value)}
                      className="h-14 w-full appearance-none rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none"
                    >
                      {dangerousGoodsOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0ba]" />
                  </div>
                  <p className="text-[13px] leading-6 text-[#7a889b]">
                    Les transporteurs imposent des restrictions sur les acheminements de certains produits. Garde cette information propre pour eviter des blocages.
                  </p>
                </div>
              </div>

              <div className="rounded-[10px] border border-black/8 bg-white p-6">
                <h2 className="text-[24px] font-medium tracking-[-0.03em] text-[#101522]">Champs facultatifs</h2>
                <div className="mt-5 space-y-4">
                  <input
                    value={costPerItem}
                    onChange={(event) => setCostPerItem(event.target.value)}
                    placeholder="Cout par article"
                    className="h-14 w-full rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none"
                  />
                  <input
                    value={sku}
                    onChange={(event) => setSku(event.target.value)}
                    placeholder="UGS"
                    className="h-14 w-full rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-[130] border-t border-black/8 bg-[rgba(255,255,255,0.96)] backdrop-blur-[12px]">
        <div className="flex w-full items-center justify-end gap-3 px-8 py-4">
          <button
            type="button"
            onClick={() => handleSave("draft")}
            className="inline-flex h-12 items-center justify-center rounded-[10px] border border-black/8 px-5 text-[14px] font-medium text-[#101522]"
          >
            Enregistrer le brouillon
          </button>
          <button
            type="button"
            onClick={() => router.push("/live-shopping/inventory")}
            className="inline-flex h-12 items-center justify-center rounded-[10px] px-5 text-[14px] font-medium text-[#101522]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => handleSave("active")}
            className="inline-flex h-12 items-center justify-center rounded-[10px] bg-[#2b6fff] px-5 text-[14px] font-semibold text-white"
          >
            Publier
          </button>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-24 right-8 z-[140] rounded-[10px] border border-black/8 bg-white px-4 py-3 text-[14px] font-medium text-[#101522] shadow-[0_14px_30px_rgba(16,21,34,0.12)]">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
