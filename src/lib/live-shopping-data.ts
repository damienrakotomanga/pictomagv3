export type LiveShoppingMode = "fixed" | "auction";
export type LiveShoppingStatus = "live" | "scheduled";

export type LiveShoppingBrowseTab = {
  id: "recommended" | "popular" | "az";
  label: string;
};

export type LiveShoppingCategory = {
  id: string;
  label: string;
  audienceLabel: string;
  iconSrc: string;
  helper: string;
};

export type LiveShoppingShelfItem = {
  id: string;
  label: string;
  cover: string;
  viewersLabel: string;
};

export type LiveShoppingLot = {
  id: string;
  title: string;
  subtitle: string;
  cover: string;
  mode: LiveShoppingMode;
  price: number;
  currentBid?: number;
  bidIncrement?: number;
  stock: number;
  delivery: string;
};

export type LiveShoppingChatMessage = {
  id: number;
  author: string;
  body: string;
  accent?: string;
  mod?: boolean;
};

export type LiveShoppingEvent = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  seller: string;
  handle: string;
  avatar: string;
  cover: string;
  gallery: string[];
  categoryId: string;
  category: string;
  tags: string[];
  city: string;
  status: LiveShoppingStatus;
  viewers: number;
  likes: number;
  liveBadge: string;
  pinnedLabel: string;
  heroNote: string;
  items: LiveShoppingLot[];
  chat: LiveShoppingChatMessage[];
};

export type LiveShoppingOrder = {
  id: number;
  eventId: number;
  title: string;
  buyer: string;
  seller: string;
  amount: number;
  quantity: number;
  stageIndex: number;
  etaLabel: string;
  lastUpdate: string;
  note: string;
};

export const liveShoppingBrowseTabs: LiveShoppingBrowseTab[] = [
  { id: "recommended", label: "Recommande" },
  { id: "popular", label: "Populaire" },
  { id: "az", label: "A-Z" },
];

export const liveShoppingOrderStages = [
  { id: "paid", label: "Paiement" },
  { id: "reserved", label: "Reservation" },
  { id: "packed", label: "Preparation" },
  { id: "sent", label: "Expedition" },
  { id: "closed", label: "Termine" },
];

