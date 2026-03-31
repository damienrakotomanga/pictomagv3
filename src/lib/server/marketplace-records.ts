import {
  type GigCreationDraft,
  type GigCreationPackageDraft,
} from "@/components/marketplace-gig-creator";
import {
  type GigPackage,
  getMarketplaceGigHref,
  type ProjectOrder,
  projectStages,
  type ServiceGig,
} from "@/lib/marketplace-data";
import {
  createConversationRow,
  createGigRow,
  createMessageRow,
  createOrderRow,
  findConversationBetweenUsers,
  getConversationRowById,
  getGigRowById,
  getGigRowBySlug,
  getOrderRowById,
  getProfileByUserId,
  getProfileByUsername,
  listConversationRowsForUser,
  listGigRows,
  listMessageRowsByConversationId,
  listOrderRowsForUser,
  type StoredConversationRow,
  type StoredGigRow,
  type StoredGigStatus,
  type StoredMessageRow,
  type StoredOrderRow,
  updateOrderRowPaymentReleased,
  updateOrderRowStage,
} from "@/lib/server/sqlite-store";

type MarketplaceParticipant = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type MarketplaceConversationRecord = {
  id: number;
  participant: MarketplaceParticipant;
  lastMessage: {
    id: number;
    body: string;
    createdAt: number;
    senderUserId: string;
  } | null;
  updatedAt: number;
};

export type MarketplaceMessageRecord = {
  id: number;
  conversationId: number;
  body: string;
  createdAt: number;
  sender: MarketplaceParticipant;
};

export type MarketplaceSellerGigRecord = {
  gig: ServiceGig;
  status: StoredGigStatus;
};

function toParticipant(userId: string): MarketplaceParticipant | null {
  const profile = getProfileByUserId(userId);
  if (!profile) {
    return null;
  }

  return {
    userId: profile.user_id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
  };
}

function parseStringArray(value: string, fallback: string[] = []) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return fallback;
    }

    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return fallback;
  }
}

function parseGigPackages(value: string, priceFrom: number, deliveryLabel: string): GigPackage[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("invalid packages");
    }

    const packages = parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const record = entry as Record<string, unknown>;
      if (
        typeof record.id !== "string" ||
        typeof record.name !== "string" ||
        typeof record.price !== "number" ||
        typeof record.deliveryDays !== "number" ||
        typeof record.revisions !== "string" ||
        typeof record.description !== "string" ||
        !Array.isArray(record.features)
      ) {
        return [];
      }

      return [
        {
          id: record.id,
          name: record.name,
          price: record.price,
          deliveryDays: record.deliveryDays,
          revisions: record.revisions,
          description: record.description,
          features: record.features.filter((feature): feature is string => typeof feature === "string"),
          recommended: record.recommended === true,
        } satisfies GigPackage,
      ];
    });

    if (packages.length > 0) {
      return packages;
    }
  } catch {
    // ignore and fall through to fallback package
  }

  const fallbackDays = Number.parseInt(deliveryLabel, 10);
  return [
    {
      id: "starter",
      name: "Starter",
      price: priceFrom,
      deliveryDays: Number.isFinite(fallbackDays) ? fallbackDays : 3,
      revisions: "1 revision",
      description: "Livraison standard du gig.",
      features: [],
    },
  ];
}

function toServiceGig(row: StoredGigRow): ServiceGig | null {
  const seller = toParticipant(row.seller_user_id);
  if (!seller) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    seller: seller.displayName,
    handle: `@${seller.username}`,
    avatar: seller.avatarUrl ?? "/figma-assets/avatar-user.png",
    cover: row.cover,
    category: row.category,
    priceFrom: row.price_from,
    deliveryLabel: row.delivery_label,
    responseLabel: row.response_label,
    timelikeTrust: row.timelike_trust,
    completedOrders: row.completed_orders,
    queueSize: row.queue_size,
    packages: parseGigPackages(row.packages_json, row.price_from, row.delivery_label),
    deliverables: parseStringArray(row.deliverables_json),
    tags: parseStringArray(row.tags_json),
  };
}

