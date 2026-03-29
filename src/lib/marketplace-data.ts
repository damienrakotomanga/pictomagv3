export type MarketplaceView = "discover" | "seller" | "tracker" | "create";
export type HeaderPanelId = "create" | "notifications" | "messages" | "menu" | null;
export type PaymentMethod = "card" | "wallet" | "bank";

export type GigPackage = {
  id: string;
  name: string;
  price: number;
  deliveryDays: number;
  revisions: string;
  description: string;
  features: string[];
  recommended?: boolean;
};

export type ServiceGig = {
  id: number;
  title: string;
  subtitle: string;
  seller: string;
  handle: string;
  avatar: string;
  cover: string;
  category: string;
  priceFrom: number;
  deliveryLabel: string;
  responseLabel: string;
  timelikeTrust: number;
  completedOrders: number;
  queueSize: number;
  packages: GigPackage[];
  deliverables: string[];
  tags: string[];
};

export type ProjectOrder = {
  id: number;
  gigId: number;
  title: string;
  client: string;
  seller: string;
  budget: number;
  dueDate: string;
  stageIndex: number;
  lastUpdate: string;
  paymentReleased: boolean;
  timelikeTrust: number;
  brief: string;
  notes: string[];
};

export const projectStages = [
  { id: "brief", label: "Brief", copy: "Cadrage du besoin" },
  { id: "kickoff", label: "Kickoff", copy: "Planning et direction" },
  { id: "build", label: "Production", copy: "Execution du gig" },
  { id: "review", label: "Revision", copy: "Ajustements et retours" },
  { id: "delivery", label: "Livraison", copy: "Export final et handoff" },
];

export const serviceCategories = [
  "Tout",
  "Design",
  "Motion",
  "Video",
  "Branding",
  "No-code",
  "Audio",
  "Strategy",
];

