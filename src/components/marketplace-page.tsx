"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Search as SearchIcon,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { AnimatedHeaderNav, type HeaderNavItemId } from "@/components/animated-header-nav";
import {
  createInitialGigCreationDraft,
  MarketplaceGigCreator,
  type GigCreationDraft,
  type GigCreationPackageDraft,
} from "@/components/marketplace-gig-creator";
import {
  type GigPackage,
  type HeaderPanelId,
  type MarketplaceView,
  type PaymentMethod,
  type ProjectOrder,
  type ServiceGig,
  getMarketplaceGigHref,
  projectStages,
  seedOrders,
  sellerPulse,
  serviceCategories,
  serviceGigs,
  topCreateOptions,
  topMessages,
  topNotifications,
} from "@/lib/marketplace-data";
import { readMarketplaceOrdersFromApi, writeMarketplaceOrdersToApi } from "@/lib/state-api";
import {
  type MarketplaceDiscoverSort,
  type MarketplaceFilterId,
  type SellerAnalyticsRange,
  discoverSortOptions,
  marketplaceFilterDefinitions,
  marketplacePreferencesDefaults,
  sellerAnalyticsRangeOptions,
} from "@/lib/user-preferences";
import {
  readMarketplacePreferencesFromApi,
  writeMarketplacePreferencesToApi,
} from "@/lib/preferences-api";

type CheckoutState = {
  gigId: number;
  packageId: string;
};

type SellerDraftGig = {
  id: number;
  serviceGig: ServiceGig;
  draft: GigCreationDraft;
  statusLabel: string;
  helper: string;
};

type SellerGigDashboardStatus = "active" | "pending" | "modification" | "draft" | "denied" | "paused";

type SellerGigDashboardRow = {
  id: string;
  gig: ServiceGig;
  source: "seed" | "draft";
  status: SellerGigDashboardStatus;
  impressions: number;
  clicks: number;
  orders: number;
  cancellations: string;
};

type MarketplaceTrack = {
  id: string;
  label: string;
  iconSrc: string;
  matches: string[];
};

type DiscoverCard = {
  id: string;
  gigId: number;
  cover: string;
  title: string;
  seller: string;
  handle: string;
  avatar: string;
  price: number;
  timelikeTrust: number;
  level: string;
  delivery: string;
  track: string;
};

const marketplaceTracks: MarketplaceTrack[] = [
  { id: "programming", label: "Programming", iconSrc: "/marketplace-icons/categories-icon-1.svg", matches: ["No-code", "Strategy"] },
  { id: "data", label: "Data", iconSrc: "/marketplace-icons/categories-icon-2.svg", matches: ["Strategy"] },
  { id: "cyber", label: "Cyber Security", iconSrc: "/marketplace-icons/categories-icon-3.svg", matches: ["Strategy"] },
  { id: "ia", label: "IA", iconSrc: "/marketplace-icons/categories-icon-4.svg", matches: ["Strategy", "Motion"] },
  { id: "design", label: "Design", iconSrc: "/marketplace-icons/categories-icon-5.svg", matches: ["Design", "Branding", "Motion"] },
  { id: "video", label: "Video", iconSrc: "/marketplace-icons/categories-icon-6.svg", matches: ["Video", "Motion"] },
  { id: "music", label: "Music", iconSrc: "/marketplace-icons/categories-icon-7.svg", matches: ["Audio"] },
  { id: "marketing", label: "Marketing", iconSrc: "/marketplace-icons/categories-icon-8.svg", matches: ["Strategy", "Branding"] },
  { id: "writing", label: "Writing", iconSrc: "/marketplace-icons/categories-icon-9.svg", matches: ["Strategy"] },
  { id: "business", label: "Business", iconSrc: "/marketplace-icons/categories-icon-10.svg", matches: ["Branding", "Strategy"] },
  { id: "photography", label: "Photography", iconSrc: "/marketplace-icons/categories-icon-11.svg", matches: ["Design"] },
  { id: "lifestyle", label: "Lifestyle", iconSrc: "/marketplace-icons/categories-icon-12.svg", matches: ["Branding"] },
  { id: "influencer", label: "Influencer", iconSrc: "/marketplace-icons/categories-icon-13.svg", matches: ["Motion", "Strategy"] },
  { id: "trending", label: "Trending", iconSrc: "/marketplace-icons/categories-icon-14.svg", matches: [] },
];

/* const marketplaceFilterDefinitions: MarketplaceFilterDefinition[] = [
  {
    id: "subcategory",
    label: "Subcategory",
    options: ["All", "Design", "Branding", "Motion", "Video", "Audio", "Strategy", "No-code"],
  },
  {
    id: "budget",
    label: "Budget",
    options: ["All", "Jusqu a 200 €", "200 € - 400 €", "400 € - 700 €", "700 € et +"],
  },
  {
    id: "delivery",
    label: "Delivery time",
    options: ["All", "24 h", "3 jours", "5 jours", "6 jours et +"],
  },
  {
    id: "location",
    label: "Location",
    options: ["All", "France", "Belgique", "Suisse", "Canada", "Remote"],
  },
  {
    id: "level",
    label: "Level",
    options: ["All", "Top retenu", "Seller pro", "Motion expert", "Audio lab", "Business clarity"],
  },
  {
    id: "speaks",
    label: "Speaks",
    options: ["All", "FR", "EN", "ES"],
  },
];

const discoverSortOptions: { id: DiscoverSort; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "price-asc", label: "Prix croissant" },
  { id: "price-desc", label: "Prix decroissant" },
  { id: "trust-desc", label: "TimeLike Trust" },
  { id: "delivery-fast", label: "Livraison la plus rapide" },
];

const sellerAnalyticsRangeOptions: { id: SellerAnalyticsRange; label: string; multiplier: number }[] = [
  { id: "7d", label: "Last 7 days", multiplier: 0.34 },
  { id: "30d", label: "Last 30 days", multiplier: 1 },
  { id: "90d", label: "Last 90 days", multiplier: 2.45 },
];

*/
const discoverSellerMeta: Record<string, { location: "France" | "Belgique" | "Suisse" | "Canada" | "Remote"; speaks: string[] }> = {
  "Axel Belujon Studio": { location: "France", speaks: ["FR", "EN"] },
  "Pictomag News Lab": { location: "Belgique", speaks: ["FR", "EN"] },
  "Studio Heat": { location: "Canada", speaks: ["EN", "FR"] },
  "Neon Driver Audio": { location: "Suisse", speaks: ["EN", "FR"] },
};

const sellerGigStatusTabs: { id: SellerGigDashboardStatus; label: string }[] = [
  { id: "active", label: "ACTIVE" },
  { id: "pending", label: "PENDING APPROVAL" },
  { id: "modification", label: "REQUIRES MODIFICATION" },
  { id: "draft", label: "DRAFT" },
  { id: "denied", label: "DENIED" },
  { id: "paused", label: "PAUSED" },
];

