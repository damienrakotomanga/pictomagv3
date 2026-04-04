"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardList,
  ImagePlus,
  Layers3,
  PackagePlus,
  Rocket,
  ShieldCheck,
} from "lucide-react";

export type GigCreationPackageDraft = {
  id: string;
  name: string;
  price: string;
  deliveryDays: string;
  revisions: string;
  description: string;
  features: string;
  recommended: boolean;
};

export type GigCreationDraft = {
  category: string;
  title: string;
  subtitle: string;
  cover: string;
  seller: string;
  handle: string;
  responseLabel: string;
  deliveryLabel: string;
  tags: string;
  deliverables: string;
  packages: GigCreationPackageDraft[];
};

type GigCreationStep = {
  id: string;
  label: string;
  copy: string;
  heading: string;
  description: string;
  tips: string[];
};

const gigCreationSteps: GigCreationStep[] = [
  {
    id: "core",
    label: "Overview",
    copy: "Base du gig",
    heading: "Pose une offre claire des la premiere lecture",
    description:
      "Le client doit comprendre en quelques secondes ce que tu fais, pour qui, et pourquoi ton gig merite d'etre ouvert.",
    tips: [
      "Un titre concret convertit mieux qu'une promesse vague.",
      "Choisis une categorie qui aide vraiment le client a te trouver.",
      "Des tags simples valent mieux qu'une liste trop large.",
    ],
  },
  {
    id: "packages",
    label: "Pricing",
    copy: "Packs et prix",
    heading: "Structure des packages faciles a comparer",
    description:
      "On garde trois niveaux nets. Le client doit sentir la progression sans se perdre dans des options trop techniques.",
    tips: [
      "Chaque package doit avoir une promesse distincte.",
      "Le package recommande doit etre le plus lisible.",
      "Le prix d'appel doit rester credibile avec la livraison.",
    ],
  },
  {
    id: "delivery",
    label: "Details",
    copy: "Livraison et tags",
    heading: "Clarifie ce que tu livres et dans quels delais",
    description:
      "Cette etape rassure. On rend la livraison, le temps de reponse et les livrables tres faciles a scanner.",
    tips: [
      "Un delai annonce simple aide a decider plus vite.",
      "Liste les livrables comme des resultat tangibles.",
      "Evite les formulations internes au lieu du langage client.",
    ],
  },
  {
    id: "gallery",
    label: "Gallery",
    copy: "Cover et rendu",
    heading: "Choisis une cover qui donne envie d'ouvrir le gig",
    description:
      "Le visuel principal doit porter le niveau du service. On cherche un rendu propre, memorisable et directement lisible.",
    tips: [
      "Une bonne cover raconte deja l'offre.",
      "Le visuel doit rester fort meme en miniature.",
      "Garde la promesse plus forte que l'effet visuel.",
    ],
  },
  {
    id: "publish",
    label: "Publish",
    copy: "Verification finale",
    heading: "Verifie le parcours avant de publier",
    description:
      "On controle le titre, les packages, la livraison et la cover, puis on publie un gig simple a acheter et facile a partager.",
    tips: [
      "Le package recommande doit etre coherent avec le positionnement.",
      "La couverture et le prix d'appel doivent parler ensemble.",
      "Le client doit comprendre l'offre avant le premier scroll.",
    ],
  },
];

const coverChoices = [
  "/figma-assets/photo-feed/photo-grid-7.jpg",
  "/figma-assets/photo-feed/photo-grid-8.jpg",
  "/figma-assets/photo-feed/photo-grid-5.jpg",
  "/figma-assets/photo-feed/photo-grid-6.jpg",
  "/figma-assets/photo-feed/photo-grid-3.jpg",
  "/figma-assets/photo-feed/photo-grid-4.jpg",
];