export const liveShoppingCategories: LiveShoppingCategory[] = [
  { id: "trading-card-games", label: "Trading Card Games", audienceLabel: "18,4 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-14.svg", helper: "Breaks, boosters et lives de cartes." },
  { id: "finds-and-thrifts", label: "Trouvailles et vide-greniers", audienceLabel: "1,3 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-8.svg", helper: "Selection vintage et trouvailles rapides." },
  { id: "bags-and-accessories", label: "Sacs et accessoires", audienceLabel: "3,3 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-12.svg", helper: "Pieces mode et accessoires plus rares." },
  { id: "books-and-films", label: "Livres et films", audienceLabel: "494 Spectateurs", iconSrc: "/marketplace-icons/categories-icon-9.svg", helper: "Editions, BD et collector culture." },
  { id: "mens-fashion", label: "Mode homme", audienceLabel: "5,2 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-10.svg", helper: "Pieces mode, jackets et sneakers." },
  { id: "womens-fashion", label: "Mode femme", audienceLabel: "24,1 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-11.svg", helper: "Selection femme, style et accessoires." },
  { id: "collectibles", label: "Cartes de divertissement", audienceLabel: "866 Spectateurs", iconSrc: "/marketplace-icons/categories-icon-3.svg", helper: "Collectibles, pop culture et editions." },
  { id: "sneakers-and-shoes", label: "Sneakers et chaussures", audienceLabel: "4 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-10.svg", helper: "Sneakers, paires rares et drops live." },
  { id: "toys-and-hobbies", label: "Jouets et loisirs", audienceLabel: "10,9 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-13.svg", helper: "Figurines, fun et hobbies lives." },
  { id: "sports-cards", label: "Cartes de sports", audienceLabel: "13 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-1.svg", helper: "Cartes graded et collections sport." },
  { id: "comics", label: "Bandes dessinées", audienceLabel: "976 Spectateurs", iconSrc: "/marketplace-icons/categories-icon-9.svg", helper: "BD, comics et editions plus rares." },
  { id: "beauty", label: "Beaute", audienceLabel: "6,1 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-6.svg", helper: "Cosmetiques, beaute et routines live." },
  { id: "art-craft", label: "Art et artisanat", audienceLabel: "998 Spectateurs", iconSrc: "/marketplace-icons/categories-icon-5.svg", helper: "Pieces faites main et ateliers." },
  { id: "anime-manga", label: "Anime et manga", audienceLabel: "299 Spectateurs", iconSrc: "/marketplace-icons/categories-icon-9.svg", helper: "Manga, anime et collectibles japonais." },
  { id: "clearance-lots", label: "Destockage et lots", audienceLabel: "1,7 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-8.svg", helper: "Lots rapides, cartons et bundles." },
  { id: "stones-crystals", label: "Pierres et cristaux", audienceLabel: "876 Spectateurs", iconSrc: "/marketplace-icons/categories-icon-5.svg", helper: "Cristaux, pierres et selection live." },
  { id: "jewelry-watches", label: "Bijoux et montres", audienceLabel: "1,6 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-12.svg", helper: "Bijoux, montres et pieces de valeur." },
  { id: "baby-kids", label: "Bebe et enfant", audienceLabel: "1,5 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-11.svg", helper: "Essentiels bebe et lots enfant." },
  { id: "video-games", label: "Jeux video", audienceLabel: "1,2 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-6.svg", helper: "Jeux, consoles et accessoires gaming." },
  { id: "home-garden", label: "Maison et jardin", audienceLabel: "2,8 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-11.svg", helper: "Maison, deco, jardin et selection pratique." },
  { id: "electronics", label: "Electronique", audienceLabel: "7,8 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-2.svg", helper: "Accessoires tech et petits lots." },
  { id: "coins-silver", label: "Pieces de monnaie et argent", audienceLabel: "2,7 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-2.svg", helper: "Monnaies, argent et petites collections." },
  { id: "sports-collectibles", label: "Objets de collection sportifs", audienceLabel: "266 Spectateurs", iconSrc: "/marketplace-icons/categories-icon-1.svg", helper: "Memorabilia, objets sport et signatures." },
  { id: "music", label: "Musique", audienceLabel: "554 Spectateurs", iconSrc: "/marketplace-icons/categories-icon-7.svg", helper: "Vinyles, audio et instruments." },
  { id: "vintage-decor", label: "Antiquites et decoration vintage", audienceLabel: "2,1 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-5.svg", helper: "Pieces vintage, maison et decoration." },
  { id: "knives-hunting", label: "Couteaux et chasse", audienceLabel: "1,8 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-10.svg", helper: "Outdoor, couteaux et equipements." },
  { id: "food-drink", label: "Aliments et boissons", audienceLabel: "1,2 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-8.svg", helper: "Selections gourmandes et produits rares." },
  { id: "misc", label: "Divers", audienceLabel: "571 Spectateurs", iconSrc: "/marketplace-icons/categories-icon-14.svg", helper: "Le reste des trouvailles qui valent un live." },
  { id: "sports-outdoor", label: "Sports et activites de plein air", audienceLabel: "1,7 k Spectateurs", iconSrc: "/marketplace-icons/categories-icon-10.svg", helper: "Sport, plein air et equipement mobile." },
  { id: "pets", label: "Animaux de compagnie", audienceLabel: "114 Spectateurs", iconSrc: "/marketplace-icons/categories-icon-13.svg", helper: "Accessoires et trouvailles pour animaux." },
];

