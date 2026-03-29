import type { GigPackage, ProjectOrder, ServiceGig } from "@/lib/marketplace-data";

export const MARKETPLACE_ORDERS_STORAGE_KEY = "pictomag-marketplace-orders";

export function readMarketplaceOrders() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(MARKETPLACE_ORDERS_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ProjectOrder[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeMarketplaceOrders(orders: ProjectOrder[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MARKETPLACE_ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function formatDueDate(deliveryDays: number) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + deliveryDays);

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(targetDate);
}

export function createMarketplaceOrder({
  gig,
  selectedPackage,
  brief,
  totalBudget,
}: {
  gig: ServiceGig;
  selectedPackage: GigPackage;
  brief: string;
  totalBudget: number;
}) {
  const createdAt = Date.now();

  return {
    id: createdAt,
    gigId: gig.id,
    title: gig.title,
    client: "Vous",
    seller: gig.seller,
    budget: totalBudget,
    dueDate: formatDueDate(selectedPackage.deliveryDays),
    stageIndex: 0,
    lastUpdate: "Commande creee, brief en attente de validation",
    paymentReleased: false,
    timelikeTrust: gig.timelikeTrust,
    brief: brief.trim() || "Brief a partager apres paiement.",
    notes: [
      "Commande creee",
      "Paiement sous escrow verrouille",
      "Le vendeur peut maintenant valider le brief",
    ],
  } satisfies ProjectOrder;
}