const creatorMarketplaceCategories = [
  { id: "Programming", label: "Programming", iconSrc: "/marketplace-icons/categories-icon-1.svg" },
  { id: "Data", label: "Data", iconSrc: "/marketplace-icons/categories-icon-2.svg" },
  { id: "Cyber Security", label: "Cyber Security", iconSrc: "/marketplace-icons/categories-icon-3.svg" },
  { id: "IA", label: "IA", iconSrc: "/marketplace-icons/categories-icon-4.svg" },
  { id: "Design", label: "Design", iconSrc: "/marketplace-icons/categories-icon-5.svg" },
  { id: "Video", label: "Video", iconSrc: "/marketplace-icons/categories-icon-6.svg" },
  { id: "Music", label: "Music", iconSrc: "/marketplace-icons/categories-icon-7.svg" },
  { id: "Marketing", label: "Marketing", iconSrc: "/marketplace-icons/categories-icon-8.svg" },
  { id: "Writing", label: "Writing", iconSrc: "/marketplace-icons/categories-icon-9.svg" },
  { id: "Business", label: "Business", iconSrc: "/marketplace-icons/categories-icon-10.svg" },
  { id: "Photography", label: "Photography", iconSrc: "/marketplace-icons/categories-icon-11.svg" },
  { id: "Lifestyle", label: "Lifestyle", iconSrc: "/marketplace-icons/categories-icon-12.svg" },
  { id: "Influencer", label: "Influencer", iconSrc: "/marketplace-icons/categories-icon-13.svg" },
  { id: "Trending", label: "Trending", iconSrc: "/marketplace-icons/categories-icon-14.svg" },
];