export const serviceGigs: ServiceGig[] = [
  {
    id: 1,
    title: "Marketplace hero premium + launch visuals",
    subtitle: "Direction visuelle, hero, variations socials et delivery propre.",
    seller: "Axel Belujon Studio",
    handle: "@axelbelujon",
    avatar: "/figma-assets/avatar-post.png",
    cover: "/figma-assets/photo-feed/photo-grid-7.jpg",
    category: "Design",
    priceFrom: 240,
    deliveryLabel: "3 jours",
    responseLabel: "Reponse < 1h",
    timelikeTrust: 96,
    completedOrders: 48,
    queueSize: 3,
    tags: ["UI premium", "Direction art", "Desktop first"],
    deliverables: [
      "Hero desktop + mobile",
      "Systeme de composants clefs",
      "2 revisions structurelles",
      "Fichiers source livres",
    ],
    packages: [
      {
        id: "starter",
        name: "Starter",
        price: 240,
        deliveryDays: 3,
        revisions: "1 revision",
        description: "Une page hero avec hierarchie propre et CTA.",
        features: ["Hero principal", "Version mobile", "Export Figma"],
      },
      {
        id: "growth",
        name: "Growth",
        price: 520,
        deliveryDays: 5,
        revisions: "2 revisions",
        description: "Hero + 3 blocs conversion + systeme visuel.",
        features: ["Hero", "3 sections", "Kit assets", "Responsive"],
        recommended: true,
      },
      {
        id: "signature",
        name: "Signature",
        price: 920,
        deliveryDays: 7,
        revisions: "3 revisions",
        description: "Landing complete avec design system et handoff produit.",
        features: ["Landing complete", "Mini design system", "Motion specs", "Handoff"],
      },
    ],
  },
  {
    id: 2,
    title: "Motion system pour reels, shorts et ads",
    subtitle: "Un pack de transitions, hooks et rythmes visuels pour faire monter l'attention.",
    seller: "Studio Heat",
    handle: "@studio.heat",
    avatar: "/figma-assets/avatar-story.png",
    cover: "/figma-assets/photo-feed/photo-grid-6.jpg",
    category: "Motion",
    priceFrom: 180,
    deliveryLabel: "2 jours",
    responseLabel: "Reponse aujourd'hui",
    timelikeTrust: 91,
    completedOrders: 73,
    queueSize: 5,
    tags: ["Shorts", "Ads", "Pacing"],
    deliverables: ["Pack transitions", "Intro hooks", "Template montage", "Specs 9:16"],
    packages: [
      {
        id: "starter",
        name: "Starter",
        price: 180,
        deliveryDays: 2,
        revisions: "1 revision",
        description: "Un micro-pack pret a deployer sur 3 videos.",
        features: ["3 transitions", "1 hook", "Guide usage"],
      },
      {
        id: "growth",
        name: "Growth",
        price: 410,
        deliveryDays: 4,
        revisions: "2 revisions",
        description: "Pack reel complet pour une campagne propre.",
        features: ["8 transitions", "3 hooks", "Outro", "Preset color"],
        recommended: true,
      },
      {
        id: "signature",
        name: "Signature",
        price: 760,
        deliveryDays: 6,
        revisions: "3 revisions",
        description: "Direction motion complete pour la marque.",
        features: ["Systeme motion", "Bibliotheque modulaire", "Brand motion guide"],
      },
    ],
  },
  {
    id: 3,
    title: "Brand page claire pour vendre un service technique",
    subtitle: "On simplifie l'offre, on clarifie la promesse, on augmente la confiance.",
    seller: "Pictomag News Lab",
    handle: "@pictomag.news",
    avatar: "/figma-assets/avatar-user.png",
    cover: "/figma-assets/photo-feed/photo-grid-4.jpg",
    category: "Branding",
    priceFrom: 320,
    deliveryLabel: "4 jours",
    responseLabel: "Reponse < 2h",
    timelikeTrust: 94,
    completedOrders: 31,
    queueSize: 2,
    tags: ["Brand clarity", "Service page", "Offer design"],
    deliverables: ["Copy structure", "Page design", "Proof section", "CTA logic"],
    packages: [
      {
        id: "starter",
        name: "Starter",
        price: 320,
        deliveryDays: 4,
        revisions: "1 revision",
        description: "Une offre et une page claire.",
        features: ["Offer framing", "1 page", "Basic proof block"],
      },
      {
        id: "growth",
        name: "Growth",
        price: 690,
        deliveryDays: 6,
        revisions: "2 revisions",
        description: "Page complete avec architecture commerciale.",
        features: ["Page complete", "Trust blocks", "FAQ", "CTA system"],
        recommended: true,
      },
      {
        id: "signature",
        name: "Signature",
        price: 1160,
        deliveryDays: 9,
        revisions: "3 revisions",
        description: "Refonte marque + offre + page.",
        features: ["Offer design", "Narrative", "UI direction", "Handoff"],
      },
    ],
  },
  {
    id: 4,
    title: "Audio identity et design sonore pour produit",
    subtitle: "Un son memorable pour reels, teasers, interface et signature finale.",
    seller: "Neon Driver Audio",
    handle: "@neondriver",
    avatar: "/figma-assets/avatar-post.png",
    cover: "/figma-assets/photo-feed/photo-grid-3.jpg",
    category: "Audio",
    priceFrom: 210,
    deliveryLabel: "3 jours",
    responseLabel: "Reponse dans la journee",
    timelikeTrust: 89,
    completedOrders: 52,
    queueSize: 4,
    tags: ["Sound logo", "Reels", "Audio branding"],
    deliverables: ["Sound logo", "15s version", "Loop", "Mix master"],
    packages: [
      {
        id: "starter",
        name: "Starter",
        price: 210,
        deliveryDays: 3,
        revisions: "1 revision",
        description: "Une signature sonore simple et propre.",
        features: ["Logo audio", "Wave export", "Mp3 + wav"],
      },
      {
        id: "growth",
        name: "Growth",
        price: 460,
        deliveryDays: 5,
        revisions: "2 revisions",
        description: "Pack audio plus flexible pour pub et produit.",
        features: ["Logo audio", "15s version", "Loop", "Mix"],
        recommended: true,
      },
      {
        id: "signature",
        name: "Signature",
        price: 780,
        deliveryDays: 7,
        revisions: "3 revisions",
        description: "Identite sonore complete pour la marque.",
        features: ["Suite audio", "Transitions", "Brand guide", "Masters"],
      },
    ],
  },
];

