"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  Layers3,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { AnimatedHeaderNav, type HeaderNavItemId } from "@/components/animated-header-nav";
import {
  type GigPackage,
  type HeaderPanelId,
  type PaymentMethod,
  type ServiceGig,
  getMarketplaceGigHref,
  projectStages,
  seedOrders,
  topCreateOptions,
  topMessages,
  topNotifications,
} from "@/lib/marketplace-data";
import { createMarketplaceOrder } from "@/lib/marketplace-orders";
import { readMarketplaceOrdersFromApi, writeMarketplaceOrdersToApi } from "@/lib/state-api";

const topActions = [
  { id: "create", src: "/figma-assets/top-plus.svg", left: 0, label: "Create" },
  { id: "notifications", src: "/figma-assets/top-notification.svg", left: 42, label: "Notifications" },
  { id: "messages", src: "/figma-assets/top-message.svg", left: 84, label: "Messages" },
] as const;

type GigAddOn = {
  id: string;
  label: string;
  helper: string;
  price: number;
};

type GigDetailTab = "description" | "compare" | "faq" | "reviews";

type GigReview = {
  author: string;
  country: string;
  rating: string;
  copy: string;
  time: string;
};

const detailGalleryByGigId: Record<number, string[]> = {
  1: [
    "/figma-assets/photo-feed/photo-grid-6.jpg",
    "/figma-assets/photo-feed/photo-grid-7.jpg",
    "/figma-assets/photo-feed/photo-grid-8.jpg",
    "/figma-assets/photo-feed/photo-grid-5.jpg",
  ],
  2: [
    "/figma-assets/photo-feed/photo-grid-5.jpg",
    "/figma-assets/photo-feed/photo-grid-2.jpg",
    "/figma-assets/photo-feed/photo-grid-6.jpg",
    "/figma-assets/photo-feed/photo-grid-1.jpg",
  ],
  3: [
    "/figma-assets/photo-feed/photo-grid-4.jpg",
    "/figma-assets/photo-feed/photo-grid-8.jpg",
    "/figma-assets/photo-feed/photo-grid-7.jpg",
    "/figma-assets/photo-feed/photo-grid-3.jpg",
  ],
  4: [
    "/figma-assets/photo-feed/photo-grid-3.jpg",
    "/figma-assets/photo-feed/photo-grid-1.jpg",
    "/figma-assets/photo-feed/photo-grid-2.jpg",
    "/figma-assets/photo-feed/photo-grid-5.jpg",
  ],
};

const detailFaqsByGigId: Record<number, { question: string; answer: string }[]> = {
  1: [
    {
      question: "Le design est-il fait pour convertir ou juste pour etre joli ?",
      answer: "On travaille une page service qui vend: hero, preuve, structure d'offre, packages et CTA clairs.",
    },
    {
      question: "Peut-on partir d'une base existante ?",
      answer: "Oui. Je peux reprendre une page deja en ligne, un wireframe, ou une maquette partielle et la remettre au propre.",
    },
    {
      question: "Que se passe-t-il apres paiement ?",
      answer: "Le brief s'ouvre, le tracker projet se lance, puis on aligne direction, production, revision et livraison.",
    },
  ],
  2: [
    {
      question: "Vous fournissez les hooks et le rythme ?",
      answer: "Oui. Le but est de donner une base exploitable pour reels, shorts et creatives social ads.",
    },
    {
      question: "Le systeme est-il reutilisable ?",
      answer: "Oui. Les transitions et hooks sont livres pour etre re-utilises sur plusieurs videos.",
    },
    {
      question: "Les exports sont-ils prevus pour le feed vertical ?",
      answer: "Oui. Le livrable est pense en 9:16 avec rythme, zones de texte et cadrage mobile.",
    },
  ],
  3: [
    {
      question: "Vous aidez sur la clarte de l'offre ?",
      answer: "Oui. La page n'est pas seulement redessinee, elle est aussi re-structuree pour clarifier la promesse.",
    },
    {
      question: "Peut-on garder notre branding actuel ?",
      answer: "Oui. On peut partir de ton systeme existant et seulement le rendre plus lisible et plus vendable.",
    },
    {
      question: "Le travail inclut-il une logique mobile ?",
      answer: "Oui. La page est pensee desktop-first mais reste propre sur mobile.",
    },
  ],
  4: [
    {
      question: "Le son est-il utilisable sur reels, ads et produit ?",
      answer: "Oui. La livraison couvre les usages courts, signatures, loops et version plus produit si besoin.",
    },
    {
      question: "Puis-je demander une revision du mix ?",
      answer: "Oui. Le nombre de revisions depend du package choisi.",
    },
    {
      question: "Les fichiers master sont-ils livres ?",
      answer: "Oui. Les masters et exports principaux sont inclus selon le package.",
    },
  ],
};