function formatPreviewCurrency(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "0 EUR";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function parseDraftList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function CreatorFieldRow({
  title,
  copy,
  children,
}: {
  title: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[230px_minmax(0,1fr)] gap-8 border-t border-black/6 py-7 first:border-t-0 first:pt-0 last:pb-0">
      <div>
        <h3 className="text-[16px] font-medium tracking-[-0.015em] text-[#101522]">{title}</h3>
        <p className="mt-2 text-[14px] leading-7 text-[#667487]">{copy}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function CreatorTextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-[10px] border border-black/8 bg-white px-4 text-[14px] text-[#101522] outline-none transition focus:border-[#9fc6ff]"
    />
  );
}

function CreatorTextarea({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`w-full resize-none rounded-[10px] border border-black/8 bg-white px-4 py-3 text-[14px] leading-6 text-[#101522] outline-none transition placeholder:text-[#9ca8b8] focus:border-[#9fc6ff] ${className}`}
    />
  );
}

export function createInitialGigCreationDraft(): GigCreationDraft {
  return {
    category: "Design",
    title: "Je construis une page service premium qui rassure, clarifie l'offre et aide a convertir",
    subtitle: "Direction visuelle claire, hero fort, packages lisibles et handoff propre pour la vente.",
    cover: coverChoices[0]!,
    seller: "Axel Belujon Studio",
    handle: "@axelbelujon",
    responseLabel: "Reponse < 1h",
    deliveryLabel: "3 jours",
    tags: "UI premium, Direction art, Desktop first",
    deliverables: "Hero desktop + mobile\nSysteme de composants clefs\n2 revisions structurelles\nFichiers source livres",
    packages: [
      {
        id: "starter",
        name: "Starter",
        price: "240",
        deliveryDays: "3",
        revisions: "1 revision",
        description: "Une page hero claire avec structure simple et CTA solide.",
        features: "Hero principal, Version mobile, Export Figma",
        recommended: false,
      },
      {
        id: "growth",
        name: "Growth",
        price: "520",
        deliveryDays: "5",
        revisions: "2 revisions",
        description: "Hero + sections conversion pour vendre plus proprement.",
        features: "Hero, 3 sections, Kit assets, Responsive",
        recommended: true,
      },
      {
        id: "signature",
        name: "Signature",
        price: "920",
        deliveryDays: "7",
        revisions: "3 revisions",
        description: "Landing complete avec systeme visuel et handoff detaille.",
        features: "Landing complete, Mini design system, Motion specs, Handoff",
        recommended: false,
      },
    ],
  };
}

export function MarketplaceGigCreator({
  draft,
  currentStep,
  onStepChange,
  onFieldChange,
  onPackageFieldChange,
  onSetRecommendedPackage,
  onBackToSeller,
  onSaveDraft,
  onPublish,
}: {
  draft: GigCreationDraft;
  currentStep: number;
  onStepChange: (step: number) => void;
  onFieldChange: (field: Exclude<keyof GigCreationDraft, "packages">, value: string) => void;
  onPackageFieldChange: (index: number, field: keyof GigCreationPackageDraft, value: string | boolean) => void;
  onSetRecommendedPackage: (index: number) => void;
  onBackToSeller: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  const canGoBack = currentStep > 0;
  const isLastStep = currentStep === gigCreationSteps.length - 1;
  const currentStepConfig = gigCreationSteps[currentStep]!;
  const previewPackage = draft.packages.find((item) => item.recommended) ?? draft.packages[1] ?? draft.packages[0];
  const parsedTags = parseDraftList(draft.tags);
  const parsedDeliverables = parseDraftList(draft.deliverables);

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <div className="divide-y divide-black/6">
          <CreatorFieldRow
            title="Gig title"
            copy="Le titre doit expliquer clairement le service propose. Il doit etre concret, lisible, et facile a comprendre des la premiere lecture."
          >
            <div>
              <CreatorTextarea
                value={draft.title}
                onChange={(value) => onFieldChange("title", value)}
                className="h-[116px] text-[28px] font-medium leading-[1.14] tracking-[-0.04em]"
              />
              <div className="mt-2 text-right text-[12px] text-[#8a97aa]">{draft.title.length} / 120</div>
            </div>
          </CreatorFieldRow>

          <CreatorFieldRow
            title="Category"
            copy="Choisis la categorie qui permettra au client de te trouver rapidement. Le bon classement aide la lecture et la recherche."
          >
            <div className="space-y-5">
              <div className="grid grid-cols-4 gap-x-4 gap-y-5 xl:grid-cols-7">
                {creatorMarketplaceCategories.map((category) => {
                  const active = draft.category === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => onFieldChange("category", category.id)}
                      className="group flex min-w-0 flex-col items-center text-center"
                    >
                      <span className="flex h-10 w-10 items-center justify-center transition group-hover:-translate-y-[1px]">
                        <Image
                          src={category.iconSrc}
                          alt={category.label}
                          width={31}
                          height={31}
                          unoptimized
                          className="h-[31px] w-[31px] object-contain"
                        />
                      </span>
                      <span className={`mt-2 text-[13px] font-medium text-[#111111] ${active ? "font-semibold" : ""}`}>
                        {category.label}
                      </span>
                      <span className={`mt-3 h-[2px] w-14 rounded-full bg-[#0094ff] transition ${active ? "opacity-100" : "opacity-0"}`} />
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[10px] border border-black/7 bg-[#f8fafc] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b8797]">Categorie selectionnee</p>
                    <p className="mt-2 text-[15px] font-medium tracking-[-0.01em] text-[#101522]">{draft.category}</p>
              </div>
            </div>
          </CreatorFieldRow>

          <CreatorFieldRow
            title="Seller identity"
            copy="Le nom vendeur et le handle doivent etre propres et partageables. C'est ce qui signe ton gig dans la marketplace."
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7b8797]">Nom vendeur</p>
                <CreatorTextInput value={draft.seller} onChange={(value) => onFieldChange("seller", value)} />
              </div>
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7b8797]">Handle public</p>
                <CreatorTextInput value={draft.handle} onChange={(value) => onFieldChange("handle", value)} />
              </div>
            </div>
          </CreatorFieldRow>

          <CreatorFieldRow
            title="Search tags"
            copy="Utilise quelques mots cles tres simples. Ils aident la recherche, mais ils doivent aussi rester credibles pour ton offre."
          >
            <div>
              <CreatorTextarea
                value={draft.tags}
                onChange={(value) => onFieldChange("tags", value)}
                className="h-[96px]"
                placeholder="UI premium, Landing page, Design system"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {parsedTags.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-[10px] border border-black/8 bg-[#f7f9fc] px-3 py-1.5 text-[12px] font-medium text-[#4d5b6d]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </CreatorFieldRow>
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          {draft.packages.map((pkg, index) => (
            <section
              key={pkg.id}
              className={`rounded-[10px] border p-5 transition ${
                pkg.recommended ? "border-[#bfd7ff] bg-[#f8fbff]" : "border-black/7 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b8797]">Package {index + 1}</p>
                  <input
                    value={pkg.name}
                    onChange={(event) => onPackageFieldChange(index, "name", event.target.value)}
                    className="mt-2 w-full border-none bg-transparent p-0 text-[24px] font-semibold tracking-[-0.04em] text-[#101522] outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onSetRecommendedPackage(index)}
                  className={`rounded-[10px] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                    pkg.recommended ? "bg-[#2b6fff] text-white" : "border border-black/8 bg-white text-[#617185]"
                  }`}
                >
                  {pkg.recommended ? "Package recommande" : "Definir comme recommande"}
                </button>
              </div>

              <div className="mt-5 grid grid-cols-[minmax(0,1fr)_120px_120px_160px] gap-4">
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7b8797]">Promesse</p>
                  <CreatorTextarea
                    value={pkg.description}
                    onChange={(value) => onPackageFieldChange(index, "description", value)}
                    className="h-[88px]"
                  />
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7b8797]">Prix</p>
                  <CreatorTextInput value={pkg.price} onChange={(value) => onPackageFieldChange(index, "price", value)} />
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7b8797]">Jours</p>
                  <CreatorTextInput
                    value={pkg.deliveryDays}
                    onChange={(value) => onPackageFieldChange(index, "deliveryDays", value)}
                  />
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7b8797]">Revisions</p>
                  <CreatorTextInput
                    value={pkg.revisions}
                    onChange={(value) => onPackageFieldChange(index, "revisions", value)}
                  />
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7b8797]">Ce qui est inclus</p>
                <CreatorTextInput
                  value={pkg.features}
                  onChange={(value) => onPackageFieldChange(index, "features", value)}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {parseDraftList(pkg.features).slice(0, 5).map((feature) => (
                    <span
                      key={feature}
                      className="rounded-[10px] border border-black/8 bg-[#f7f9fc] px-3 py-1.5 text-[12px] font-medium text-[#4d5b6d]"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="divide-y divide-black/6">
          <CreatorFieldRow
            title="Delais"
            copy="Annonce des delais qui restent faciles a tenir. Le client doit sentir une promesse realiste, pas optimiste."
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7b8797]">Temps de reponse</p>
                <CreatorTextInput value={draft.responseLabel} onChange={(value) => onFieldChange("responseLabel", value)} />
              </div>
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7b8797]">Livraison annoncee</p>
                <CreatorTextInput value={draft.deliveryLabel} onChange={(value) => onFieldChange("deliveryLabel", value)} />
              </div>
            </div>
          </CreatorFieldRow>

          <CreatorFieldRow
            title="Livrables"
            copy="Liste ce que le client recoit vraiment. On veut des livrables concrets, faciles a imaginer et faciles a verifier."
          >
            <div>
              <CreatorTextarea
                value={draft.deliverables}
                onChange={(value) => onFieldChange("deliverables", value)}
                className="h-[156px]"
              />
              <div className="mt-3 grid gap-2">
                {parsedDeliverables.slice(0, 6).map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-[10px] border border-black/8 bg-[#f8fafc] px-3 py-2.5 text-[13px] text-[#334155]"
                  >
                    <Check className="h-4 w-4 text-[#2b6fff]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </CreatorFieldRow>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="divide-y divide-black/6">
          <CreatorFieldRow
            title="Cover"
            copy="Choisis une image principale forte. Elle doit rester lisible a petite taille, et raconter ton niveau de service sans texte parasite."
          >
            <div className="grid grid-cols-3 gap-4">
              {coverChoices.map((cover) => {
                const active = draft.cover === cover;
                return (
                  <button
                    key={cover}
                    type="button"
                    onClick={() => onFieldChange("cover", cover)}
                    className={`overflow-hidden rounded-[10px] border transition ${
                      active ? "border-[#9fc6ff] shadow-[0_14px_32px_rgba(43,111,255,0.12)]" : "border-black/8"
                    }`}
                  >
                    <div className="relative aspect-[4/3]">
                      <Image src={cover} alt="Cover de gig" fill sizes="280px" className="object-cover" />
                    </div>
                  </button>
                );
              })}
            </div>
          </CreatorFieldRow>

          <CreatorFieldRow
            title="Controle visuel"
            copy="Verifie rapidement les points qui rendent une cover plus lisible dans la grille marketplace."
          >
            <div className="grid gap-2">
              {[
                "Le sujet principal est lisible sans zoom.",
                "La cover reste forte a petite taille.",
                "Le rendu visuel correspond vraiment au service propose.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[10px] border border-black/8 bg-[#f8fafc] px-3 py-3 text-[13px] text-[#334155]"
                >
                  <Check className="h-4 w-4 text-[#2b6fff]" />
                  {item}
                </div>
              ))}
            </div>
          </CreatorFieldRow>
        </div>
      );
    }

    return (
      <div className="divide-y divide-black/6">
        <CreatorFieldRow
          title="Verification"
          copy="On passe en revue les informations qui comptent vraiment avant de publier le gig dans ton espace vendeur."
        >
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Categorie", value: draft.category },
              { label: "Prix d'appel", value: formatPreviewCurrency(draft.packages[0]?.price ?? "0") },
              { label: "Package recommande", value: previewPackage?.name ?? "Aucun" },
              { label: "Livraison", value: draft.deliveryLabel },
            ].map((item) => (
              <div key={item.label} className="rounded-[10px] border border-black/8 bg-[#f8fafc] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b8797]">{item.label}</p>
                    <p className="mt-2 text-[15px] font-medium tracking-[-0.01em] text-[#101522]">{item.value}</p>
              </div>
            ))}
          </div>
        </CreatorFieldRow>

        <CreatorFieldRow
          title="Parcours apres publication"
          copy="Une fois publie, ton gig apparait dans l'onglet Draft de ton dashboard. Tu peux le relire, l'ajuster, puis le remettre dans la marketplace."
        >
          <div className="grid gap-2">
            {[
              { icon: ClipboardList, label: "Le gig arrive dans ton dashboard vendeur." },
              { icon: ShieldCheck, label: "Tu peux encore ajuster cover, prix ou packages." },
              { icon: Rocket, label: "Le partage par lien reste possible des la publication." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-[10px] border border-black/8 bg-[#f8fafc] px-3 py-3 text-[13px] text-[#334155]"
                >
                  <Icon className="h-4 w-4 text-[#2b6fff]" />
                  {item.label}
                </div>
              );
            })}
          </div>
        </CreatorFieldRow>
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[10px] border border-black/7 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-5">
          <div className="flex flex-wrap items-center gap-4">
            {gigCreationSteps.map((step, index) => {
              const active = index === currentStep;
              const passed = index < currentStep;
              const Icon = index === 0 ? Layers3 : index === 1 ? PackagePlus : index === 2 ? ClipboardList : index === 3 ? ImagePlus : Rocket;

              return (
                <button key={step.id} type="button" onClick={() => onStepChange(index)} className="flex items-center gap-3 text-left">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-medium tracking-[-0.01em] transition ${
                      active
                        ? "border-[#2b6fff] bg-[#2b6fff] text-white"
                        : passed
                          ? "border-[#bcd8ff] bg-[#eef5ff] text-[#2b6fff]"
                          : "border-black/8 bg-white text-[#8995a7]"
                    }`}
                  >
                    {passed ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="hidden min-w-0 md:block">
                    <span className={`block text-[14px] font-semibold ${active ? "text-[#101522]" : "text-[#8894a6]"}`}>{step.label}</span>
                    <span className="mt-0.5 block text-[12px] text-[#97a3b3]">{step.copy}</span>
                  </span>
                  {index !== gigCreationSteps.length - 1 ? <ChevronRight className="hidden h-4 w-4 text-[#c1c9d4] xl:block" /> : null}
                  <Icon className="hidden h-0 w-0" />
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToSeller}
                  className="inline-flex items-center gap-2 rounded-[10px] border border-black/8 bg-white px-4 py-2.5 text-[13px] font-medium tracking-[-0.01em] text-[#101522]"
            >
              <ArrowLeft className="h-4 w-4" />
              Gigs
            </button>
            <button
              type="button"
              onClick={onSaveDraft}
                  className="rounded-[10px] border border-black/8 bg-white px-4 py-2.5 text-[13px] font-medium tracking-[-0.01em] text-[#101522]"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="rounded-[10px] border border-black/7 bg-white">
          <div className="border-b border-black/6 px-7 py-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b8797]">{currentStepConfig.label}</p>
            <h1 className="mt-3 text-[36px] font-medium leading-[1.02] tracking-[-0.04em] text-[#101522]">
              {currentStepConfig.heading}
            </h1>
            <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-[#5f6f82]">{currentStepConfig.description}</p>
          </div>

          <div className="px-7 py-7">{renderStepContent()}</div>

          <div className="flex items-center justify-between border-t border-black/6 px-7 py-5">
            <div className="text-[13px] text-[#607085]">
              Etape {currentStep + 1} sur {gigCreationSteps.length}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onStepChange(Math.max(0, currentStep - 1))}
                disabled={!canGoBack}
                  className={`rounded-[10px] px-4 py-2.5 text-[13px] font-medium tracking-[-0.01em] transition ${
                  canGoBack
                    ? "border border-black/8 bg-white text-[#101522]"
                    : "cursor-not-allowed border border-black/6 bg-[#f6f8fb] text-[#a0aab7]"
                }`}
              >
                Back
              </button>
              {isLastStep ? (
                <button
                  type="button"
                  onClick={onPublish}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[#101522] px-5 py-2.5 text-[13px] font-medium tracking-[-0.01em] text-white"
                >
                  Publish gig
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onStepChange(Math.min(gigCreationSteps.length - 1, currentStep + 1))}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[#101522] px-5 py-2.5 text-[13px] font-medium tracking-[-0.01em] text-white"
                >
                  Save & continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="sticky top-[96px] space-y-4">
            <div className="rounded-[10px] border border-black/7 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7b8797]">Preview</p>
              <div className="mt-4 overflow-hidden rounded-[10px] bg-[#eef2f8]">
                <div className="relative aspect-[4/3]">
                  <Image src={draft.cover} alt={draft.title} fill sizes="320px" className="object-cover" />
                </div>
              </div>

              <p className="mt-4 line-clamp-3 text-[22px] font-medium leading-[1.14] tracking-[-0.03em] text-[#101522]">
                {draft.title}
              </p>
              <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-[#5f6f82]">{draft.subtitle}</p>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 overflow-hidden rounded-full ring-1 ring-[#2b6fff]/20">
                    <Image src="/figma-assets/avatar-post.png" alt={draft.seller} fill sizes="44px" className="object-cover" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium tracking-[-0.01em] text-[#101522]">{draft.seller}</p>
                    <p className="text-[12px] text-[#607085]">{draft.handle}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-[#7b8797]">Starting at</p>
                  <p className="mt-0.5 text-[22px] font-medium tracking-[-0.02em] text-[#101522]">
                    {formatPreviewCurrency(draft.packages[0]?.price ?? "0")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[10px] border border-black/7 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">A retenir sur cette etape</p>
              <div className="mt-4 space-y-3">
                {currentStepConfig.tips.map((tip) => (
                  <div key={tip} className="flex items-start gap-3 text-[13px] leading-6 text-[#334155]">
                    <div className="mt-1 h-2 w-2 rounded-full bg-[#2b6fff]" />
                    <p>{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[10px] border border-black/7 bg-[#fbfcfe] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8797]">Lecture client</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#607085]">Categorie</span>
                  <span className="font-semibold text-[#101522]">{draft.category}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#607085]">Tags visibles</span>
                  <span className="font-semibold text-[#101522]">{parsedTags.length}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#607085]">Livrables</span>
                  <span className="font-semibold text-[#101522]">{parsedDeliverables.length}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#607085]">Package recommande</span>
                  <span className="font-semibold text-[#101522]">{previewPackage?.name ?? "Aucun"}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