export const liveShoppingShelvesByCategory: Record<string, LiveShoppingShelfItem[]> = {
  "trading-card-games": [
    {
      id: "pokemon",
      label: "Cartes Pokemon",
      cover: "/figma-assets/photo-feed/photo-grid-1.jpg",
      viewersLabel: "15,6 k Spectateurs",
    },
    {
      id: "one-piece",
      label: "Cartes One Piece",
      cover: "/figma-assets/photo-feed/photo-grid-2.jpg",
      viewersLabel: "13 k Spectateurs",
    },
    {
      id: "magic",
      label: "Magic: The Gathering",
      cover: "/figma-assets/photo-feed/photo-grid-3.jpg",
      viewersLabel: "700 Spectateurs",
    },
    {
      id: "yugioh",
      label: "Cartes Yu-Gi-Oh!",
      cover: "/figma-assets/photo-feed/photo-grid-4.jpg",
      viewersLabel: "334 Spectateurs",
    },
    {
      id: "dragon-ball",
      label: "Cartes Dragon Ball",
      cover: "/figma-assets/photo-feed/photo-grid-5.jpg",
      viewersLabel: "176 Spectateurs",
    },
    {
      id: "union-arena",
      label: "Union Arena",
      cover: "/figma-assets/photo-feed/photo-grid-6.jpg",
      viewersLabel: "56 Spectateurs",
    },
  ],
  "womens-fashion": [
    {
      id: "coats",
      label: "Vestes & manteaux",
      cover: "/figma-assets/photo-feed/photo-grid-7.jpg",
      viewersLabel: "5,4 k Spectateurs",
    },
    {
      id: "bags",
      label: "Sacs premium",
      cover: "/figma-assets/photo-feed/photo-grid-8.jpg",
      viewersLabel: "2,1 k Spectateurs",
    },
  ],
  beauty: [
    {
      id: "lipsticks",
      label: "Lipsticks",
      cover: "/figma-assets/photo-feed/photo-grid-3.jpg",
      viewersLabel: "1,1 k Spectateurs",
    },
    {
      id: "skincare",
      label: "Skincare",
      cover: "/figma-assets/photo-feed/photo-grid-6.jpg",
      viewersLabel: "930 Spectateurs",
    },
  ],
};

const avatarA = "/figma-assets/avatar-post.png";
const avatarB = "/figma-assets/avatar-story.png";
const avatarC = "/figma-assets/avatar-user.png";

const sharedLots: Record<string, LiveShoppingLot[]> = {
  tcgA: [
    {
      id: "one-piece-2x",
      title: "2x booster vu en live",
      subtitle: "Break rapide, stock reserve pour la salle.",
      cover: "/figma-assets/photo-feed/photo-grid-2.jpg",
      mode: "fixed",
      price: 20,
      stock: 35,
      delivery: "48h",
    },
    {
      id: "wall-4x",
      title: "4x booster du mur",
      subtitle: "Selection directe avec reveal en live.",
      cover: "/figma-assets/photo-feed/photo-grid-5.jpg",
      mode: "fixed",
      price: 40,
      stock: 22,
      delivery: "48h",
    },
    {
      id: "mystery-10x",
      title: "10x booster mystery",
      subtitle: "Lot live avec chance de hit et recap en fin de stream.",
      cover: "/figma-assets/photo-feed/photo-grid-8.jpg",
      mode: "auction",
      price: 80,
      currentBid: 100,
      bidIncrement: 5,
      stock: 4,
      delivery: "72h",
    },
  ],
  tcgB: [
    {
      id: "op-box",
      title: "Box break OP premium",
      subtitle: "Ouverture live avec recap hits et envoi protege.",
      cover: "/figma-assets/photo-feed/photo-grid-6.jpg",
      mode: "auction",
      price: 22,
      currentBid: 28,
      bidIncrement: 2,
      stock: 8,
      delivery: "72h",
    },
    {
      id: "japan-pack",
      title: "Pack Japon 5 boosters",
      subtitle: "Selection guidee pendant le live.",
      cover: "/figma-assets/photo-feed/photo-grid-1.jpg",
      mode: "fixed",
      price: 32,
      stock: 19,
      delivery: "48h",
    },
  ],
  beauty: [
    {
      id: "gloss-drop",
      title: "Gloss trio du live",
      subtitle: "Teintes vendues pendant le direct avec stock limite.",
      cover: "/figma-assets/photo-feed/photo-grid-3.jpg",
      mode: "fixed",
      price: 18,
      stock: 24,
      delivery: "72h",
    },
    {
      id: "makeup-bag",
      title: "Routine glow complete",
      subtitle: "Set maquillage + accessoires, edition limitee.",
      cover: "/figma-assets/photo-feed/photo-grid-8.jpg",
      mode: "fixed",
      price: 58,
      stock: 12,
      delivery: "4 jours",
    },
  ],
  fashion: [
    {
      id: "coat-drop",
      title: "Drop manteaux selection",
      subtitle: "Pieces triees en direct, tailles annoncees au fil du live.",
      cover: "/figma-assets/photo-feed/photo-grid-7.jpg",
      mode: "fixed",
      price: 110,
      stock: 9,
      delivery: "5 jours",
    },
    {
      id: "bag-auction",
      title: "Sac premium auction",
      subtitle: "Mode enchere, fin douce et anti-sniping simple.",
      cover: "/figma-assets/photo-feed/photo-grid-4.jpg",
      mode: "auction",
      price: 140,
      currentBid: 180,
      bidIncrement: 10,
      stock: 1,
      delivery: "5 jours",
    },
  ],
};