export const sellerPulse = [
  { label: "Revenus 30j", value: "12 480 EUR", helper: "+18% ce mois" },
  { label: "Briefs ouverts", value: "14", helper: "7 tres qualifies" },
  { label: "Temps de reponse", value: "43 min", helper: "au-dessus du top 10%" },
  { label: "Trust TimeLike", value: "94%", helper: "signal d'attention moyen" },
];

export const seedOrders: ProjectOrder[] = [
  {
    id: 6001,
    gigId: 1,
    title: "Marketplace hero + 3 cards services",
    client: "Aurora Labs",
    seller: "Axel Belujon Studio",
    budget: 520,
    dueDate: "27 mars",
    stageIndex: 2,
    lastUpdate: "Prototype livre ce matin",
    paymentReleased: false,
    timelikeTrust: 96,
    brief: "Nous avons besoin d'une surface premium pour vendre 4 gigs avec checkout clair et structure desktop.",
    notes: [
      "Brief valide et architecture approuvee",
      "Wireframe desktop livre",
      "Version mobile en attente de validation",
    ],
  },
  {
    id: 6002,
    gigId: 2,
    title: "Pack motion pour campagne launch week",
    client: "Chrome Lab",
    seller: "Studio Heat",
    budget: 410,
    dueDate: "29 mars",
    stageIndex: 1,
    lastUpdate: "Kickoff planifie a 15h",
    paymentReleased: false,
    timelikeTrust: 91,
    brief: "Nous cherchons une banque de hooks et transitions pour 6 reels de lancement.",
    notes: ["Brief recu", "References deja partagees", "Attente de storyboard final"],
  },
  {
    id: 6003,
    gigId: 4,
    title: "Sound logo et loop de marque",
    client: "Northlight",
    seller: "Neon Driver Audio",
    budget: 460,
    dueDate: "31 mars",
    stageIndex: 4,
    lastUpdate: "Livraison finale disponible",
    paymentReleased: true,
    timelikeTrust: 89,
    brief: "Un systeme sonore court pour habiller produit, reels et closing.",
    notes: ["Preview valide", "Loop final exporte", "Acompte libere"],
  },
];

export const topNotifications = [
  "Aurora Labs a valide le brief du hero marketplace.",
  "Le client Northlight a libere le paiement final.",
  "3 nouveaux briefs qualifies attendent dans votre pipeline.",
];

export const topMessages = [
  "Aurora Labs: Peut-on ajouter une vue vendeur ?",
  "Chrome Lab: On a laisse 4 references dans le tracker.",
  "Northlight: Merci, on repart pour un second gig.",
];

export const topCreateOptions = [
  { id: "create", title: "Nouveau gig", copy: "Ouvrir votre dashboard vendeur" },
  { id: "discover", title: "Nouvelle demande", copy: "Explorer les services et commander" },
  { id: "tracker", title: "Suivi projet", copy: "Voir les commandes en cours" },
];

export function slugifyMarketplaceText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getMarketplaceGigSlug(gig: Pick<ServiceGig, "id" | "title">) {
  return `${gig.id}-${slugifyMarketplaceText(gig.title)}`;
}

export function getMarketplaceGigHref(gig: Pick<ServiceGig, "id" | "title">) {
  return `/marketplace/${getMarketplaceGigSlug(gig)}`;
}

export function getMarketplaceGigBySlug(slug: string) {
  const id = Number(slug.split("-")[0]);

  if (!Number.isFinite(id)) {
    return null;
  }

  return serviceGigs.find((gig) => gig.id === id) ?? null;
}