const detailReviewsByGigId: Record<number, GigReview[]> = {
  1: [
    {
      author: "Camille Morel",
      country: "France",
      rating: "5.0",
      copy: "Le layout et les packages ont tout de suite rendu notre offre plus lisible. Le travail est propre, rapide et pense business.",
      time: "il y a 6 jours",
    },
    {
      author: "Nathan Ross",
      country: "Belgique",
      rating: "4.9",
      copy: "Le niveau de clarte sur la hierarchie et les sections de vente est tres fort. On a gagne du temps des le premier aller-retour.",
      time: "il y a 2 semaines",
    },
    {
      author: "Aurore Studio",
      country: "Suisse",
      rating: "5.0",
      copy: "Tres bon niveau de finition. Le rendu est sobre, premium et surtout facile a exploiter derriere en production.",
      time: "il y a 1 mois",
    },
  ],
  2: [
    {
      author: "Lina Crew",
      country: "France",
      rating: "5.0",
      copy: "Les transitions sont propres, faciles a re-injecter et tiennent vraiment mieux l'attention sur nos reels.",
      time: "il y a 4 jours",
    },
    {
      author: "Chrome Lab",
      country: "Belgique",
      rating: "4.8",
      copy: "Bon rythme, bonne execution. On sent qu'il y a un vrai regard sur le pacing et pas juste un preset.",
      time: "il y a 2 semaines",
    },
  ],
  3: [
    {
      author: "Mia Laurent",
      country: "France",
      rating: "5.0",
      copy: "On a enfin une page qui explique notre valeur sans perdre les visiteurs. Le travail est vraiment utile commercialement.",
      time: "il y a 5 jours",
    },
    {
      author: "North Team",
      country: "Canada",
      rating: "4.9",
      copy: "Tres bonne reprise de notre offre technique. La structure rassure et simplifie tout de suite la lecture.",
      time: "il y a 3 semaines",
    },
  ],
  4: [
    {
      author: "Clara Sound",
      country: "France",
      rating: "5.0",
      copy: "Le sound logo est simple, memorisable et propre. Bonne ecoute et bonne execution sur les revisions.",
      time: "il y a 1 semaine",
    },
    {
      author: "Riveline",
      country: "Belgique",
      rating: "4.8",
      copy: "Les versions courtes et loop nous ont permis d'utiliser le son sur plusieurs points du produit sans friction.",
      time: "il y a 1 mois",
    },
  ],
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function MarketplaceDetailCheckoutModal({
  gig,
  selectedPackage,
  selectedAddOns,
  paymentMethod,
  brief,
  total,
  onMethodChange,
  onBriefChange,
  onClose,
  onConfirm,
}: {
  gig: ServiceGig;
  selectedPackage: GigPackage;
  selectedAddOns: GigAddOn[];
  paymentMethod: PaymentMethod;
  brief: string;
  total: number;
  onMethodChange: (value: PaymentMethod) => void;
  onBriefChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  const serviceFee = Math.max(18, Math.round(total * 0.07));
  const grandTotal = total + serviceFee;

  return createPortal(
    <div className="fixed inset-0 z-[260]">
      <button
        type="button"
        aria-label="Fermer le paiement"
        className="absolute inset-0 bg-[rgba(7,10,18,0.58)] backdrop-blur-[6px]"
        onClick={onClose}
      />

      <div className="absolute left-1/2 top-1/2 w-[860px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[10px] border border-white/12 bg-white shadow-[0_38px_100px_rgba(8,12,24,0.34)]">
        <div className="flex items-center justify-between border-b border-black/6 px-7 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b8797]">Paiement securise</p>
            <h3 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[#101522]">Finaliser la commande</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-[#f6f8fb] text-[#101522]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-[1.08fr_0.92fr]">
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
                  {selectedPackage.price} EUR
                </span>
              </div>
              <p className="mt-4 text-[13px] leading-6 text-[#536173]">{selectedPackage.description}</p>
            </div>

            {selectedAddOns.length > 0 ? (
              <div className="mt-5 rounded-[10px] border border-black/7 bg-white p-5">
                <p className="text-[13px] font-semibold text-[#101522]">Options ajoutees</p>
                <div className="mt-3 space-y-3">
                  {selectedAddOns.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[13px] text-[#506073]">
                      <span>{item.label}</span>
                      <span className="font-semibold text-[#101522]">{item.price} EUR</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <p className="text-[14px] font-semibold text-[#101522]">Moyen de paiement</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { id: "card", label: "Carte", icon: CreditCard },
                  { id: "wallet", label: "Wallet", icon: Wallet },
                  { id: "bank", label: "Virement", icon: Banknote },
                ].map((method) => {
                  const Icon = method.icon;
                  const active = paymentMethod === method.id;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => onMethodChange(method.id as PaymentMethod)}
                      className={`rounded-[10px] border px-4 py-4 text-left transition ${
                        active ? "border-[#cde3ff] bg-[#eef5ff]" : "border-black/7 bg-white hover:border-black/12"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? "text-[#2b6fff]" : "text-[#101522]"}`} />
                      <p className="mt-3 text-[13px] font-semibold text-[#101522]">{method.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[14px] font-semibold text-[#101522]">Brief du projet</p>
                <span className="text-[12px] text-[#7b8797]">Objectif, references, contraintes et livrables.</span>
              </div>
              <textarea
                value={brief}
                onChange={(event) => onBriefChange(event.target.value)}
                rows={7}
                className="mt-3 w-full resize-none rounded-[10px] border border-black/8 bg-[#f8fafc] px-4 py-3 text-[14px] leading-6 text-[#101522] outline-none placeholder:text-[#9aa6b7]"
                placeholder="Exemple: j'ai besoin d'une page simple, sobre, avec un hero fort et 3 sections de vente."
              />
            </div>
          </div>

          <div className="bg-[#101522] px-7 py-6 text-white">
            <div className="rounded-[10px] border border-white/10 bg-white/4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56">Recap</p>
                  <p className="mt-2 text-[20px] font-semibold">{selectedPackage.name}</p>
                </div>
                <p className="text-[28px] font-semibold">{selectedPackage.price} EUR</p>
              </div>

              <div className="mt-5 space-y-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Package</span>
                  <span>{selectedPackage.price} EUR</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Options flex</span>
                  <span>{selectedAddOns.reduce((sum, item) => sum + item.price, 0)} EUR</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Protection plateforme</span>
                  <span>{serviceFee} EUR</span>
                </div>
                <div className="border-t border-white/10 pt-3 text-[19px] font-semibold">
                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span>{grandTotal} EUR</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[10px] border border-white/10 bg-white/4 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/56">Ce qui se passe ensuite</p>
              <div className="mt-4 space-y-3 text-[13px] leading-6 text-white/78">
                <p>1. Le paiement est securise et bloque.</p>
                <p>2. Le brief part dans le tracker projet.</p>
                <p>3. Le vendeur valide, produit, livre, puis le paiement se debloque.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onConfirm}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-white px-5 py-3 text-[14px] font-semibold text-[#101522] transition hover:-translate-y-[1px]"
            >
              Payer et ouvrir le tracker
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function MarketplaceGigDetailPage({
  gig,
  initialPackageId,
}: {
  gig: ServiceGig;
  initialPackageId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [headerPanel, setHeaderPanel] = useState<HeaderPanelId>(null);
  const [selectedPackageId, setSelectedPackageId] = useState(initialPackageId ?? gig.packages[0]?.id ?? "");
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [buyerBrief, setBuyerBrief] = useState("Objectif, contexte, references, contraintes et resultat attendu.");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GigDetailTab>("description");
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [savedGig, setSavedGig] = useState(false);

  const selectedPackage =
    gig.packages.find((pkg) => pkg.id === selectedPackageId) ?? gig.packages[0] ?? null;
  const galleryItems = useMemo(() => detailGalleryByGigId[gig.id] ?? [gig.cover], [gig.cover, gig.id]);
  const activeMedia = galleryItems[Math.min(selectedMediaIndex, Math.max(galleryItems.length - 1, 0))] ?? gig.cover;
  const faqItems = detailFaqsByGigId[gig.id] ?? detailFaqsByGigId[1];
  const reviewItems = detailReviewsByGigId[gig.id] ?? detailReviewsByGigId[1];
  const sellerRating = useMemo(
    () => (Math.round((4.68 + (gig.timelikeTrust / 100) * 0.27) * 10) / 10).toFixed(1),
    [gig.timelikeTrust],
  );
  const reviewCount = gig.completedOrders * 6 + gig.queueSize * 5 + 19;
  const savedByCount = Math.max(8, Math.round(gig.completedOrders / 3));
  const comparisonRows = useMemo(() => {
    const featureRows = Array.from(new Set(gig.packages.flatMap((pkg) => pkg.features)));

    return [
      {
        label: "Prix",
        values: gig.packages.map((pkg) => formatCurrency(pkg.price)),
      },
      {
        label: "Livraison",
        values: gig.packages.map((pkg) => `${pkg.deliveryDays} jours`),
      },
      {
        label: "Revisions",
        values: gig.packages.map((pkg) => pkg.revisions),
      },
      ...featureRows.map((feature) => ({
        label: feature,
        values: gig.packages.map((pkg) => pkg.features.includes(feature)),
      })),
    ];
  }, [gig.packages]);

  const addOns = useMemo<GigAddOn[]>(() => {
    const packagePrice = selectedPackage?.price ?? gig.priceFrom;

    return [
      {
        id: "express",
        label: "Livraison express",
        helper: "Priorite dans le planning du vendeur",
        price: Math.max(35, Math.round(packagePrice * 0.18)),
      },
      {
        id: "handoff",
        label: "Video handoff",
        helper: "Passation Loom + logique de fichiers",
        price: 45,
      },
      {
        id: "revision",
        label: "Revision supplementaire",
        helper: "Une iteration en plus pour ajuster",
        price: 35,
      },
    ];
  }, [gig.priceFrom, selectedPackage?.price]);

  const selectedAddOns = addOns.filter((item) => selectedAddOnIds.includes(item.id));
  const addOnTotal = selectedAddOns.reduce((sum, item) => sum + item.price, 0);
  const subtotal = (selectedPackage?.price ?? 0) + addOnTotal;

  useEffect(() => {
    const nextPackageId = initialPackageId ?? gig.packages[0]?.id ?? "";

    queueMicrotask(() => {
      setSelectedPackageId(nextPackageId);
      setSelectedAddOnIds([]);
      setSelectedMediaIndex(0);
      setActiveTab("description");
      setSavedGig(false);
    });
  }, [gig.id, gig.packages, initialPackageId]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToastMessage(null), 2600);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (checkoutOpen) {
          setCheckoutOpen(false);
          return;
        }

        setHeaderPanel(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [checkoutOpen]);

  const handleHeaderNav = (itemId: HeaderNavItemId) => {
    if (itemId === "home") {
      router.push("/");
      return;
    }

    if (itemId === "watch") {
      router.push("/live-shopping");
      return;
    }

    router.push("/marketplace");
  };

  const handleHeaderPanelAction = (panel: HeaderPanelId) => {
    setHeaderPanel((current) => (current === panel ? null : panel));
  };

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackageId(packageId);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("package", packageId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const handleToggleAddOn = (addOnId: string) => {
    setSelectedAddOnIds((current) =>
      current.includes(addOnId) ? current.filter((item) => item !== addOnId) : [...current, addOnId],
    );
  };

  const handlePrevMedia = () => {
    if (galleryItems.length <= 1) {
      return;
    }

    setSelectedMediaIndex((current) => (current === 0 ? galleryItems.length - 1 : current - 1));
  };

  const handleNextMedia = () => {
    if (galleryItems.length <= 1) {
      return;
    }

    setSelectedMediaIndex((current) => (current === galleryItems.length - 1 ? 0 : current + 1));
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToastMessage("Lien du gig copie.");
    } catch {
      setToastMessage("Impossible de copier le lien.");
    }
  };

  const handleToggleSave = () => {
    setSavedGig((current) => {
      const next = !current;
      setToastMessage(next ? "Gig enregistre." : "Gig retire des enregistrements.");
      return next;
    });
  };

  const handleContactSeller = () => {
    setToastMessage(`Conversation ouverte avec ${gig.seller}.`);
  };

  const scrollToTabSection = (nextTab: GigDetailTab) => {
    setActiveTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById("marketplace-gig-tabs")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleConfirmCheckout = async () => {
    if (!selectedPackage) {
      return;
    }

    const nextOrder = createMarketplaceOrder({
      gig,
      selectedPackage,
      brief: buyerBrief,
      totalBudget: subtotal,
    });
    const existingOrders = await readMarketplaceOrdersFromApi(seedOrders);
    await writeMarketplaceOrdersToApi([nextOrder, ...existingOrders]);
    setCheckoutOpen(false);
    router.push(`/marketplace?view=tracker&order=${nextOrder.id}`);
  };

  if (!selectedPackage) {
    return null;
  }

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
                  router.push(item.id === "discover" ? "/marketplace" : `/marketplace?view=${item.id}`);
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
                  router.push("/marketplace?view=tracker");
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
              { href: "/marketplace", label: "Explorer les gigs" },
              { href: "/marketplace?view=seller", label: "Dashboard vendeur" },
              { href: "/marketplace?view=tracker", label: "Suivi projet" },
              { href: "/", label: "Retour au feed principal" },
            ].map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  router.push(item.href);
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

            <AnimatedHeaderNav activeItemId="shop" onItemClick={handleHeaderNav} />

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

        <main className="px-10 pb-20 pt-[102px]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push("/marketplace")}
              className="inline-flex items-center gap-2 rounded-[10px] border border-black/8 bg-white px-4 py-2 text-[13px] font-medium text-[#101522] transition hover:-translate-y-[1px]"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour marketplace
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-[10px] border border-black/8 bg-white px-4 py-2 text-[13px] font-medium text-[#101522] transition hover:-translate-y-[1px]"
            >
              <Copy className="h-4 w-4" />
              Copier le lien
            </button>
          </div>

          <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8792a4]">
            Pictomag marketplace / {gig.category} / {gig.seller}
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_376px] gap-9">
            <div>
              <h1 className="max-w-[840px] text-[44px] font-semibold leading-[1.02] tracking-[-0.055em] text-[#101522]">
                {gig.title}
              </h1>

              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-12 w-12 overflow-hidden rounded-[10px] border border-black/8 bg-[#f7f8fb]">
                  <Image src={gig.avatar} alt={gig.seller} fill sizes="48px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[16px] font-semibold text-[#101522]">{gig.seller}</p>
                    <span className="rounded-[10px] bg-[#f2f5fa] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6f7c8f]">
                      {gig.category}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[#647386]">
                    <span>{gig.handle}</span>
                    <span className="h-1 w-1 rounded-full bg-[#b4bfce]" />
                    <span>{gig.queueSize} projet{gig.queueSize > 1 ? "s" : ""} en file</span>
                    <span className="h-1 w-1 rounded-full bg-[#b4bfce]" />
                    <span>{sellerRating} ({reviewCount})</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[10px] border border-black/8 bg-white">
                <div className="relative aspect-[16/10] bg-[#f6f8fb]">
                  <Image src={activeMedia} alt={gig.title} fill sizes="980px" className="object-cover" />
                  {galleryItems.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevMedia}
                        aria-label="Visuel precedent"
                        className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[10px] border border-white/18 bg-black/35 text-white backdrop-blur-[8px] transition hover:bg-black/48"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMedia}
                        aria-label="Visuel suivant"
                        className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[10px] border border-white/18 bg-black/35 text-white backdrop-blur-[8px] transition hover:bg-black/48"
                      >
                        <ArrowRight className="h-5 w-5" />
                      </button>
                    </>
                  ) : null}
                </div>
                <div className="grid grid-cols-4 gap-3 border-t border-black/8 bg-white p-3">
                  {galleryItems.map((item, index) => {
                    const active = index === selectedMediaIndex;

                    return (
                      <button
                        key={`${item}-${index}`}
                        type="button"
                        onClick={() => setSelectedMediaIndex(index)}
                        className={`relative aspect-[16/10] overflow-hidden rounded-[10px] border transition ${
                          active ? "border-[#101522]" : "border-black/8 hover:border-black/18"
                        }`}
                      >
                        <Image src={item} alt="" fill sizes="220px" className="object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {gig.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-[10px] bg-[#f3f7ff] px-3 py-1.5 text-[12px] font-medium text-[#3d67c9]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div id="marketplace-gig-tabs" className="mt-7 border-b border-black/10">
                <div className="flex gap-8">
                  {[
                    { id: "description", label: "Description" },
                    { id: "compare", label: "Compare packages" },
                    { id: "faq", label: "Faq" },
                    { id: "reviews", label: "Reviews" },
                  ].map((tab) => {
                    const active = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as GigDetailTab)}
                        className={`border-b-2 pb-4 text-[14px] font-medium transition ${
                          active
                            ? "border-[#2b6fff] text-[#101522]"
                            : "border-transparent text-[#6c7788] hover:text-[#101522]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-7">
                {activeTab === "description" ? (
                  <div className="space-y-8">
                    <section>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8792a4]">Description</p>
                      <p className="mt-3 max-w-[860px] text-[16px] leading-8 text-[#4c5a6d]">{gig.subtitle}</p>
                    </section>

                    <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 border-t border-black/8 pt-7">
                      <section>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8792a4]">Inclus</p>
                        <h2 className="mt-3 text-[26px] font-semibold tracking-[-0.04em] text-[#101522]">Ce que tu recois</h2>
                        <div className="mt-5 space-y-3">
                          {gig.deliverables.map((item) => (
                            <div key={item} className="flex items-center gap-3 text-[14px] text-[#243144]">
                              <Check className="h-4 w-4 text-[#2b6fff]" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8792a4]">Workflow</p>
                        <h2 className="mt-3 text-[26px] font-semibold tracking-[-0.04em] text-[#101522]">Comment on avance</h2>
                        <div className="mt-5 space-y-4">
                          {projectStages.map((stage, index) => (
                            <div key={stage.id} className="flex gap-3">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-[#eef5ff] text-[12px] font-semibold text-[#2b6fff]">
                                {index + 1}
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-[#101522]">{stage.label}</p>
                                <p className="mt-1 text-[12px] leading-5 text-[#647386]">{stage.copy}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    <section className="border-t border-black/8 pt-7">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#eef5ff] text-[#2b6fff]">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8792a4]">Brief</p>
                          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-[#101522]">
                            Ce dont le vendeur aura besoin
                          </h2>
                        </div>
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-6">
                        {[
                          "Objectif du gig et contexte du projet",
                          "References visuelles ou liens existants",
                          "Contraintes, priorites et livrables attendus",
                        ].map((item) => (
                          <div key={item} className="text-[14px] leading-6 text-[#536173]">
                            {item}
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : null}

                {activeTab === "compare" ? (
                  <section className="overflow-hidden border-t border-black/8 pt-7">
                    <div className="pb-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8792a4]">Compare Packages</p>
                      <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[#101522]">
                        Choisis le bon niveau de livraison
                      </h2>
                    </div>
                    <table className="w-full table-fixed">
                      <thead>
                        <tr className="border-b border-black/8 text-left">
                          <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8792a4]">Package</th>
                          {gig.packages.map((pkg) => (
                            <th key={pkg.id} className="px-4 py-4 align-top">
                              <div className={`rounded-[10px] px-4 py-4 ${pkg.id === selectedPackage.id ? "bg-[#eef5ff]" : "bg-[#f8fafc]"}`}>
                                <p className="text-[15px] font-semibold text-[#101522]">{pkg.name}</p>
                                <p className="mt-2 text-[24px] font-semibold tracking-[-0.05em] text-[#101522]">{formatCurrency(pkg.price)}</p>
                                <p className="mt-1 text-[12px] text-[#647386]">{pkg.deliveryDays} jours</p>
                                {pkg.recommended ? (
                                  <span className="mt-3 inline-flex rounded-[10px] bg-[#101522] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                                    Recommande
                                  </span>
                                ) : null}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonRows.map((row, rowIndex) => (
                          <tr key={row.label} className={rowIndex !== comparisonRows.length - 1 ? "border-b border-black/6" : ""}>
                            <td className="px-6 py-4 text-[14px] font-medium text-[#445366]">{row.label}</td>
                            {row.values.map((value, index) => (
                              <td key={`${row.label}-${index}`} className="px-4 py-4 text-center text-[14px] text-[#101522]">
                                {typeof value === "boolean" ? (
                                  value ? <Check className="mx-auto h-4 w-4 text-[#2b6fff]" /> : <span className="text-[#c0c7d2]">-</span>
                                ) : (
                                  value
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ) : null}

                {activeTab === "faq" ? (
                  <section className="space-y-0 border-t border-black/8 pt-7">
                    {faqItems.map((item) => (
                      <div key={item.question} className="border-b border-black/8 py-5 last:border-b-0">
                        <p className="text-[18px] font-semibold tracking-[-0.03em] text-[#101522]">{item.question}</p>
                        <p className="mt-3 text-[14px] leading-7 text-[#536173]">{item.answer}</p>
                      </div>
                    ))}
                  </section>
                ) : null}

                {activeTab === "reviews" ? (
                  <section className="space-y-0 border-t border-black/8 pt-7">
                    {reviewItems.map((review) => (
                      <div key={`${review.author}-${review.time}`} className="border-b border-black/8 py-5 last:border-b-0">
                        <div className="flex items-start justify-between gap-6">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-[17px] font-semibold text-[#101522]">{review.author}</p>
                              <span className="text-[13px] text-[#6b788a]">{review.country}</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[13px]">
                              <span className="tracking-[0.16em] text-[#101522]">5/5</span>
                              <span className="font-semibold text-[#101522]">{review.rating}</span>
                            </div>
                          </div>
                          <span className="text-[12px] text-[#7b8797]">{review.time}</span>
                        </div>
                        <p className="mt-4 max-w-[820px] text-[14px] leading-7 text-[#536173]">{review.copy}</p>
                      </div>
                    ))}
                  </section>
                ) : null}
              </div>
            </div>

            <aside className="sticky top-[96px] h-fit space-y-4">
              <div className="rounded-[10px] border border-black/8 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-[10px] border border-black/8 bg-[#f7f8fb]">
                      <Image src={gig.avatar} alt={gig.seller} fill sizes="48px" className="object-cover" />
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold text-[#101522]">{gig.seller}</p>
                      <p className="mt-1 text-[13px] text-[#647386]">{gig.handle}</p>
                      <p className="mt-2 text-[12px] text-[#7b8797]">{gig.queueSize} ordre{gig.queueSize > 1 ? "s" : ""} en file</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleContactSeller}
                    className="rounded-[10px] bg-[#2b6fff] px-4 py-2 text-[12px] font-semibold text-white transition hover:-translate-y-[1px]"
                  >
                    Contact seller
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-black/8 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] tracking-[0.16em] text-[#101522]">★★★★★</span>
                    <span className="text-[14px] font-semibold text-[#101522]">{sellerRating}</span>
                    <span className="text-[13px] text-[#7b8797]">({reviewCount})</span>
                  </div>
                  <span className="text-[12px] text-[#7b8797]">{gig.completedOrders} livres</span>
                </div>

                <div className="mt-4 flex items-center gap-5 text-[12px] text-[#6c7788]">
                  <button
                    type="button"
                    onClick={handleToggleSave}
                    className="text-left transition hover:text-[#101522]"
                  >
                    <p className="font-semibold text-[#101522]">{savedGig ? "Saved" : "Save"}</p>
                    <p className="mt-1">{savedByCount}+ personnes sauvegardent</p>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="text-left transition hover:text-[#101522]"
                  >
                    <p className="font-semibold text-[#101522]">Share</p>
                    <p className="mt-1">Lien externe pret</p>
                  </button>
                </div>
              </div>

              <div className="rounded-[10px] border border-black/8 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.04)]">
                <div className="flex gap-4 border-b border-black/8 pb-4">
                  {gig.packages.map((pkg) => {
                    const active = selectedPackage.id === pkg.id;

                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => handlePackageSelect(pkg.id)}
                        className={`border-b-2 pb-2 text-[14px] font-medium transition ${
                          active
                            ? "border-[#2b6fff] text-[#101522]"
                            : "border-transparent text-[#7b8797] hover:text-[#101522]"
                        }`}
                      >
                        {pkg.name}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[20px] font-semibold tracking-[-0.04em] text-[#101522]">{selectedPackage.name}</p>
                        {selectedPackage.recommended ? (
                          <span className="rounded-[10px] bg-[#edf3ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2b6fff]">
                            Recommande
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[13px] leading-6 text-[#556477]">{selectedPackage.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[34px] font-semibold leading-none tracking-[-0.06em] text-[#101522]">
                        {formatCurrency(selectedPackage.price)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-5 text-[13px] text-[#536173]">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-[#101522]" />
                      <span>{selectedPackage.deliveryDays} jours</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-[#101522]" />
                      <span>{selectedPackage.revisions}</span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {selectedPackage.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3 text-[13px] text-[#233042]">
                        <Check className="h-4 w-4 text-[#2b6fff]" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 border-t border-black/8 pt-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8792a4]">Options flex</p>
                      <p className="mt-1 text-[13px] leading-6 text-[#556477]">Ajoute seulement ce qui sert vraiment la vente.</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {addOns.map((item) => {
                        const active = selectedAddOnIds.includes(item.id);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleToggleAddOn(item.id)}
                            className={`flex w-full items-start justify-between rounded-[10px] px-4 py-3 text-left transition ${
                              active ? "bg-[#eef5ff]" : "bg-[#f8fafc] hover:bg-[#f3f6fb]"
                            }`}
                          >
                            <div className="pr-4">
                              <p className="text-[13px] font-semibold text-[#101522]">{item.label}</p>
                              <p className="mt-1 text-[12px] leading-5 text-[#647386]">{item.helper}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[14px] font-semibold text-[#101522]">{formatCurrency(item.price)}</p>
                              <p className="mt-1 text-[11px] text-[#7b8797]">{active ? "Ajoute" : "Option"}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 border-t border-black/8 pt-4 text-[13px] text-[#536173]">
                    <div className="flex items-center justify-between">
                      <span>Package</span>
                      <span className="font-semibold text-[#101522]">{formatCurrency(selectedPackage.price)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Options flex</span>
                      <span className="font-semibold text-[#101522]">{formatCurrency(addOnTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 text-[16px]">
                      <span className="font-semibold text-[#101522]">Sous-total</span>
                      <span className="font-semibold text-[#101522]">{formatCurrency(subtotal)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCheckoutOpen(true)}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#101522] px-5 py-3 text-[14px] font-semibold text-white transition hover:-translate-y-[1px]"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToTabSection("compare")}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-[10px] border border-black/8 bg-white px-5 py-3 text-[13px] font-medium text-[#101522] transition hover:-translate-y-[1px]"
                  >
                    Compare packages
                  </button>

                  <p className="mt-4 text-[11px] leading-5 text-[#7b8797]">
                    URL partageable: <span className="font-medium text-[#101522]">{getMarketplaceGigHref(gig)}</span>
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {checkoutOpen && selectedPackage ? (
        <MarketplaceDetailCheckoutModal
          gig={gig}
          selectedPackage={selectedPackage}
          selectedAddOns={selectedAddOns}
          paymentMethod={paymentMethod}
          brief={buyerBrief}
          total={subtotal}
          onMethodChange={setPaymentMethod}
          onBriefChange={setBuyerBrief}
          onClose={() => setCheckoutOpen(false)}
          onConfirm={handleConfirmCheckout}
        />
      ) : null}

      {toastMessage ? (
        <div className="fixed bottom-8 left-1/2 z-[300] -translate-x-1/2 rounded-full bg-[#101522] px-4 py-2 text-[13px] font-medium text-white shadow-[0_16px_44px_rgba(8,12,24,0.24)]">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