export const liveShoppingEvents: LiveShoppingEvent[] = [
  {
    id: 1,
    slug: "jp-p2pdd-one-piece-live-14",
    title: "JP P2PDD One Piece JP",
    subtitle: "Break francais, reveal pack par pack et lots reserves pendant le live.",
    seller: "rice_",
    handle: "@rice_",
    avatar: avatarA,
    cover: "/figma-assets/photo-feed/photo-grid-2.jpg",
    gallery: ["/figma-assets/photo-feed/photo-grid-2.jpg", "/figma-assets/photo-feed/photo-grid-5.jpg", "/figma-assets/photo-feed/photo-grid-1.jpg"],
    categoryId: "trading-card-games",
    category: "Trading Card Games",
    tags: ["Cartes One Piece", "One Piece"],
    city: "Paris",
    status: "live",
    viewers: 15600,
    likes: 891,
    liveBadge: "Live - 14",
    pinnedLabel: "2x booster vu en live",
    heroNote: "On ouvre du One Piece JP avec reveal direct et lots au fil du live.",
    items: sharedLots.tcgA,
    chat: [
      { id: 1, author: "kishigani", body: "Un HQ, c est le 3eme hit qui n est jamais garanti", mod: true },
      { id: 2, author: "joelh", body: "Sur une case de display la pl est possible ?" },
      { id: 3, author: "carlitopatago", body: "Appar peut etre sur eb03" },
      { id: 4, author: "revjoh", body: "Merciiii beaucoup", accent: "warm" },
    ],
  },
  {
    id: 2,
    slug: "tenten-one-piece-fr-boxbreak",
    title: "Tenten a la recherche du ONE PIECE",
    subtitle: "Box break, boosters promo et reveal en live sur format rapide.",
    seller: "tententcg",
    handle: "@tententcg",
    avatar: avatarB,
    cover: "/figma-assets/photo-feed/photo-grid-8.jpg",
    gallery: ["/figma-assets/photo-feed/photo-grid-8.jpg", "/figma-assets/photo-feed/photo-grid-6.jpg", "/figma-assets/photo-feed/photo-grid-4.jpg"],
    categoryId: "trading-card-games",
    category: "Trading Card Games",
    tags: ["Cartes One Piece", "Mort subite"],
    city: "Lille",
    status: "live",
    viewers: 9100,
    likes: 632,
    liveBadge: "Live - 91",
    pinnedLabel: "Pack mystery premium",
    heroNote: "Formats rapides et petits drops a repetiton pour garder le live tres fluide.",
    items: sharedLots.tcgB,
    chat: [
      { id: 1, author: "mitsu", body: "Le prochain lot tombe quand ?" },
      { id: 2, author: "fredo", body: "Je prends le pack Japon si dispo." },
      { id: 3, author: "noa", body: "Le reveal est nickel de mon cote." },
    ],
  },
  {
    id: 3,
    slug: "hit-garanti-give-live",
    title: "Hit garanti + give !",
    subtitle: "Live cards et boosters avec mecanique simple d enchere douce.",
    seller: "pokedom63",
    handle: "@pokedom63",
    avatar: avatarC,
    cover: "/figma-assets/photo-feed/photo-grid-1.jpg",
    gallery: ["/figma-assets/photo-feed/photo-grid-1.jpg", "/figma-assets/photo-feed/photo-grid-2.jpg", "/figma-assets/photo-feed/photo-grid-5.jpg"],
    categoryId: "trading-card-games",
    category: "Trading Card Games",
    tags: ["Cartes One Piece", "Nouveaute"],
    city: "Lyon",
    status: "live",
    viewers: 6100,
    likes: 411,
    liveBadge: "Live - 6",
    pinnedLabel: "Pack Japon 5 boosters",
    heroNote: "On garde une salle simple: lot a gauche, chat a droite, reveal au centre.",
    items: sharedLots.tcgB,
    chat: [
      { id: 1, author: "nox", body: "Le hit garanti me chauffe" },
      { id: 2, author: "mia", body: "Tu peux remontrer le lot 2 ?" },
      { id: 3, author: "leo", body: "Je reste pour la fin de l auction." },
    ],
  },
  {
    id: 4,
    slug: "unity-break-nosebyy-live",
    title: "Unite chez le Nosebyy !",
    subtitle: "Show cartes et giveaways sur un live qui tourne simple et vite.",
    seller: "nosebyy",
    handle: "@nosebyy",
    avatar: avatarA,
    cover: "/figma-assets/photo-feed/photo-grid-4.jpg",
    gallery: ["/figma-assets/photo-feed/photo-grid-4.jpg", "/figma-assets/photo-feed/photo-grid-7.jpg", "/figma-assets/photo-feed/photo-grid-6.jpg"],
    categoryId: "trading-card-games",
    category: "Trading Card Games",
    tags: ["Cartes One Piece"],
    city: "Bordeaux",
    status: "live",
    viewers: 4200,
    likes: 358,
    liveBadge: "Live - 16",
    pinnedLabel: "10x booster mystery",
    heroNote: "Le format reste tres lisible: 1 live, 1 colonne produits, 1 chat.",
    items: sharedLots.tcgA,
    chat: [
      { id: 1, author: "coco", body: "Le lot 3 est encore ouvert ?" },
      { id: 2, author: "riku", body: "Le visuel est plus propre ici." },
      { id: 3, author: "sami", body: "Je garde une enchere pour la fin." },
    ],
  },
  {
    id: 5,
    slug: "muro-op-break-live",
    title: "MUROP09/11 FR",
    subtitle: "Break francais, rythme rapide et packs disponibles en direct.",
    seller: "monkey.d.luffy",
    handle: "@monkey.d.luffy",
    avatar: avatarB,
    cover: "/figma-assets/photo-feed/photo-grid-6.jpg",
    gallery: ["/figma-assets/photo-feed/photo-grid-6.jpg", "/figma-assets/photo-feed/photo-grid-1.jpg", "/figma-assets/photo-feed/photo-grid-3.jpg"],
    categoryId: "trading-card-games",
    category: "Trading Card Games",
    tags: ["Cartes One Piece", "Boxbreaks"],
    city: "Marseille",
    status: "live",
    viewers: 3800,
    likes: 302,
    liveBadge: "Live - 38",
    pinnedLabel: "2x booster vu en live",
    heroNote: "Break simple a suivre, pas d ecrans inutiles, juste l essentiel.",
    items: sharedLots.tcgA,
    chat: [
      { id: 1, author: "hugo", body: "Le lot 1 est encore dispo ?" },
      { id: 2, author: "mimi", body: "Ca tourne tres propre." },
    ],
  },
  {
    id: 6,
    slug: "fr-pack-mystere-live",
    title: "FR OP09-PRB02 Packs Mystere",
    subtitle: "Packs mystere, gros lots et reveal propre en salle live.",
    seller: "grantesoro",
    handle: "@grantesoro",
    avatar: avatarC,
    cover: "/figma-assets/photo-feed/photo-grid-5.jpg",
    gallery: ["/figma-assets/photo-feed/photo-grid-5.jpg", "/figma-assets/photo-feed/photo-grid-2.jpg", "/figma-assets/photo-feed/photo-grid-8.jpg"],
    categoryId: "trading-card-games",
    category: "Trading Card Games",
    tags: ["Cartes One Piece", "Nouveaux lots"],
    city: "Nantes",
    status: "live",
    viewers: 2500,
    likes: 214,
    liveBadge: "Live - 12",
    pinnedLabel: "Pack mystery premium",
    heroNote: "Quand le lot bouge, la gauche suit; quand le chat parle, la droite reste lisible.",
    items: sharedLots.tcgB,
    chat: [
      { id: 1, author: "jojo", body: "Le mystery est clean ici." },
      { id: 2, author: "matt", body: "Je suis la pour la derniere enchere." },
    ],
  },
  {
    id: 7,
    slug: "glow-routine-live-beauty-lab",
    title: "Glow routine en direct",
    subtitle: "Demonstration, stock court et routine beaute tres lisible.",
    seller: "beauty.lab",
    handle: "@beauty.lab",
    avatar: avatarA,
    cover: "/figma-assets/photo-feed/photo-grid-3.jpg",
    gallery: ["/figma-assets/photo-feed/photo-grid-3.jpg", "/figma-assets/photo-feed/photo-grid-8.jpg"],
    categoryId: "beauty",
    category: "Beaute",
    tags: ["Glow", "Routine live"],
    city: "Paris",
    status: "live",
    viewers: 1800,
    likes: 260,
    liveBadge: "Live - 8",
    pinnedLabel: "Gloss trio du live",
    heroNote: "Teintes, textures, puis achat direct sans friction.",
    items: sharedLots.beauty,
    chat: [
      { id: 1, author: "clara", body: "La teinte rose tient comment ?" },
      { id: 2, author: "mila", body: "Je prends la routine complete." },
    ],
  },
  {
    id: 8,
    slug: "coat-drop-live-women-select",
    title: "Selection mode live",
    subtitle: "Manteaux, sacs et pieces mode presentes une par une.",
    seller: "women.select",
    handle: "@women.select",
    avatar: avatarB,
    cover: "/figma-assets/photo-feed/photo-grid-7.jpg",
    gallery: ["/figma-assets/photo-feed/photo-grid-7.jpg", "/figma-assets/photo-feed/photo-grid-4.jpg"],
    categoryId: "womens-fashion",
    category: "Mode femme",
    tags: ["Mode femme", "Accessoires"],
    city: "Bruxelles",
    status: "live",
    viewers: 2100,
    likes: 301,
    liveBadge: "Live - 9",
    pinnedLabel: "Drop manteaux selection",
    heroNote: "Les pieces tournent rapidement mais la mise en scene reste ultra simple.",
    items: sharedLots.fashion,
    chat: [
      { id: 1, author: "nina", body: "Le sac de la 2e vague est canon." },
      { id: 2, author: "rose", body: "Il reste du stock sur le manteau ?" },
    ],
  },
];