const discoverCards: DiscoverCard[] = [
  {
    id: "card-1",
    gigId: 1,
    cover: "/figma-assets/photo-feed/photo-grid-6.jpg",
    title: "Je construis un hero premium et une vitrine services qui convertit vraiment",
    seller: "Axel Belujon Studio",
    handle: "@axelbelujon",
    avatar: "/figma-assets/avatar-post.png",
    price: 240,
    timelikeTrust: 96,
    level: "Top retenu",
    delivery: "3 jours",
    track: "design",
  },
  {
    id: "card-2",
    gigId: 3,
    cover: "/figma-assets/photo-feed/photo-grid-8.jpg",
    title: "Je clarifie ton offre et je redesign ta page service en mode premium",
    seller: "Pictomag News Lab",
    handle: "@pictomag.news",
    avatar: "/figma-assets/avatar-user.png",
    price: 320,
    timelikeTrust: 94,
    level: "Seller pro",
    delivery: "4 jours",
    track: "design",
  },
  {
    id: "card-3",
    gigId: 2,
    cover: "/figma-assets/photo-feed/photo-grid-5.jpg",
    title: "Je cree ton systeme motion reels, ads et hooks pour mieux capter",
    seller: "Studio Heat",
    handle: "@studio.heat",
    avatar: "/figma-assets/avatar-story.png",
    price: 180,
    timelikeTrust: 91,
    level: "Motion expert",
    delivery: "2 jours",
    track: "video",
  },
  {
    id: "card-4",
    gigId: 4,
    cover: "/figma-assets/photo-feed/photo-grid-3.jpg",
    title: "Je compose une identite sonore simple, nette et vendable",
    seller: "Neon Driver Audio",
    handle: "@neondriver",
    avatar: "/figma-assets/avatar-post.png",
    price: 210,
    timelikeTrust: 89,
    level: "Audio lab",
    delivery: "3 jours",
    track: "music",
  },
  {
    id: "card-5",
    gigId: 1,
    cover: "/figma-assets/photo-feed/photo-grid-7.jpg",
    title: "Je transforme ton lancement produit en grille visuelle plus desirable",
    seller: "Axel Belujon Studio",
    handle: "@axelbelujon",
    avatar: "/figma-assets/avatar-post.png",
    price: 520,
    timelikeTrust: 96,
    level: "Top retenu",
    delivery: "5 jours",
    track: "design",
  },
  {
    id: "card-6",
    gigId: 3,
    cover: "/figma-assets/photo-feed/photo-grid-4.jpg",
    title: "Je pose une page business plus credible pour vendre un service technique",
    seller: "Pictomag News Lab",
    handle: "@pictomag.news",
    avatar: "/figma-assets/avatar-user.png",
    price: 690,
    timelikeTrust: 94,
    level: "Business clarity",
    delivery: "6 jours",
    track: "business",
  },
  {
    id: "card-7",
    gigId: 2,
    cover: "/figma-assets/photo-feed/photo-grid-2.jpg",
    title: "Je monte un pack video vertical qui tient mieux l attention du feed",
    seller: "Studio Heat",
    handle: "@studio.heat",
    avatar: "/figma-assets/avatar-story.png",
    price: 410,
    timelikeTrust: 91,
    level: "Shorts ready",
    delivery: "4 jours",
    track: "video",
  },
  {
    id: "card-8",
    gigId: 4,
    cover: "/figma-assets/photo-feed/photo-grid-1.jpg",
    title: "Je livre un sound logo et un loop de marque pour ads, reels et produit",
    seller: "Neon Driver Audio",
    handle: "@neondriver",
    avatar: "/figma-assets/avatar-post.png",
    price: 460,
    timelikeTrust: 89,
    level: "Audio branding",
    delivery: "5 jours",
    track: "music",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getBudgetRangeLabel(price: number) {
  if (price <= 200) return "Jusqu a 200 €";
  if (price <= 400) return "200 € - 400 €";
  if (price <= 700) return "400 € - 700 €";
  return "700 € et +";
}

function getBudgetRangePreferenceLabel(price: number) {
  const budgetFilter = marketplaceFilterDefinitions.find((filter) => filter.id === "budget");
  const budgetOptions = budgetFilter?.options ?? [];

  if (budgetOptions.length < 5) {
    return getBudgetRangeLabel(price);
  }

  if (price <= 200) return budgetOptions[1]!;
  if (price <= 400) return budgetOptions[2]!;
  if (price <= 700) return budgetOptions[3]!;
  return budgetOptions[4]!;
}

function getDeliveryDays(delivery: string) {
  const parsed = Number.parseInt(delivery, 10);
  return Number.isFinite(parsed) ? parsed : 99;
}

function getDeliveryRangeLabel(delivery: string) {
  const days = getDeliveryDays(delivery);
  if (days <= 1) return "24 h";
  if (days <= 3) return "3 jours";
  if (days <= 5) return "5 jours";
  return "6 jours et +";
}

const topActions = [
  { id: "create", src: "/figma-assets/top-plus.svg", left: 0, label: "Create" },
  { id: "notifications", src: "/figma-assets/top-notification.svg", left: 42, label: "Notifications" },
  { id: "messages", src: "/figma-assets/top-message.svg", left: 84, label: "Messages" },
] as const;

function MarketplaceGigDrawer({
  gig,
  onClose,
  onCheckout,
}: {
  gig: ServiceGig | null;
  onClose: () => void;
  onCheckout: (gigId: number, packageId: string) => void;
}) {
  if (!gig || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[220]">
      <button
        type="button"
        aria-label="Fermer le gig"
        className="absolute inset-0 bg-[rgba(7,10,18,0.42)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 h-full w-[560px] overflow-y-auto border-l border-white/12 bg-white px-6 pb-8 pt-6 shadow-[-18px_0_44px_rgba(8,12,24,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b8797]">{gig.category}</p>
            <h2 className="mt-2 text-[30px] font-semibold leading-[1.02] tracking-[-0.05em] text-[#101522]">
              {gig.title}
            </h2>
            <p className="mt-3 max-w-[430px] text-[14px] leading-6 text-[#526173]">{gig.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-[#f6f8fb] text-[#101522] transition hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-[10px] bg-[#eef2f8]">
          <div className="relative aspect-[16/10]">
            <Image src={gig.cover} alt={gig.title} fill sizes="560px" className="object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0)_20%,rgba(15,23,42,0.32)_100%)]" />
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1.5 text-[11px] font-semibold text-[#101522]">
              <Sparkles className="h-3.5 w-3.5 text-[#2b6fff]" />
              Trust TimeLike {gig.timelikeTrust}%
            </div>
            <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-full bg-[#101522]/82 px-3.5 py-2 text-white backdrop-blur-md">
              <div className="relative h-9 w-9 overflow-hidden rounded-full ring-1 ring-white/20">
                <Image src={gig.avatar} alt={gig.seller} fill sizes="36px" className="object-cover" />
              </div>
              <div>
                <p className="text-[12px] font-semibold">{gig.seller}</p>
                <p className="text-[11px] text-white/70">{gig.handle}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-[10px] border border-black/7 bg-[#f7f9fc] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a97aa]">A partir de</p>
            <p className="mt-2 text-[24px] font-semibold text-[#101522]">{formatCurrency(gig.priceFrom)}</p>
          </div>
          <div className="rounded-[10px] border border-black/7 bg-[#f7f9fc] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a97aa]">Livraison</p>
            <p className="mt-2 text-[24px] font-semibold text-[#101522]">{gig.deliveryLabel}</p>
          </div>
          <div className="rounded-[10px] border border-black/7 bg-[#f7f9fc] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a97aa]">Commandes</p>
            <p className="mt-2 text-[24px] font-semibold text-[#101522]">{gig.completedOrders}</p>
          </div>
        </div>

        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h3 className="text-[18px] font-semibold text-[#101522]">Packages</h3>
            <p className="text-[12px] text-[#708095]">Choisis ton niveau de livraison</p>
          </div>
          <div className="mt-4 space-y-3">
            {gig.packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`rounded-[10px] border p-4 ${
                  pkg.recommended
                    ? "border-[#bfd7ff] bg-[linear-gradient(180deg,#f9fbff_0%,#eef5ff_100%)]"
                    : "border-black/7 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[16px] font-semibold text-[#101522]">{pkg.name}</p>
                      {pkg.recommended ? (
                        <span className="rounded-full bg-[#2b6fff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                          Recommande
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[13px] leading-5 text-[#607085]">{pkg.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[22px] font-semibold text-[#101522]">{formatCurrency(pkg.price)}</p>
                    <p className="text-[12px] text-[#7b8797]">{pkg.deliveryDays} jours</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {pkg.features.map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full border border-black/7 bg-[#f8fafc] px-2.5 py-1 text-[11px] font-medium text-[#405064]"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[12px] text-[#617185]">{pkg.revisions}</span>
                  <button
                    type="button"
                    onClick={() => onCheckout(gig.id, pkg.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#101522] px-4 py-2 text-[12px] font-semibold text-white transition hover:-translate-y-[1px] hover:bg-[#1a2233]"
                  >
                    Commander
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <h3 className="text-[18px] font-semibold text-[#101522]">Ce qui est livre</h3>
          <div className="mt-3 grid gap-3">
            {gig.deliverables.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[10px] border border-black/7 bg-[#f8fafc] px-4 py-3">
                <Check className="h-4 w-4 text-[#2b6fff]" />
                <span className="text-[13px] text-[#233042]">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>,
    document.body,
  );
}

function CheckoutModal({
  gig,
  selectedPackage,
  paymentMethod,
  brief,
  onBriefChange,
  onMethodChange,
  onClose,
  onConfirm,
}: {
  gig: ServiceGig | null;
  selectedPackage: GigPackage | null;
  paymentMethod: PaymentMethod;
  brief: string;
  onBriefChange: (value: string) => void;
  onMethodChange: (value: PaymentMethod) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!gig || !selectedPackage || typeof document === "undefined") {
    return null;
  }

  const serviceFee = Math.max(18, Math.round(selectedPackage.price * 0.08));
  const total = selectedPackage.price + serviceFee;

  return createPortal(
    <div className="fixed inset-0 z-[240]">
      <button
        type="button"
        aria-label="Fermer le paiement"
        className="absolute inset-0 bg-[rgba(7,10,18,0.54)] backdrop-blur-[4px]"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 w-[760px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[10px] border border-white/12 bg-white shadow-[0_36px_90px_rgba(4,8,19,0.3)]">
        <div className="flex items-center justify-between border-b border-black/6 px-7 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Paiement securise</p>
            <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#101522]">Confirmer la commande</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-[#f6f8fb] text-[#101522]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-[1.1fr_0.9fr] gap-0">
          <div className="border-r border-black/6 px-7 py-6">
            <div className="rounded-[10px] border border-black/7 bg-[#f8fafc] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[16px] font-semibold text-[#101522]">{gig.title}</p>
                  <p className="mt-1 text-[13px] text-[#6b788a]">
                    {selectedPackage.name} · {selectedPackage.deliveryDays} jours
                  </p>
                </div>
                <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-[11px] font-semibold text-[#2b6fff]">
                  {formatCurrency(selectedPackage.price)}
                </span>
              </div>
              <p className="mt-4 text-[13px] leading-6 text-[#536173]">{selectedPackage.description}</p>
            </div>

            <div className="mt-5">
              <p className="text-[14px] font-semibold text-[#101522]">Choisir le moyen de paiement</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { id: "card", label: "Carte", icon: CreditCard },
                  { id: "wallet", label: "Wallet", icon: Wallet },
                  { id: "bank", label: "Virement", icon: Banknote },
                ].map((method) => {
                  const Icon = method.icon;
                  const isActive = paymentMethod === method.id;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => onMethodChange(method.id as PaymentMethod)}
                      className={`rounded-[10px] border px-4 py-4 text-left transition ${
                        isActive
                          ? "border-[#cde3ff] bg-[#eef5ff] shadow-[0_12px_28px_rgba(43,111,255,0.1)]"
                          : "border-black/7 bg-white hover:border-black/12"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? "text-[#2b6fff]" : "text-[#101522]"}`} />
                      <p className="mt-3 text-[13px] font-semibold text-[#101522]">{method.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold text-[#101522]">Brief du projet</p>
                <span className="text-[12px] text-[#7b8797]">Plus il est clair, plus le tracker sera utile.</span>
              </div>
              <textarea
                value={brief}
                onChange={(event) => onBriefChange(event.target.value)}
                placeholder="Objectif, contexte, livrables attendus, references..."
                className="mt-3 h-[148px] w-full resize-none rounded-[10px] border border-black/8 bg-[#f8fafc] px-4 py-4 text-[14px] leading-6 text-[#101522] outline-none placeholder:text-[#93a0b2] focus:border-[#9ac5ff] focus:bg-white"
              />
            </div>
          </div>

          <div className="bg-[#0f172a] px-7 py-6 text-white">
            <div className="rounded-[10px] border border-white/10 bg-white/6 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Recap</p>
              <div className="mt-4 space-y-3 text-[14px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/72">Package</span>
                  <span>{formatCurrency(selectedPackage.price)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/72">Protection plateforme</span>
                  <span>{formatCurrency(serviceFee)}</span>
                </div>
                <div className="border-t border-white/10 pt-3 text-[18px] font-semibold">
                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[10px] border border-white/10 bg-white/6 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-[#76b3ff]" />
                <div>
                  <p className="text-[14px] font-semibold">Paiement sous escrow</p>
                  <p className="mt-2 text-[13px] leading-6 text-white/72">
                    L&apos;acompte reste protege jusqu&apos;a validation des etapes du projet dans le tracker.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onConfirm}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-[#0f172a] transition hover:-translate-y-[1px] hover:bg-[#edf2ff]"
            >
              Confirmer et ouvrir le tracker
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function MarketplacePage({
  initialView = "discover",
  initialOrderId = null,
}: {
  initialView?: MarketplaceView;
  initialOrderId?: number | null;
}) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<MarketplaceView>(initialView);
  const [activeTrack, setActiveTrack] = useState("design");
  const [activeCategory, setActiveCategory] = useState("Tout");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [headerPanel, setHeaderPanel] = useState<HeaderPanelId>(null);
  const [selectedGigId, setSelectedGigId] = useState<number | null>(null);
  const [checkoutState, setCheckoutState] = useState<CheckoutState | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [buyerBrief, setBuyerBrief] = useState("");
  const [orders, setOrders] = useState<ProjectOrder[]>(seedOrders);
  const [ordersHydrated, setOrdersHydrated] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number>(initialOrderId ?? seedOrders[0]!.id);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [createdSellerGigs, setCreatedSellerGigs] = useState<SellerDraftGig[]>([]);
  const [gigCreationDraft, setGigCreationDraft] = useState<GigCreationDraft>(createInitialGigCreationDraft);
  const [gigCreationStep, setGigCreationStep] = useState(0);
  const [customOrdersEnabled, setCustomOrdersEnabled] = useState(false);
  const [sellerGigFilter, setSellerGigFilter] = useState<SellerGigDashboardStatus>("active");
  const [discoverFilters, setDiscoverFilters] = useState<Record<MarketplaceFilterId, string>>({
    ...marketplacePreferencesDefaults.discoverFilters,
  });
  const [openDiscoverFilter, setOpenDiscoverFilter] = useState<MarketplaceFilterId | null>(null);
  const [discoverSort, setDiscoverSort] = useState<MarketplaceDiscoverSort>(marketplacePreferencesDefaults.discoverSort);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [sellerAnalyticsRange, setSellerAnalyticsRange] = useState<SellerAnalyticsRange>(
    marketplacePreferencesDefaults.sellerAnalyticsRange,
  );
  const [sellerRangeDropdownOpen, setSellerRangeDropdownOpen] = useState(false);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);

  const filteredGigs = useMemo(
    () =>
      serviceGigs.filter((gig) => {
        const matchesCategory = activeCategory === "Tout" || gig.category === activeCategory;
        const haystack = `${gig.title} ${gig.subtitle} ${gig.category} ${gig.seller} ${gig.tags.join(" ")}`.toLowerCase();
        const matchesQuery = searchQuery.trim().length === 0 || haystack.includes(searchQuery.trim().toLowerCase());
        return matchesCategory && matchesQuery;
      }),
    [activeCategory, searchQuery],
  );

  const filteredDiscoverCards = useMemo(() => {
    const track = marketplaceTracks.find((item) => item.id === activeTrack);
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const selectedSubcategory = discoverFilters.subcategory;
    const selectedBudget = discoverFilters.budget;
    const selectedDelivery = discoverFilters.delivery;
    const selectedLocation = discoverFilters.location;
    const selectedLevel = discoverFilters.level;
    const selectedSpeaks = discoverFilters.speaks;

    const filtered = discoverCards.filter((card) => {
      const baseGig = serviceGigs.find((gig) => gig.id === card.gigId);
      const sellerMeta = discoverSellerMeta[card.seller] ?? { location: "Remote", speaks: ["EN"] };
      const subcategory = baseGig?.category ?? "Design";
      const budgetRange = getBudgetRangePreferenceLabel(card.price);
      const deliveryRange = getDeliveryRangeLabel(card.delivery);
      const matchesTrack =
        !track ||
        track.id === "trending" ||
        track.matches.length === 0 ||
        (baseGig ? track.matches.includes(baseGig.category) : card.track === activeTrack);
      const haystack = `${card.title} ${card.seller} ${card.level} ${card.track} ${sellerMeta.location} ${sellerMeta.speaks.join(" ")}`.toLowerCase();
      const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
      const matchesSubcategory = selectedSubcategory === "All" || subcategory === selectedSubcategory;
      const matchesBudget = selectedBudget === "All" || budgetRange === selectedBudget;
      const matchesDelivery = selectedDelivery === "All" || deliveryRange === selectedDelivery;
      const matchesLocation = selectedLocation === "All" || sellerMeta.location === selectedLocation;
      const matchesLevel = selectedLevel === "All" || card.level === selectedLevel;
      const matchesSpeaks = selectedSpeaks === "All" || sellerMeta.speaks.includes(selectedSpeaks);

      return (
        matchesTrack &&
        matchesQuery &&
        matchesSubcategory &&
        matchesBudget &&
        matchesDelivery &&
        matchesLocation &&
        matchesLevel &&
        matchesSpeaks
      );
    });

    if (discoverSort === "recommended") {
      return filtered;
    }

    return [...filtered].sort((left, right) => {
      if (discoverSort === "price-asc") {
        return left.price - right.price;
      }

      if (discoverSort === "price-desc") {
        return right.price - left.price;
      }

      if (discoverSort === "trust-desc") {
        return right.timelikeTrust - left.timelikeTrust;
      }

      if (discoverSort === "delivery-fast") {
        return getDeliveryDays(left.delivery) - getDeliveryDays(right.delivery);
      }

      return 0;
    });
  }, [activeTrack, discoverFilters, discoverSort, searchQuery]);

  const selectedGig = serviceGigs.find((gig) => gig.id === selectedGigId) ?? null;
  const checkoutGig = serviceGigs.find((gig) => gig.id === checkoutState?.gigId) ?? null;
  const checkoutPackage = checkoutGig?.packages.find((pkg) => pkg.id === checkoutState?.packageId) ?? null;
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null;
  const sellerDisplayGigs = useMemo(
    () => [
      ...createdSellerGigs,
      ...serviceGigs.map((gig) => ({
        id: gig.id,
        serviceGig: gig,
        draft: createInitialGigCreationDraft(),
        statusLabel: "Actif",
        helper: `${gig.queueSize} en file · ${gig.deliveryLabel}`,
      })),
    ],
    [createdSellerGigs],
  );
  const sellerRangeMultiplier =
    sellerAnalyticsRangeOptions.find((option) => option.id === sellerAnalyticsRange)?.multiplier ?? 1;
  const sellerGigRows = useMemo<SellerGigDashboardRow[]>(
    () => [
      ...createdSellerGigs.map((gigRecord) => ({
        id: `draft-${gigRecord.id}`,
        gig: gigRecord.serviceGig,
        source: "draft" as const,
        status: "draft" as const,
        impressions: 0,
        clicks: 0,
        orders: 0,
        cancellations: "0 %",
      })),
      ...serviceGigs.map((gig, index) => ({
        id: `seed-${gig.id}`,
        gig,
        source: "seed" as const,
        status: (index === 0 ? "active" : index === 1 ? "active" : index === 2 ? "pending" : "paused") as SellerGigDashboardStatus,
        impressions: Math.max(0, Math.round((gig.completedOrders * 64 + gig.queueSize * 18) * sellerRangeMultiplier)),
        clicks: Math.max(0, Math.round((gig.completedOrders * 5 + gig.queueSize * 3) * sellerRangeMultiplier)),
        orders: Math.max(0, Math.round(gig.completedOrders * sellerRangeMultiplier)),
        cancellations: `${Math.max(0, Math.round((100 - gig.timelikeTrust) / 3))} %`,
      })),
    ],
    [createdSellerGigs, sellerRangeMultiplier],
  );
  const sellerGigTabCounts = useMemo(
    () =>
      sellerGigRows.reduce<Record<SellerGigDashboardStatus, number>>(
        (counts, row) => {
          counts[row.status] += 1;
          return counts;
        },
        {
          active: 0,
          pending: 0,
          modification: 0,
          draft: 0,
          denied: 0,
          paused: 0,
        },
      ),
    [sellerGigRows],
  );
  const filteredSellerGigRows = useMemo(
    () => sellerGigRows.filter((row) => row.status === sellerGigFilter),
    [sellerGigFilter, sellerGigRows],
  );
  const pendingRevenue = orders
    .filter((order) => !order.paymentReleased)
    .reduce((sum, order) => sum + order.budget, 0);
  const totalRevenue = orders.reduce((sum, order) => sum + order.budget, 0);
  const isCreateView = activeView === "create";

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 3400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  useEffect(() => {
    let active = true;

    void (async () => {
      const serverOrders = await readMarketplaceOrdersFromApi(seedOrders);
      const nextOrders = serverOrders.length > 0 ? serverOrders : seedOrders;
      const nextSelectedOrderId =
        initialOrderId && nextOrders.some((order) => order.id === initialOrderId)
          ? initialOrderId
          : nextOrders[0]?.id ?? seedOrders[0]!.id;

      if (!active) {
        return;
      }

      setOrders(nextOrders);
      setActiveView(initialView);
      setSelectedOrderId(nextSelectedOrderId);
      setOrdersHydrated(true);
    })();

    return () => {
      active = false;
    };
  }, [initialOrderId, initialView]);

  useEffect(() => {
    if (!ordersHydrated) {
      return;
    }

    void writeMarketplaceOrdersToApi(orders);
  }, [orders, ordersHydrated]);

  useEffect(() => {
    let active = true;

    void (async () => {
      const preferences = await readMarketplacePreferencesFromApi();

      if (!active) {
        return;
      }

      setDiscoverFilters(preferences.discoverFilters);
      setDiscoverSort(preferences.discoverSort);
      setSellerAnalyticsRange(preferences.sellerAnalyticsRange);
      setPreferencesHydrated(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!preferencesHydrated) {
      return;
    }

    void writeMarketplacePreferencesToApi({
      discoverFilters,
      discoverSort,
      sellerAnalyticsRange,
    });
  }, [discoverFilters, discoverSort, preferencesHydrated, sellerAnalyticsRange]);

  useEffect(() => {
    if (!searchOpen && !selectedGig && !checkoutState) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (checkoutState) {
        setCheckoutState(null);
        return;
      }

      if (selectedGig) {
        setSelectedGigId(null);
        return;
      }

      setSearchOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [checkoutState, searchOpen, selectedGig]);

  const handleHeaderNav = (itemId: HeaderNavItemId) => {
    if (itemId === "search") {
      setHeaderPanel(null);
      setSearchOpen((current) => !current);
      return;
    }

    setSearchOpen(false);
    setHeaderPanel(null);

    if (itemId === "home") {
      router.push("/");
      return;
    }

    if (itemId === "watch") {
      router.push("/live-shopping");
    }
  };

  const handleHeaderPanelAction = (panel: HeaderPanelId) => {
    setSearchOpen(false);
    setHeaderPanel((current) => (current === panel ? null : panel));
  };

  const handleSelectDiscoverFilter = (filterId: MarketplaceFilterId, option: string) => {
    setDiscoverFilters((current) => ({
      ...current,
      [filterId]: option,
    }));
    setOpenDiscoverFilter(null);
  };

  const activeSortLabel =
    discoverSortOptions.find((option) => option.id === discoverSort)?.label ?? discoverSortOptions[0]!.label;
  const activeSellerRangeLabel =
    sellerAnalyticsRangeOptions.find((option) => option.id === sellerAnalyticsRange)?.label ??
    sellerAnalyticsRangeOptions[1]!.label;

  const handleGigDraftFieldChange = (field: Exclude<keyof GigCreationDraft, "packages">, value: string) => {
    setGigCreationDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleGigDraftPackageChange = (
    index: number,
    field: keyof GigCreationPackageDraft,
    value: string | boolean,
  ) => {
    setGigCreationDraft((current) => ({
      ...current,
      packages: current.packages.map((pkg, pkgIndex) =>
        pkgIndex === index
          ? {
              ...pkg,
              [field]: value,
            }
          : pkg,
      ),
    }));
  };

  const handleSetRecommendedPackage = (index: number) => {
    setGigCreationDraft((current) => ({
      ...current,
      packages: current.packages.map((pkg, pkgIndex) => ({
        ...pkg,
        recommended: pkgIndex === index,
      })),
    }));
  };

  const handleOpenGigCreator = () => {
    setHeaderPanel(null);
    setSelectedGigId(null);
    setCheckoutState(null);
    setActiveView("create");
  };

  const handleSaveGigDraft = () => {
    setToastMessage("Brouillon enregistre localement. Tu peux reprendre la creation quand tu veux.");
  };

  const handlePublishGigDraft = () => {
    const normalizedTitle = gigCreationDraft.title.trim() || "Nouveau gig";
    const firstPackage = gigCreationDraft.packages[0] ?? createInitialGigCreationDraft().packages[0]!;
    const recommendedPackage =
      gigCreationDraft.packages.find((item) => item.recommended) ?? gigCreationDraft.packages[1] ?? firstPackage;
    const nextId = 9000 + createdSellerGigs.length + 1;

    const nextGig: ServiceGig = {
      id: nextId,
      title: normalizedTitle,
      subtitle: gigCreationDraft.subtitle.trim() || "Gig cree depuis votre dashboard vendeur.",
      seller: gigCreationDraft.seller.trim() || "Votre studio",
      handle: gigCreationDraft.handle.trim() || "@votrestudio",
      avatar: "/figma-assets/avatar-post.png",
      cover: gigCreationDraft.cover,
      category: gigCreationDraft.category,
      priceFrom: Number(firstPackage.price) || 0,
      deliveryLabel: gigCreationDraft.deliveryLabel.trim() || `${firstPackage.deliveryDays || "3"} jours`,
      responseLabel: gigCreationDraft.responseLabel.trim() || "Reponse < 1h",
      timelikeTrust: 96,
      completedOrders: 0,
      queueSize: 0,
      tags: gigCreationDraft.tags
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
      deliverables: gigCreationDraft.deliverables
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
      packages: gigCreationDraft.packages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name.trim() || "Package",
        price: Number(pkg.price) || 0,
        deliveryDays: Number(pkg.deliveryDays) || 3,
        revisions: pkg.revisions.trim() || "1 revision",
        description: pkg.description.trim() || "Description a completer",
        features: pkg.features
          .split(/\n|,/)
          .map((item) => item.trim())
          .filter(Boolean),
        recommended: pkg.recommended,
      })),
    };

    setCreatedSellerGigs((current) => [
      {
        id: nextId,
        serviceGig: nextGig,
        draft: structuredClone(gigCreationDraft),
        statusLabel: "Nouveau",
        helper: `${recommendedPackage.name} · ${nextGig.deliveryLabel}`,
      },
      ...current,
    ]);
    setGigCreationDraft(createInitialGigCreationDraft());
    setGigCreationStep(0);
    setSellerGigFilter("draft");
    setActiveView("seller");
    setToastMessage(`Gig cree. "${normalizedTitle}" est maintenant visible dans votre dashboard vendeur.`);
  };

  const handleReopenSellerDraft = (draftGig: SellerDraftGig) => {
    setGigCreationDraft(structuredClone(draftGig.draft));
    setGigCreationStep(4);
    setActiveView("create");
  };

  const handleOpenGig = (gigId: number) => {
    const gig = serviceGigs.find((item) => item.id === gigId);

    if (!gig) {
      return;
    }

    setCheckoutState(null);
    setHeaderPanel(null);
    router.push(getMarketplaceGigHref(gig));
  };

  const handleStartCheckout = (gigId: number, packageId: string) => {
    setSelectedGigId(null);
    setCheckoutState({ gigId, packageId });
    if (!buyerBrief) {
      setBuyerBrief("Objectif, contexte, livrables attendus, references et contraintes.");
    }
  };

  const handleConfirmCheckout = () => {
    if (!checkoutGig || !checkoutPackage) {
      return;
    }

    const nextOrder: ProjectOrder = {
      id: Date.now(),
      gigId: checkoutGig.id,
      title: checkoutGig.title,
      client: "Vous",
      seller: checkoutGig.seller,
      budget: checkoutPackage.price,
      dueDate: `${checkoutPackage.deliveryDays + 24} mars`,
      stageIndex: 0,
      lastUpdate: "Commande creee, brief en attente de validation",
      paymentReleased: false,
      timelikeTrust: checkoutGig.timelikeTrust,
      brief: buyerBrief.trim() || "Brief a partager apres paiement.",
      notes: [
        "Commande creee",
        "Paiement sous escrow verrouille",
        "Le vendeur peut maintenant valider le brief",
      ],
    };

    setOrders((current) => [nextOrder, ...current]);
    setSelectedOrderId(nextOrder.id);
    setActiveView("tracker");
    setCheckoutState(null);
    setSearchOpen(false);
    setToastMessage("Commande creee. Le tracker projet est ouvert.");
  };

  const handleAdvanceOrder = (orderId: number) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              stageIndex: Math.min(order.stageIndex + 1, projectStages.length - 1),
              lastUpdate: `Etape ${projectStages[Math.min(order.stageIndex + 1, projectStages.length - 1)]!.label.toLowerCase()} activee`,
            }
          : order,
      ),
    );
  };

  const handleReleasePayment = (orderId: number) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              paymentReleased: true,
              lastUpdate: "Paiement final libere",
            }
          : order,
      ),
    );
  };

  const renderHeaderPanel = () => {
    if (!headerPanel) {
      return null;
    }

    return (
      <div className="absolute right-10 top-[74px] z-[60] w-[340px] rounded-[10px] border border-black/7 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
        {headerPanel === "create" ? (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Creer</p>
            {topCreateOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === "create") {
                    handleOpenGigCreator();
                    return;
                  }

                  setActiveView(item.id as MarketplaceView);
                  setHeaderPanel(null);
                }}
                className="flex w-full items-start justify-between rounded-[10px] border border-black/7 bg-[#f8fafc] px-4 py-3 text-left transition hover:border-black/12 hover:bg-white"
              >
                <div>
                  <p className="text-[14px] font-semibold text-[#101522]">{item.title}</p>
                  <p className="mt-1 text-[12px] leading-5 text-[#667487]">{item.copy}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-[#7b8797]" />
              </button>
            ))}
          </div>
        ) : null}

        {headerPanel === "notifications" ? (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Notifications</p>
            {topNotifications.map((item) => (
              <div key={item} className="rounded-[10px] border border-black/7 bg-[#f8fafc] px-4 py-3 text-[13px] leading-6 text-[#233042]">
                {item}
              </div>
            ))}
          </div>
        ) : null}

        {headerPanel === "messages" ? (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Messages</p>
            {topMessages.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setActiveView("tracker");
                  setHeaderPanel(null);
                }}
                className="block w-full rounded-[10px] border border-black/7 bg-[#f8fafc] px-4 py-3 text-left text-[13px] leading-6 text-[#233042] transition hover:border-black/12 hover:bg-white"
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}

        {headerPanel === "menu" ? (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Menu rapide</p>
            {[
              { id: "discover", label: "Explorer les gigs" },
              { id: "seller", label: "Dashboard vendeur" },
              { id: "tracker", label: "Suivi projet" },
              { id: "feed", label: "Retour au feed principal" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === "feed") {
                    router.push("/");
                    return;
                  }

                  setActiveView(item.id as MarketplaceView);
                  setHeaderPanel(null);
                }}
                className="flex w-full items-center justify-between rounded-[10px] border border-black/7 bg-[#f8fafc] px-4 py-3 text-left text-[13px] font-medium text-[#233042] transition hover:border-black/12 hover:bg-white"
              >
                {item.label}
                <ChevronRight className="h-4 w-4 text-[#7b8797]" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#101522]">
      <div className="mx-auto min-h-screen w-[1440px] bg-white">
        <header className="fixed left-1/2 top-0 z-[120] h-[73px] w-[1440px] -translate-x-1/2">
          <div className="absolute left-0 top-0 h-[61px] w-[1440px] bg-[rgba(255,255,255,0.87)] backdrop-blur-[13px]" />
          <div className="relative h-full">
            <Image
              src="/figma-assets/logo-mark.png"
              alt="Pictomag logo"
              width={29.99}
              height={29.04}
              priority
              className="absolute left-[54px] top-[23px] h-[29.04px] w-[29.99px]"
            />
            <Image
              src="/figma-assets/brand-wordmark.svg"
              alt="Pictomag"
              width={83.52}
              height={31.69}
              priority
              className="absolute left-[94px] top-[24.28px] h-[31.69px] w-[83.52px]"
            />

            <AnimatedHeaderNav activeItemId={searchOpen ? "search" : "shop"} onItemClick={handleHeaderNav} />

            <div className="absolute left-[1180px] top-6 h-6 w-[108px]">
              {topActions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleHeaderPanelAction(item.id as HeaderPanelId)}
                  className="absolute top-0 h-6 w-6 transition hover:-translate-y-[1px]"
                  style={{ left: item.left }}
                  aria-label={item.label}
                >
                  <Image src={item.src} alt="" width={24} height={24} unoptimized className="h-6 w-6" />
                </button>
              ))}
            </div>

            <div className="absolute left-[1303px] top-[19px] h-9 w-px bg-black/12" />

            <div className="absolute left-[1318px] top-5 flex h-8 w-[69px] items-center gap-[13px]">
              <button
                type="button"
                onClick={() => handleHeaderPanelAction("menu")}
                aria-label="Menu"
                className="h-6 w-6 transition hover:-translate-y-[1px]"
              >
                <Image src="/figma-assets/top-menu.svg" alt="" width={24} height={24} unoptimized className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="relative h-8 w-8 overflow-hidden rounded-full transition hover:-translate-y-[1px]"
              >
                <Image src="/figma-assets/avatar-user.png" alt="Current user" fill sizes="32px" className="object-cover" />
              </button>
            </div>

            {renderHeaderPanel()}
          </div>
        </header>

        {searchOpen ? (
          <div className="fixed left-1/2 top-[92px] z-[120] w-[980px] -translate-x-1/2 rounded-[10px] border border-black/7 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3 rounded-full border border-black/8 bg-[#f7f9fc] px-4 py-3">
                <SearchIcon className="h-4 w-4 text-[#6b7788]" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  autoFocus
                  placeholder="Rechercher un gig, un vendeur ou une expertise"
                  className="w-full border-none bg-transparent text-[15px] text-[#101522] outline-none placeholder:text-[#9aa6b7]"
                />
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-[#f6f8fb]"
              >
                <X className="h-5 w-5 text-[#101522]" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Gigs</p>
                {filteredGigs.slice(0, 4).map((gig) => (
                  <button
                    key={gig.id}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      handleOpenGig(gig.id);
                    }}
                    className="flex w-full items-center gap-4 rounded-[10px] border border-black/7 bg-[#f8fafc] p-3 text-left transition hover:border-black/12 hover:bg-white"
                  >
                    <div className="relative h-20 w-28 overflow-hidden rounded-[8px]">
                      <Image src={gig.cover} alt={gig.title} fill sizes="112px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#101522]">{gig.title}</p>
                      <p className="mt-1 text-[12px] text-[#6b7788]">
                        {gig.seller} · {gig.category}
                      </p>
                      <p className="mt-2 text-[12px] font-medium text-[#2b6fff]">A partir de {formatCurrency(gig.priceFrom)}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Vendeurs a suivre</p>
                {serviceGigs.slice(0, 4).map((gig) => (
                  <button
                    key={`seller-${gig.id}`}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setActiveView("seller");
                    }}
                    className="flex w-full items-center gap-3 rounded-[10px] border border-black/7 bg-[#f8fafc] px-4 py-3 text-left transition hover:border-black/12 hover:bg-white"
                  >
                    <div className="relative h-11 w-11 overflow-hidden rounded-full ring-1 ring-black/6">
                      <Image src={gig.avatar} alt={gig.seller} fill sizes="44px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[#101522]">{gig.seller}</p>
                      <p className="text-[12px] text-[#6b7788]">{gig.handle}</p>
                    </div>
                    <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-[11px] font-semibold text-[#2b6fff]">
                      {gig.timelikeTrust}% trust
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <main className="px-10 pb-14 pt-[96px]">
          {toastMessage ? (
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cfe2ff] bg-white px-4 py-2 text-[13px] font-medium text-[#101522] shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
              <Check className="h-4 w-4 text-[#2b6fff]" />
              {toastMessage}
            </div>
          ) : null}
          {activeView === "discover" ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b8797]">Pictomag marketplace</p>
                  <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-[#101522]">
                    Trouve un gig solide, vite, et suis le projet proprement.
                  </h1>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-black/6 bg-white p-1 shadow-[0_16px_34px_rgba(15,23,42,0.06)]">
                  {[
                    { id: "discover", label: "Marketplace", icon: BriefcaseBusiness },
                    { id: "create", label: "Creer un gig", icon: FileText },
                    { id: "seller", label: "Dashboard vendeur", icon: LayoutDashboard },
                    { id: "tracker", label: "Suivi projet", icon: FolderKanban },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const active = activeView === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveView(tab.id as MarketplaceView)}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition ${
                          active ? "bg-[#101522] text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]" : "text-[#465569]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <section className="mt-6 border-b border-black/8 pb-7">
                <div className="grid grid-cols-14 gap-x-4">
                  {marketplaceTracks.map((track) => {
                    const active = activeTrack === track.id;

                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          setActiveTrack(track.id);
                          setOpenDiscoverFilter(null);
                          setSortDropdownOpen(false);
                        }}
                        className="group flex min-w-0 flex-col items-center text-center"
                      >
                        <span className="flex h-10 w-10 items-center justify-center transition group-hover:-translate-y-[1px]">
                          <Image
                            src={track.iconSrc}
                            alt={track.label}
                            width={31}
                            height={31}
                            unoptimized
                            className="h-[31px] w-[31px] object-contain"
                          />
                        </span>
                        <span className={`mt-2 whitespace-nowrap text-[13px] font-medium text-[#111111] ${active ? "font-semibold" : ""}`}>
                          {track.label}
                        </span>
                        <span className={`mt-4 h-[2px] w-14 rounded-full bg-[#0094ff] transition ${active ? "opacity-100" : "opacity-0"}`} />
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="mt-5 grid grid-cols-[repeat(6,minmax(0,1fr))_1.4fr_260px] gap-3">
                {marketplaceFilterDefinitions.map((filter) => {
                  const selectedValue = discoverFilters[filter.id];
                  const isOpen = openDiscoverFilter === filter.id;
                  const hasSelection = selectedValue !== "All";

                  return (
                    <div key={filter.id} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setSortDropdownOpen(false);
                          setOpenDiscoverFilter((current) => (current === filter.id ? null : filter.id));
                        }}
                        className={`inline-flex h-[52px] w-full items-center justify-between rounded-[10px] border bg-white px-4 text-[14px] font-medium shadow-[0_12px_26px_rgba(15,23,42,0.04)] ${
                          hasSelection ? "border-[#c6d8f7] text-[#101522]" : "border-black/6 text-[#4d5b6d]"
                        }`}
                      >
                        <span>{hasSelection ? selectedValue : filter.label}</span>
                        <ChevronDown className={`h-4 w-4 ${isOpen ? "rotate-180" : ""} text-[#7b8797] transition`} />
                      </button>
                      {isOpen ? (
                        <div className="absolute left-0 top-[58px] z-[35] w-full min-w-[190px] overflow-hidden rounded-[10px] border border-[#dfe8f6] bg-white shadow-[0_20px_44px_rgba(15,23,42,0.12)]">
                          {filter.options.map((option) => {
                            const active = selectedValue === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleSelectDiscoverFilter(filter.id, option)}
                                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] transition ${
                                  active ? "bg-[#eef4ff] font-semibold text-[#101522]" : "text-[#526173] hover:bg-[#f8fbff]"
                                }`}
                              >
                                <span>{option}</span>
                                {active ? <Check className="h-4 w-4 text-[#2b6fff]" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                <div className="flex h-[52px] items-center gap-3 rounded-[10px] border border-black/6 bg-white px-5 shadow-[0_12px_26px_rgba(15,23,42,0.04)]">
                  <SearchIcon className="h-4 w-4 text-[#738196]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search for any service"
                    className="w-full border-none bg-transparent text-[15px] text-[#101522] outline-none placeholder:text-[#98a4b5]"
                  />
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDiscoverFilter(null);
                      setSortDropdownOpen((current) => !current);
                    }}
                    className="inline-flex h-[52px] w-full items-center justify-between rounded-[10px] border border-black/6 bg-white px-4 text-[14px] font-medium text-[#4d5b6d] shadow-[0_12px_26px_rgba(15,23,42,0.04)]"
                  >
                    <span>Sort by: {activeSortLabel}</span>
                    <ChevronDown className={`h-4 w-4 text-[#7b8797] transition ${sortDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {sortDropdownOpen ? (
                    <div className="absolute right-0 top-[58px] z-[35] w-full min-w-[260px] overflow-hidden rounded-[10px] border border-[#dfe8f6] bg-white shadow-[0_20px_44px_rgba(15,23,42,0.12)]">
                      {discoverSortOptions.map((option) => {
                        const active = option.id === discoverSort;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setDiscoverSort(option.id);
                              setSortDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] transition ${
                              active ? "bg-[#eef4ff] font-semibold text-[#101522]" : "text-[#526173] hover:bg-[#f8fbff]"
                            }`}
                          >
                            <span>{option.label}</span>
                            {active ? <Check className="h-4 w-4 text-[#2b6fff]" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          ) : activeView === "create" ? null : activeView === "seller" ? (
            <section className="pt-3">
              <div className="flex items-start justify-between gap-8">
                <div>
                  <h1 className="text-[58px] font-light leading-none tracking-[-0.06em] text-[#101522]">Gigs</h1>
                </div>
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => setCustomOrdersEnabled((current) => !current)}
                    className="flex items-center gap-3 text-[13px] font-medium text-[#425164]"
                  >
                    <span
                      className={`relative flex h-7 w-12 items-center rounded-[10px] border px-1 transition ${
                        customOrdersEnabled ? "border-[#cfe2ff] bg-[#eef5ff]" : "border-black/8 bg-[#f4f6f9]"
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-[8px] bg-white shadow-[0_4px_10px_rgba(15,23,42,0.14)] transition ${
                          customOrdersEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </span>
                    Accepting Custom Orders
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenGigCreator}
                    className="rounded-[10px] bg-[#2b6fff] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-white transition hover:-translate-y-[1px] hover:bg-[#1f5ae6]"
                  >
                    Create a new gig
                  </button>
                </div>
              </div>

              <div className="mt-8 border-b border-black/7">
                <div className="flex items-end gap-7 text-[13px] uppercase tracking-[0.03em] text-[#7c8795]">
                  {sellerGigStatusTabs.map((tab) => {
                    const active = sellerGigFilter === tab.id;
                    const count = sellerGigTabCounts[tab.id];

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSellerGigFilter(tab.id)}
                        className={`relative flex items-center gap-2 pb-4 transition ${
                          active ? "text-[#101522]" : "hover:text-[#425164]"
                        }`}
                      >
                        <span>{tab.label}</span>
                        {count > 0 ? (
                          <span
                            className={`inline-flex min-w-6 items-center justify-center rounded-[10px] px-1.5 py-0.5 text-[11px] font-semibold ${
                              active ? "bg-[#2b6fff] text-white" : "bg-[#eef3f8] text-[#526173]"
                            }`}
                          >
                            {count}
                          </span>
                        ) : null}
                        {active ? <span className="absolute inset-x-0 bottom-[-1px] h-[2px] bg-[#101522]" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 rounded-[10px] border border-black/7 bg-white">
                <div className="flex items-center justify-between border-b border-black/6 px-5 py-4">
                  <p className="text-[24px] font-semibold tracking-[-0.04em] text-[#101522]">
                    {sellerGigStatusTabs.find((tab) => tab.id === sellerGigFilter)?.label} gigs
                  </p>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSellerRangeDropdownOpen((current) => !current)}
                      className="inline-flex items-center gap-2 rounded-[10px] border border-black/7 bg-white px-3 py-2 text-[12px] font-medium uppercase tracking-[0.04em] text-[#6a7789]"
                    >
                      {activeSellerRangeLabel}
                      <ChevronDown className={`h-4 w-4 transition ${sellerRangeDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {sellerRangeDropdownOpen ? (
                      <div className="absolute right-0 top-[42px] z-[35] w-[180px] overflow-hidden rounded-[10px] border border-[#dfe8f6] bg-white shadow-[0_20px_44px_rgba(15,23,42,0.12)]">
                        {sellerAnalyticsRangeOptions.map((option) => {
                          const active = option.id === sellerAnalyticsRange;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setSellerAnalyticsRange(option.id);
                                setSellerRangeDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] transition ${
                                active ? "bg-[#eef4ff] font-semibold text-[#101522]" : "text-[#526173] hover:bg-[#f8fbff]"
                              }`}
                            >
                              <span>{option.label}</span>
                              {active ? <Check className="h-4 w-4 text-[#2b6fff]" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-[44px_minmax(0,1.7fr)_150px_110px_110px_140px_74px] border-b border-black/6 px-5 py-3 text-[12px] uppercase tracking-[0.05em] text-[#97a3b3]">
                  <div className="flex items-center">
                    <span className="h-4 w-4 rounded-[4px] border border-black/10 bg-white" />
                  </div>
                  <div>Gig</div>
                  <div>Impressions</div>
                  <div>Clicks</div>
                  <div>Orders</div>
                  <div>Cancellations</div>
                  <div />
                </div>

                {filteredSellerGigRows.length > 0 ? (
                  filteredSellerGigRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[44px_minmax(0,1.7fr)_150px_110px_110px_140px_74px] items-center border-b border-black/5 px-5 py-4 last:border-b-0"
                    >
                      <div className="flex items-center">
                        <span className="h-4 w-4 rounded-[4px] border border-black/10 bg-white" />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (row.source === "draft") {
                            const draftGig = createdSellerGigs.find((item) => `draft-${item.id}` === row.id);
                            if (draftGig) {
                              handleReopenSellerDraft(draftGig);
                            }
                            return;
                          }

                          handleOpenGig(row.gig.id);
                        }}
                        className="flex min-w-0 items-center gap-4 text-left"
                      >
                        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-[8px] bg-[#eef2f7]">
                          <Image src={row.gig.cover} alt={row.gig.title} fill sizes="96px" className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-[15px] leading-6 text-[#101522]">{row.gig.title}</p>
                          <p className="mt-1 text-[12px] text-[#728094]">
                            {row.gig.seller} · {row.gig.deliveryLabel}
                          </p>
                        </div>
                      </button>
                      <div className="text-[16px] text-[#101522]">{row.impressions}</div>
                      <div className="text-[16px] text-[#101522]">{row.clicks}</div>
                      <div className="text-[16px] text-[#101522]">{row.orders}</div>
                      <div className="text-[16px] text-[#101522]">{row.cancellations}</div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (row.source === "draft") {
                              const draftGig = createdSellerGigs.find((item) => `draft-${item.id}` === row.id);
                              if (draftGig) {
                                handleReopenSellerDraft(draftGig);
                              }
                              return;
                            }

                            handleOpenGig(row.gig.id);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-black/7 bg-white text-[#6a7789] transition hover:border-black/12 hover:text-[#101522]"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-14 text-center">
                    <p className="text-[18px] font-semibold text-[#101522]">Aucun gig dans cet etat pour le moment.</p>
                    <p className="mt-2 text-[14px] text-[#667487]">
                      Cree un nouveau gig ou change d&apos;onglet pour retrouver tes autres services.
                    </p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <>
              <section className="grid grid-cols-[minmax(0,1.55fr)_360px] gap-6">
                <div className="rounded-[10px] border border-black/6 bg-white px-8 py-8 shadow-[0_28px_60px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b8797]">
                    {isCreateView ? "Creation vendeur" : "Service marketplace"}
                  </p>
                  <h1 className="mt-3 max-w-[760px] text-[46px] font-semibold leading-[0.98] tracking-[-0.06em] text-[#101522]">
                    {isCreateView
                      ? "Monte un gig net, flexible et facile a acheter."
                      : "Un marche de gigs concu pour vendre du travail solide, pas juste des vignettes."}
                  </h1>
                  <p className="mt-4 max-w-[720px] text-[16px] leading-7 text-[#5f6f82]">
                    {isCreateView
                      ? "On te guide du positionnement jusqu'a la publication, avec des packages clairs, une couverture forte et une lecture simple pour le client."
                      : "On garde la clarte d&apos;un marketplace de services, mais on ajoute la logique Pictomag: confiance, attention reelle, checkout fluide, dashboard vendeur et suivi de projet lisible."}
                  </p>

                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex flex-1 items-center gap-3 rounded-full border border-black/8 bg-[#f7f9fc] px-4 py-3">
                      <SearchIcon className="h-4 w-4 text-[#6b7788]" />
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Trouver un service, un vendeur ou un resultat"
                        className="w-full border-none bg-transparent text-[15px] text-[#101522] outline-none placeholder:text-[#9aa6b7]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView("seller")}
                      className="inline-flex items-center gap-2 rounded-full bg-[#101522] px-5 py-3 text-[14px] font-semibold text-white transition hover:-translate-y-[1px] hover:bg-[#182133]"
                    >
                      {isCreateView ? "Dashboard vendeur" : "Devenir vendeur"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {serviceCategories.map((category) => {
                      const active = activeCategory === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setActiveCategory(category)}
                          className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                            active
                              ? "bg-[#eef5ff] text-[#2b6fff] shadow-[0_8px_18px_rgba(43,111,255,0.14)]"
                              : "border border-black/7 bg-white text-[#405064] hover:border-black/12"
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <aside className="rounded-[10px] bg-[#0f172a] p-6 text-white shadow-[0_26px_64px_rgba(7,10,18,0.22)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                      <Sparkles className="h-5 w-5 text-[#7cb6ff]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/58">
                        {isCreateView ? "Parcours publieur" : "Signal vendeur"}
                      </p>
                      <p className="mt-2 text-[28px] font-semibold tracking-[-0.05em]">
                        {isCreateView ? "5 etapes tres lisibles" : "94% trust TimeLike"}
                      </p>
                      <p className="mt-2 text-[13px] leading-6 text-white/70">
                        {isCreateView
                          ? "Base, packages, livraison, galerie puis publication. Le client lit mieux, le vendeur corrige moins."
                          : "Les profils qui retiennent bien l&apos;attention restent mieux exposes et ferment mieux leurs gigs."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3">
                    <div className="rounded-[10px] border border-white/10 bg-white/6 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/58">
                        {isCreateView ? "Lecture client" : "Panier moyen"}
                      </p>
                      <p className="mt-2 text-[24px] font-semibold">{isCreateView ? "Titre + cover + prix" : "648 EUR"}</p>
                    </div>
                    <div className="rounded-[10px] border border-white/10 bg-white/6 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/58">
                        {isCreateView ? "Packages" : "Cycle de vente"}
                      </p>
                      <p className="mt-2 text-[24px] font-semibold">{isCreateView ? "Starter / Growth / Signature" : "3.1 jours"}</p>
                    </div>
                    <div className="rounded-[10px] border border-white/10 bg-white/6 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/58">
                        {isCreateView ? "Resultat" : "Paiement"}
                      </p>
                      <p className="mt-2 text-[24px] font-semibold">{isCreateView ? "Gig publiable" : "Escrow actif"}</p>
                    </div>
                  </div>
                </aside>
              </section>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-full border border-black/6 bg-white p-1 shadow-[0_16px_34px_rgba(15,23,42,0.06)]">
                  {[
                    { id: "discover", label: "Marketplace", icon: BriefcaseBusiness },
                    { id: "create", label: "Creer un gig", icon: FileText },
                    { id: "seller", label: "Dashboard vendeur", icon: LayoutDashboard },
                    { id: "tracker", label: "Suivi projet", icon: FolderKanban },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const active = activeView === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveView(tab.id as MarketplaceView)}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition ${
                          active ? "bg-[#101522] text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]" : "text-[#465569]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-black/6 bg-white px-4 py-2 text-[12px] font-medium text-[#4f6074] shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
                  <ShieldCheck className="h-4 w-4 text-[#2b6fff]" />
                  Brief qualifie + paiement protege + tracker vivant
                </div>
              </div>
            </>
          )}

          {activeView === "discover" ? (
            <section className="mt-6 grid grid-cols-4 gap-x-6 gap-y-10">
              {filteredDiscoverCards.map((card) => (
                <article key={card.id} className="group">
                  <button type="button" onClick={() => handleOpenGig(card.gigId)} className="block w-full text-left">
                    <div className="overflow-hidden rounded-[8px] bg-[#edf1f6]">
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={card.cover}
                          alt={card.title}
                          fill
                          sizes="340px"
                          className="object-cover transition duration-500 group-hover:scale-[1.02]"
                        />
                      </div>
                    </div>
                  </button>

                  <div className="mt-3 min-h-[46px]">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => handleOpenGig(card.gigId)}
                        className="line-clamp-2 text-left text-[17px] font-normal leading-[1.24] tracking-[-0.02em] text-[#111111]"
                      >
                        {card.title}
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 flex items-end justify-between gap-4">
                    <div className="flex min-w-0 items-end gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-[#2b6fff]/30">
                        <Image src={card.avatar} alt={card.seller} fill sizes="44px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium leading-none text-[#111111]">{card.seller}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="flex items-center gap-[1px] text-[12px] leading-none text-[#111111]">
                            <span>★</span>
                            <span>★</span>
                            <span>★</span>
                            <span>★</span>
                            <span>★</span>
                          </span>
                          <span className="rounded-full bg-[#111111] px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.08em] text-white">
                            PRO
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] font-normal text-[#4e4e4e]">Starting at</p>
                      <p className="mt-0.5 text-[17px] font-semibold leading-none text-[#111111]">{formatCurrency(card.price)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          ) : null}

          {activeView === "create" ? (
            <MarketplaceGigCreator
              draft={gigCreationDraft}
              currentStep={gigCreationStep}
              onStepChange={setGigCreationStep}
              onFieldChange={handleGigDraftFieldChange}
              onPackageFieldChange={handleGigDraftPackageChange}
              onSetRecommendedPackage={handleSetRecommendedPackage}
              onBackToSeller={() => setActiveView("seller")}
              onSaveDraft={handleSaveGigDraft}
              onPublish={handlePublishGigDraft}
            />
          ) : null}

          {false && activeView === "seller" ? (
            <section className="mt-6 space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {sellerPulse.map((card) => (
                  <div key={card.label} className="rounded-[10px] border border-black/6 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">{card.label}</p>
                    <p className="mt-3 text-[30px] font-semibold tracking-[-0.05em] text-[#101522]">{card.value}</p>
                    <p className="mt-2 text-[12px] text-[#607085]">{card.helper}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[420px_minmax(0,1fr)] gap-6">
                <div className="rounded-[10px] border border-black/6 bg-white p-5 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Vitrine vendeur</p>
                      <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#101522]">Vos gigs actifs</h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenGigCreator}
                      className="rounded-full bg-[#101522] px-4 py-2 text-[12px] font-semibold text-white"
                    >
                      Nouveau gig
                    </button>
                  </div>
                  <div className="mt-5 space-y-4">
                    {sellerDisplayGigs.map((gigRecord) => {
                      const gig = gigRecord.serviceGig;

                      return (
                      <button
                        key={gigRecord.id}
                        type="button"
                        onClick={() => {
                          if (gigRecord.id >= 9000) {
                            handleReopenSellerDraft(gigRecord);
                            return;
                          }

                          handleOpenGig(gigRecord.serviceGig.id);
                        }}
                        className="flex w-full items-center gap-4 rounded-[10px] border border-black/7 bg-[#f8fafc] p-3 text-left transition hover:border-black/12 hover:bg-white"
                      >
                        <div className="relative h-20 w-24 overflow-hidden rounded-[8px]">
                          <Image src={gigRecord.serviceGig.cover} alt={gigRecord.serviceGig.title} fill sizes="96px" className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[14px] font-semibold text-[#101522]">{gigRecord.serviceGig.title}</p>
                            {gigRecord.id >= 9000 ? (
                              <span className="rounded-full bg-[#eef5ff] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2b6fff]">
                                {gigRecord.statusLabel}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[12px] text-[#617185]">
                            {gig.queueSize} en file · {gig.deliveryLabel}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-[10px] font-semibold text-[#2b6fff]">
                              {gigRecord.serviceGig.timelikeTrust}% trust
                            </span>
                            <span className="rounded-full border border-black/7 px-2.5 py-1 text-[10px] font-semibold text-[#5d6d81]">
                              {formatCurrency(gigRecord.serviceGig.priceFrom)}
                            </span>
                          </div>
                        </div>
                      </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[10px] border border-black/6 bg-white p-5 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Pipeline</p>
                      <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#101522]">Ordres etat par etat</h3>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-black/7 bg-[#f8fafc] px-3 py-2 text-[12px] font-medium text-[#5f6f82]">
                      <TrendingUp className="h-4 w-4 text-[#2b6fff]" />
                      {formatCurrency(totalRevenue)} livres
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-5 gap-4">
                    {projectStages.map((stage, stageIndex) => (
                      <div key={stage.id} className="rounded-[10px] border border-black/7 bg-[#f8fafc] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b8797]">{stage.label}</p>
                        <div className="mt-4 space-y-3">
                          {orders
                            .filter((order) => order.stageIndex === stageIndex)
                            .map((order) => (
                              <button
                                key={order.id}
                                type="button"
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setActiveView("tracker");
                                }}
                                className="block w-full rounded-[8px] border border-black/7 bg-white px-3 py-3 text-left transition hover:border-black/12"
                              >
                                <p className="text-[13px] font-semibold text-[#101522]">{order.client}</p>
                                <p className="mt-1 text-[12px] text-[#647386]">{order.title}</p>
                                <p className="mt-2 text-[11px] text-[#2b6fff]">{formatCurrency(order.budget)}</p>
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-[10px] border border-black/7 bg-[#0f172a] p-5 text-white">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">Payout</p>
                      <p className="mt-2 text-[28px] font-semibold">{formatCurrency(totalRevenue - pendingRevenue)}</p>
                      <p className="mt-2 text-[12px] text-white/68">Deja libere au vendeur</p>
                    </div>
                    <div className="rounded-[10px] border border-black/7 bg-white p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b8797]">Acompte protege</p>
                      <p className="mt-2 text-[28px] font-semibold text-[#101522]">{formatCurrency(pendingRevenue)}</p>
                      <p className="mt-2 text-[12px] text-[#667487]">Encore retenu dans le tracker avant validation.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeView === "tracker" && selectedOrder ? (
            <section className="mt-6 grid grid-cols-[320px_minmax(0,1fr)] gap-6">
              <aside className="rounded-[10px] border border-black/6 bg-white p-4 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Projets</p>
                    <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-[#101522]">Tracker</h3>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef5ff] text-[#2b6fff]">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`block w-full rounded-[10px] border px-4 py-4 text-left transition ${
                        selectedOrderId === order.id
                          ? "border-[#cde3ff] bg-[#eef5ff] shadow-[0_14px_30px_rgba(43,111,255,0.12)]"
                          : "border-black/7 bg-[#f8fafc] hover:border-black/12"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[13px] font-semibold text-[#101522]">{order.client}</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#2b6fff]">
                          {projectStages[order.stageIndex]!.label}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] leading-5 text-[#5f6f82]">{order.title}</p>
                      <p className="mt-2 text-[11px] text-[#7b8797]">{order.lastUpdate}</p>
                    </button>
                  ))}
                </div>
              </aside>

              <div className="space-y-6">
                <div className="rounded-[10px] border border-black/6 bg-white p-6 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Projet en cours</p>
                      <h2 className="mt-2 text-[34px] font-semibold leading-[1.02] tracking-[-0.05em] text-[#101522]">
                        {selectedOrder.title}
                      </h2>
                      <p className="mt-3 max-w-[760px] text-[14px] leading-6 text-[#536173]">{selectedOrder.brief}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenGig(selectedOrder.gigId)}
                      className="rounded-full border border-black/8 bg-[#f8fafc] px-4 py-2 text-[12px] font-semibold text-[#101522]"
                    >
                      Ouvrir le gig
                    </button>
                  </div>
                  <div className="mt-6 grid grid-cols-4 gap-4">
                    <div className="rounded-[10px] border border-black/7 bg-[#f8fafc] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7b8797]">Client</p>
                      <p className="mt-2 text-[18px] font-semibold text-[#101522]">{selectedOrder.client}</p>
                    </div>
                    <div className="rounded-[10px] border border-black/7 bg-[#f8fafc] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7b8797]">Budget</p>
                      <p className="mt-2 text-[18px] font-semibold text-[#101522]">{formatCurrency(selectedOrder.budget)}</p>
                    </div>
                    <div className="rounded-[10px] border border-black/7 bg-[#f8fafc] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7b8797]">Deadline</p>
                      <p className="mt-2 text-[18px] font-semibold text-[#101522]">{selectedOrder.dueDate}</p>
                    </div>
                    <div className="rounded-[10px] border border-black/7 bg-[#f8fafc] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7b8797]">Trust</p>
                      <p className="mt-2 text-[18px] font-semibold text-[#101522]">{selectedOrder.timelikeTrust}%</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[10px] border border-black/7 bg-[#f8fafc] p-5">
                    <div className="flex items-center justify-between">
                      {projectStages.map((stage, index) => {
                        const isDone = index < selectedOrder.stageIndex;
                        const isCurrent = index === selectedOrder.stageIndex;

                        return (
                          <div key={stage.id} className="flex flex-1 items-center">
                            <div className="flex flex-col items-center text-center">
                              <div
                                className={`flex h-11 w-11 items-center justify-center rounded-full border text-[12px] font-semibold ${
                                  isDone
                                    ? "border-[#2b6fff] bg-[#2b6fff] text-white"
                                    : isCurrent
                                      ? "border-[#cde3ff] bg-[#eef5ff] text-[#2b6fff]"
                                      : "border-black/8 bg-white text-[#7b8797]"
                                }`}
                              >
                                {isDone ? <Check className="h-4 w-4" /> : index + 1}
                              </div>
                              <p className={`mt-3 text-[12px] font-semibold ${isCurrent ? "text-[#101522]" : "text-[#617185]"}`}>{stage.label}</p>
                              <p className="mt-1 text-[11px] text-[#91a0b2]">{stage.copy}</p>
                            </div>
                            {index !== projectStages.length - 1 ? (
                              <div className={`mx-3 h-[2px] flex-1 rounded-full ${index < selectedOrder.stageIndex ? "bg-[#2b6fff]" : "bg-black/8"}`} />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[1.05fr_0.95fr] gap-6">
                  <div className="rounded-[10px] border border-black/6 bg-white p-6 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Etat du projet</p>
                        <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#101522]">Milestones et decisions</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAdvanceOrder(selectedOrder.id)}
                        disabled={selectedOrder.stageIndex === projectStages.length - 1}
                        className="rounded-full bg-[#101522] px-4 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Etape suivante
                      </button>
                    </div>
                    <div className="mt-5 space-y-3">
                      {selectedOrder.notes.map((note, index) => (
                        <div key={note} className="flex items-start gap-3 rounded-[10px] border border-black/7 bg-[#f8fafc] px-4 py-3">
                          <div
                            className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full ${
                              index < selectedOrder.stageIndex + 1 ? "bg-[#eef5ff] text-[#2b6fff]" : "bg-white text-[#9aa6b7]"
                            }`}
                          >
                            {index < selectedOrder.stageIndex + 1 ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Clock3 className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <p className="text-[13px] leading-6 text-[#233042]">{note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-[10px] border border-black/6 bg-white p-6 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef5ff] text-[#2b6fff]">
                          <CircleDollarSign className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Paiement</p>
                          <h3 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-[#101522]">
                            {selectedOrder.paymentReleased ? "Paiement libere" : "Escrow protege"}
                          </h3>
                        </div>
                      </div>
                      <p className="mt-4 text-[14px] leading-6 text-[#536173]">
                        {selectedOrder.paymentReleased
                          ? "Le paiement final est libere. Le projet peut etre archive ou transformer en nouveau gig."
                          : "Le budget reste protege jusqu'a la validation finale ou la prochaine liberation d'etape."}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleReleasePayment(selectedOrder.id)}
                        disabled={selectedOrder.paymentReleased}
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#101522] px-4 py-2.5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Liberer le paiement
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="rounded-[10px] border border-black/6 bg-white p-6 shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Log projet</p>
                      <div className="mt-4 space-y-3 text-[13px]">
                        <div className="flex items-start gap-3 rounded-[10px] border border-black/7 bg-[#f8fafc] px-4 py-3">
                          <CalendarClock className="mt-0.5 h-4 w-4 text-[#2b6fff]" />
                          <div>
                            <p className="font-semibold text-[#101522]">Prochaine echeance</p>
                            <p className="mt-1 text-[#647386]">{selectedOrder.dueDate}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-[10px] border border-black/7 bg-[#f8fafc] px-4 py-3">
                          <MessageSquareText className="mt-0.5 h-4 w-4 text-[#2b6fff]" />
                          <div>
                            <p className="font-semibold text-[#101522]">Derniere note</p>
                            <p className="mt-1 text-[#647386]">{selectedOrder.lastUpdate}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-[10px] border border-black/7 bg-[#f8fafc] px-4 py-3">
                          <FileText className="mt-0.5 h-4 w-4 text-[#2b6fff]" />
                          <div>
                            <p className="font-semibold text-[#101522]">Brief stocke</p>
                            <p className="mt-1 line-clamp-3 text-[#647386]">{selectedOrder.brief}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </main>

        <MarketplaceGigDrawer gig={selectedGig} onClose={() => setSelectedGigId(null)} onCheckout={handleStartCheckout} />
        <CheckoutModal
          gig={checkoutGig}
          selectedPackage={checkoutPackage}
          paymentMethod={paymentMethod}
          brief={buyerBrief}
          onBriefChange={setBuyerBrief}
          onMethodChange={setPaymentMethod}
          onClose={() => setCheckoutState(null)}
          onConfirm={handleConfirmCheckout}
        />
      </div>
    </div>
  );
}