function toProjectOrder(row: StoredOrderRow): ProjectOrder | null {
  const buyer = toParticipant(row.buyer_user_id);
  const seller = toParticipant(row.seller_user_id);
  if (!buyer || !seller) {
    return null;
  }

  return {
    id: row.id,
    gigId: row.gig_id,
    title: row.title,
    client: buyer.displayName,
    seller: seller.displayName,
    budget: row.budget,
    dueDate: row.due_date,
    stageIndex: row.stage_index,
    lastUpdate: row.last_update,
    paymentReleased: row.payment_released === 1,
    timelikeTrust: row.timelike_trust,
    brief: row.brief,
    notes: parseStringArray(row.notes_json),
  };
}

function normalizeGigDraftPackages(packages: GigCreationPackageDraft[]) {
  return packages
    .map((pkg, index) => {
      const price = Number.parseInt(pkg.price, 10);
      const deliveryDays = Number.parseInt(pkg.deliveryDays, 10);
      return {
        id: pkg.id.trim() || `package-${index + 1}`,
        name: pkg.name.trim() || `Package ${index + 1}`,
        price: Number.isFinite(price) ? price : 0,
        deliveryDays: Number.isFinite(deliveryDays) ? deliveryDays : 3,
        revisions: pkg.revisions.trim() || "1 revision",
        description: pkg.description.trim() || "Livraison du gig.",
        features: pkg.features
          .split(",")
          .map((feature) => feature.trim())
          .filter(Boolean),
        recommended: pkg.recommended,
      } satisfies GigPackage;
    })
    .filter((pkg) => pkg.name.length > 0);
}

function resolveDueDateLabel(deliveryDays: number) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + Math.max(1, deliveryDays));
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(dueDate);
}

function resolveMarketplaceIdentifier(identifier: string) {
  return getProfileByUserId(identifier) ?? getProfileByUsername(identifier);
}

function resolveOrderAccess(order: StoredOrderRow, viewerUserId: string) {
  return order.buyer_user_id === viewerUserId || order.seller_user_id === viewerUserId;
}

function resolveConversationAccess(conversation: StoredConversationRow, viewerUserId: string) {
  return (
    conversation.participant_a_user_id === viewerUserId ||
    conversation.participant_b_user_id === viewerUserId
  );
}

function toConversationRecord(currentUserId: string, conversation: StoredConversationRow): MarketplaceConversationRecord | null {
  const participantUserId =
    conversation.participant_a_user_id === currentUserId
      ? conversation.participant_b_user_id
      : conversation.participant_a_user_id;
  const participant = toParticipant(participantUserId);
  if (!participant) {
    return null;
  }

  const messages = listMessageRowsByConversationId({ conversationId: conversation.id, limit: 200 });
  const lastMessage = messages.at(-1) ?? null;

  return {
    id: conversation.id,
    participant,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          body: lastMessage.body,
          createdAt: lastMessage.created_at,
          senderUserId: lastMessage.sender_user_id,
        }
      : null,
    updatedAt: conversation.updated_at,
  };
}

function toMessageRecord(message: StoredMessageRow): MarketplaceMessageRecord | null {
  const sender = toParticipant(message.sender_user_id);
  if (!sender) {
    return null;
  }

  return {
    id: message.id,
    conversationId: message.conversation_id,
    body: message.body,
    createdAt: message.created_at,
    sender,
  };
}

export function listMarketplaceGigs({
  sellerIdentifier,
  viewerUserId,
  limit,
}: {
  sellerIdentifier?: string;
  viewerUserId?: string | null;
  limit?: number;
}) {
  const sellerProfile = sellerIdentifier ? resolveMarketplaceIdentifier(sellerIdentifier) : null;
  const sellerUserId = sellerProfile?.user_id;
  const statuses: StoredGigStatus[] | undefined =
    sellerUserId && viewerUserId === sellerUserId ? undefined : ["active"];

  return listGigRows({
    sellerUserId,
    statuses,
    limit,
  })
    .map((row) => toServiceGig(row))
    .filter((gig): gig is ServiceGig => gig !== null);
}

export function getMarketplaceGigRecordById({
  gigId,
  viewerUserId,
}: {
  gigId: number;
  viewerUserId?: string | null;
}) {
  const row = getGigRowById(gigId);
  if (!row) {
    return null;
  }

  if (row.status !== "active" && viewerUserId !== row.seller_user_id) {
    return null;
  }

  return toServiceGig(row);
}