export const liveShoppingOrdersSeed: LiveShoppingOrder[] = [
  {
    id: 9101,
    eventId: 1,
    title: "2x booster vu en live",
    buyer: "Vous",
    seller: "rice_",
    amount: 20,
    quantity: 1,
    stageIndex: 1,
    etaLabel: "48h",
    lastUpdate: "Le lot est reserve et attend la fin du live.",
    note: "Commande creee pendant le direct.",
  },
  {
    id: 9102,
    eventId: 8,
    title: "Drop manteaux selection",
    buyer: "Vous",
    seller: "women.select",
    amount: 110,
    quantity: 1,
    stageIndex: 2,
    etaLabel: "5 jours",
    lastUpdate: "Preparation en cours avant expedition.",
    note: "Merci de confirmer la taille M.",
  },
];

export function getLiveShoppingHref(event: Pick<LiveShoppingEvent, "slug">) {
  return `/live-shopping/${event.slug}`;
}

export function getLiveShoppingBySlug(slug: string) {
  return liveShoppingEvents.find((event) => event.slug === slug) ?? null;
}

export function getLiveShoppingCategoryById(categoryId: string | null | undefined) {
  if (!categoryId) {
    return null;
  }

  return liveShoppingCategories.find((category) => category.id === categoryId) ?? null;
}