export function getMarketplaceGigRecordBySlug({
  slug,
  viewerUserId,
}: {
  slug: string;
  viewerUserId?: string | null;
}) {
  const row = getGigRowBySlug(slug);
  if (!row) {
    return null;
  }

  if (row.status !== "active" && viewerUserId !== row.seller_user_id) {
    return null;
  }

  return toServiceGig(row);
}

export function createMarketplaceGigRecord({
  sellerUserId,
  draft,
}: {
  sellerUserId: string;
  draft: GigCreationDraft;
}) {
  const sellerProfile = getProfileByUserId(sellerUserId);
  if (!sellerProfile) {
    return null;
  }

  const packages = normalizeGigDraftPackages(draft.packages);
  const primaryPackage = packages[0] ?? {
    id: "starter",
    name: "Starter",
    price: 0,
    deliveryDays: 3,
    revisions: "1 revision",
    description: "Livraison du gig.",
    features: [],
  };

  const row = createGigRow({
    sellerUserId,
    title: draft.title.trim() || "Nouveau gig",
    subtitle: draft.subtitle.trim(),
    category: draft.category.trim() || "Design",
    cover: draft.cover.trim() || "/figma-assets/photo-feed/photo-grid-1.jpg",
    priceFrom: primaryPackage.price,
    deliveryLabel: draft.deliveryLabel.trim() || `${primaryPackage.deliveryDays} jours`,
    responseLabel: draft.responseLabel.trim() || "Reponse < 24h",
    timelikeTrust: 92,
    completedOrders: 0,
    queueSize: 0,
    status: "active",
    packagesJson: JSON.stringify(packages),
    deliverablesJson: JSON.stringify(
      draft.deliverables
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
    tagsJson: JSON.stringify(
      draft.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  });

  return row ? toServiceGig(row) : null;
}

export function listMarketplaceSellerGigRecords(sellerUserId: string) {
  return listGigRows({ sellerUserId })
    .map((row) => {
      const gig = toServiceGig(row);
      if (!gig) {
        return null;
      }

      return {
        gig,
        status: row.status,
      } satisfies MarketplaceSellerGigRecord;
    })
    .filter((record): record is MarketplaceSellerGigRecord => record !== null);
}

export function listMarketplaceOrdersForUser(userId: string) {
  return listOrderRowsForUser(userId)
    .map((row) => toProjectOrder(row))
    .filter((order): order is ProjectOrder => order !== null);
}

export function createMarketplaceOrderRecord({
  buyerUserId,
  gigId,
  packageId,
  brief,
  totalBudget,
}: {
  buyerUserId: string;
  gigId: number;
  packageId: string;
  brief: string;
  totalBudget?: number;
}) {
  const gig = getGigRowById(gigId);
  if (!gig || gig.status !== "active") {
    return { error: "Gig introuvable." as const };
  }

  const serviceGig = toServiceGig(gig);
  if (!serviceGig) {
    return { error: "Gig indisponible." as const };
  }

  const selectedPackage = serviceGig.packages.find((pkg) => pkg.id === packageId) ?? serviceGig.packages[0];
  if (!selectedPackage) {
    return { error: "Package invalide." as const };
  }

  const order = createOrderRow({
    gigId: serviceGig.id,
    buyerUserId,
    sellerUserId: gig.seller_user_id,
    packageId: selectedPackage.id,
    title: serviceGig.title,
    budget: Math.max(selectedPackage.price, totalBudget ?? selectedPackage.price),
    dueDate: resolveDueDateLabel(selectedPackage.deliveryDays),
    stageIndex: 0,
    lastUpdate: "Brief recu",
    paymentReleased: false,
    timelikeTrust: serviceGig.timelikeTrust,
    brief: brief.trim() || "Brief a preciser avec le vendeur.",
    notesJson: JSON.stringify([
      "Brief recu",
      "Kickoff a planifier",
      "Production en attente",
    ]),
  });

  return order ? { order: toProjectOrder(order) } : { error: "Commande introuvable." as const };
}

export function advanceMarketplaceOrderStage({
  orderId,
  actorUserId,
}: {
  orderId: number;
  actorUserId: string;
}) {
  const order = getOrderRowById(orderId);
  if (!order) {
    return { error: "Commande introuvable." as const };
  }

  if (order.seller_user_id !== actorUserId) {
    return { error: "Action non autorisee." as const };
  }

  const nextStageIndex = Math.min(order.stage_index + 1, projectStages.length - 1);
  const nextLabel = projectStages[nextStageIndex]?.label ?? "Mise a jour";
  const notes = parseStringArray(order.notes_json);
  const nextNotes =
    nextStageIndex > order.stage_index
      ? [...notes, `${nextLabel} active`] 
      : notes;
  const updatedOrder = updateOrderRowStage({
    orderId,
    stageIndex: nextStageIndex,
    lastUpdate: `${nextLabel} active`,
    notesJson: JSON.stringify(nextNotes),
  });

  return updatedOrder ? { order: toProjectOrder(updatedOrder) } : { error: "Impossible de mettre a jour." as const };
}

export function releaseMarketplaceOrderPayment({
  orderId,
  actorUserId,
}: {
  orderId: number;
  actorUserId: string;
}) {
  const order = getOrderRowById(orderId);
  if (!order) {
    return { error: "Commande introuvable." as const };
  }

  if (order.seller_user_id !== actorUserId) {
    return { error: "Action non autorisee." as const };
  }

  const updatedOrder = updateOrderRowPaymentReleased({
    orderId,
    paymentReleased: true,
    lastUpdate: "Paiement libere",
  });

  return updatedOrder ? { order: toProjectOrder(updatedOrder) } : { error: "Impossible de liberer le paiement." as const };
}

export function listMarketplaceConversationsForUser(userId: string) {
  return listConversationRowsForUser(userId)
    .map((conversation) => toConversationRecord(userId, conversation))
    .filter((conversation): conversation is MarketplaceConversationRecord => conversation !== null);
}

export function openMarketplaceConversation({
  currentUserId,
  otherUserIdentifier,
}: {
  currentUserId: string;
  otherUserIdentifier: string;
}) {
  const participantProfile = resolveMarketplaceIdentifier(otherUserIdentifier);
  if (!participantProfile) {
    return { error: "Destinataire introuvable." as const };
  }

  if (participantProfile.user_id === currentUserId) {
    return { error: "Conversation invalide." as const };
  }

  const conversation =
    findConversationBetweenUsers(currentUserId, participantProfile.user_id) ??
    createConversationRow({
      participantAUserId: currentUserId,
      participantBUserId: participantProfile.user_id,
    });

  if (!conversation) {
    return { error: "Impossible d'ouvrir la conversation." as const };
  }

  const record = toConversationRecord(currentUserId, conversation);
  return record ? { conversation: record } : { error: "Conversation indisponible." as const };
}

export function listMarketplaceMessages({
  conversationId,
  viewerUserId,
}: {
  conversationId: number;
  viewerUserId: string;
}) {
  const conversation = getConversationRowById(conversationId);
  if (!conversation || !resolveConversationAccess(conversation, viewerUserId)) {
    return { error: "Conversation introuvable." as const };
  }

  return {
    messages: listMessageRowsByConversationId({ conversationId })
      .map((message) => toMessageRecord(message))
      .filter((message): message is MarketplaceMessageRecord => message !== null),
  };
}

export function sendMarketplaceMessage({
  conversationId,
  senderUserId,
  body,
}: {
  conversationId: number;
  senderUserId: string;
  body: string;
}) {
  const normalizedBody = body.trim();
  if (normalizedBody.length === 0) {
    return { error: "Message vide." as const };
  }

  const conversation = getConversationRowById(conversationId);
  if (!conversation || !resolveConversationAccess(conversation, senderUserId)) {
    return { error: "Conversation introuvable." as const };
  }

  const message = createMessageRow({
    conversationId,
    senderUserId,
    body: normalizedBody,
  });

  if (!message) {
    return { error: "Impossible d'envoyer le message." as const };
  }

  const record = toMessageRecord(message);
  return record ? { message: record } : { error: "Message indisponible." as const };
}

export function getMarketplaceGigUrl(gig: ServiceGig) {
  return getMarketplaceGigHref(gig);
}

export function getMarketplaceParticipantByIdentifier(identifier: string) {
  const profile = resolveMarketplaceIdentifier(identifier);
  return profile ? toParticipant(profile.user_id) : null;
}

export function getMarketplaceOrderRecordById({
  orderId,
  viewerUserId,
}: {
  orderId: number;
  viewerUserId: string;
}) {
  const row = getOrderRowById(orderId);
  if (!row || !resolveOrderAccess(row, viewerUserId)) {
    return null;
  }

  return toProjectOrder(row);
}
