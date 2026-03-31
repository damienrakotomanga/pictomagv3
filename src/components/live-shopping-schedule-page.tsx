"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock3,
  ImagePlus,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { type HeaderNavItemId } from "@/components/animated-header-nav";
import { LiveHeader } from "@/components/live-shopping-page";
import { liveShoppingCategories } from "@/lib/live-shopping-data";
import {
  normalizeLiveShoppingScheduledLive,
  type LiveShoppingScheduledLive,
} from "@/lib/live-shopping-schedule";
import {
  readLiveShoppingScheduleFromApi,
  writeLiveShoppingScheduleToApi,
} from "@/lib/state-api";

type ScheduleSectionId =
  | "info"
  | "media"
  | "shipping"
  | "content"
  | "options"
  | "discovery";

const scheduleSections: Array<{ id: ScheduleSectionId; label: string }> = [
  { id: "info", label: "Informations du live" },
  { id: "media", label: "Medias" },
  { id: "shipping", label: "Parametres de livraison" },
  { id: "content", label: "Parametres de contenu" },
  { id: "options", label: "Afficher les options" },
  { id: "discovery", label: "Afficher la decouverte" },
];

const repeatOptions = ["Ne se repete pas", "Chaque semaine", "Toutes les 2 semaines", "Chaque mois"];
const liveFormats = ["Prix fixe", "Enchere live", "Prix fixe + enchere", "Drop exclusif"];
const languages = ["Francais", "English", "Espanol", "Deutsch"];

const tagSuggestionsByCategory: Record<string, string[]> = {
  "trading-card-games": ["Pokemon", "One Piece", "Cartes notees", "Vintage", "Mystery packs", "Rivalites"],
  "finds-and-thrifts": ["Vintage", "Vide-grenier", "Selection", "Objet rare", "Lot", "Maison"],
  beauty: ["Routine", "Skincare", "Makeup", "Drop", "Limited", "Glow"],
  "mens-fashion": ["Drop", "Jackets", "Sneakers", "Archive", "Capsule", "Selection"],
  "womens-fashion": ["Mode", "Capsule", "Beauty", "Archive", "Designer", "Selection"],
};

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultDate() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return formatDateInput(date);
}

function toScheduleTimestamp(item: Pick<LiveShoppingScheduledLive, "liveDate" | "liveTime">) {
  if (!item.liveDate) {
    return 0;
  }

  const raw = `${item.liveDate}T${item.liveTime || "00:00"}`;
  const time = Date.parse(raw);
  return Number.isNaN(time) ? 0 : time;
}

function formatScheduledDate(item: Pick<LiveShoppingScheduledLive, "liveDate" | "liveTime">) {
  const time = toScheduleTimestamp(item);
  if (time === 0) {
    return "Date a confirmer";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(time));
}

function ScheduleField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[#101522]">{label}</span>
      {children}
    </label>
  );
}

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
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
          checked ? "left-[30px]" : "left-1"
        }`}
      />
    </button>
  );
}

export function LiveShoppingSchedulePage({
  initialEditId = null,
}: {
  initialEditId?: string | null;
}) {
  const router = useRouter();
  const sectionRefs = useRef<Record<ScheduleSectionId, HTMLDivElement | null>>({
    info: null,
    media: null,
    shipping: null,
    content: null,
    options: null,
    discovery: null,
  });

  const [activeSection, setActiveSection] = useState<ScheduleSectionId>("info");
  const [title, setTitle] = useState("");
  const [liveDate, setLiveDate] = useState(createDefaultDate());
  const [liveTime, setLiveTime] = useState("19:30");
  const [repeatValue, setRepeatValue] = useState(repeatOptions[0]);
  const [categoryId, setCategoryId] = useState("trading-card-games");
  const [saleFormat, setSaleFormat] = useState(liveFormats[1]);
  const [selectedTags, setSelectedTags] = useState<string[]>(["Pokemon"]);
  const [moderators, setModerators] = useState<string[]>(["axel.live.mod"]);
  const [moderatorDraft, setModeratorDraft] = useState("");
  const [coverName, setCoverName] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [freePickup, setFreePickup] = useState(true);
  const [shippingDefault, setShippingDefault] = useState("Expedition 48h");
  const [shippingFees, setShippingFees] = useState("6,90 EUR");
  const [disablePreBids, setDisablePreBids] = useState(false);
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [replayEnabled, setReplayEnabled] = useState(true);
  const [language, setLanguage] = useState(languages[0]);
  const [explicitLanguage, setExplicitLanguage] = useState(false);
  const [mutedWords, setMutedWords] = useState("");
  const [discoveryMode, setDiscoveryMode] = useState<"public" | "followers" | "private">("public");
  const [scheduledLives, setScheduledLives] = useState<LiveShoppingScheduledLive[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [editingScheduledLiveId, setEditingScheduledLiveId] = useState<string | null>(initialEditId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const initialEditAppliedRef = useRef(false);

  const selectedCategory = useMemo(
    () => liveShoppingCategories.find((category) => category.id === categoryId) ?? liveShoppingCategories[0],
    [categoryId],
  );
  const suggestedTags = useMemo(
    () => tagSuggestionsByCategory[categoryId] ?? ["Drop", "Edition limitee", "Selection", "Premium", "Collectors"],
    [categoryId],
  );

  const resetFormToDefaults = useCallback(() => {
    setTitle("");
    setLiveDate(createDefaultDate());
    setLiveTime("19:30");
    setRepeatValue(repeatOptions[0]);
    setCategoryId("trading-card-games");
    setSaleFormat(liveFormats[1]);
    setSelectedTags(["Pokemon"]);
    setModerators(["axel.live.mod"]);
    setModeratorDraft("");
    setCoverName(null);
    setPreviewName(null);
    setFreePickup(true);
    setShippingDefault("Expedition 48h");
    setShippingFees("6,90 EUR");
    setDisablePreBids(false);
    setWaitlistEnabled(true);
    setReplayEnabled(true);
    setLanguage(languages[0]);
    setExplicitLanguage(false);
    setMutedWords("");
    setDiscoveryMode("public");
    setEditingScheduledLiveId(null);
  }, []);

  const applyScheduledLiveToForm = useCallback((entry: LiveShoppingScheduledLive) => {
    setTitle(entry.title);
    setLiveDate(entry.liveDate);
    setLiveTime(entry.liveTime);
    setRepeatValue(entry.repeatValue);
    setCategoryId(entry.categoryId);
    setSaleFormat(entry.saleFormat);
    setSelectedTags(entry.tags.slice(0, 3));
    setModerators(entry.moderators.slice(0, 12));
    setModeratorDraft("");
    setCoverName(entry.coverName);
    setPreviewName(entry.previewName);
    setFreePickup(entry.freePickup);
    setShippingDefault(entry.shippingDefault);
    setShippingFees(entry.shippingFees);
    setDisablePreBids(entry.disablePreBids);
    setWaitlistEnabled(entry.waitlistEnabled);
    setReplayEnabled(entry.replayEnabled);
    setLanguage(entry.language);
    setExplicitLanguage(entry.explicitLanguage);
    setMutedWords(entry.mutedWords);
    setDiscoveryMode(entry.discoveryMode);
    setEditingScheduledLiveId(entry.id);
  }, []);

  useEffect(() => {
    let active = true;

    const syncSchedule = async () => {
      const nextSchedule = await readLiveShoppingScheduleFromApi([]);
      if (!active) {
        return;
      }

      setScheduledLives(nextSchedule);
      setScheduleLoading(false);
    };

    void syncSchedule();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (scheduleLoading || !initialEditId || initialEditAppliedRef.current) {
      return;
    }

    const target = scheduledLives.find((item) => item.id === initialEditId);
    if (!target) {
      initialEditAppliedRef.current = true;
      setToast("Live introuvable pour edition.");
      return;
    }

    applyScheduledLiveToForm(target);
    initialEditAppliedRef.current = true;
    sectionRefs.current.info?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [applyScheduledLiveToForm, initialEditId, scheduleLoading, scheduledLives]);

  useEffect(() => {
    const handleScroll = () => {
      const marker = window.scrollY + 180;
      let next: ScheduleSectionId = "info";
      for (const section of scheduleSections) {
        const top = sectionRefs.current[section.id]?.offsetTop ?? 0;
        if (marker >= top) next = section.id;
      }
      setActiveSection(next);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const jumpToSection = (id: ScheduleSectionId) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) return current.filter((entry) => entry !== tag);
      if (current.length >= 3) return current;
      return [...current, tag];
    });
  };

  const addModerator = () => {
    const value = moderatorDraft.trim().replace(/^@/, "");
    if (!value || moderators.includes(value)) return;
    setModerators((current) => [...current, value]);
    setModeratorDraft("");
  };

  const removeScheduledLive = async (id: string) => {
    const removedEntry = scheduledLives.find((item) => item.id === id) ?? null;
    const nextSchedule = scheduledLives.filter((item) => item.id !== id);
    setScheduledLives(nextSchedule);
    const persisted = await writeLiveShoppingScheduleToApi(nextSchedule);
    setScheduledLives(persisted);
    if (editingScheduledLiveId === id) {
      resetFormToDefaults();
    }
    setToast(removedEntry ? `"${removedEntry.title}" supprime du planning.` : "Live supprime du planning.");
  };

  const startEditingFromList = (id: string) => {
    const entry = scheduledLives.find((item) => item.id === id);
    if (!entry) {
      return;
    }

    applyScheduledLiveToForm(entry);
    sectionRefs.current.info?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEditing = () => {
    resetFormToDefaults();
    setToast("Edition annulee.");
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!title.trim()) {
      setToast("Ajoute un titre avant de programmer le live.");
      jumpToSection("info");
      return;
    }

    if (!liveDate || !liveTime) {
      setToast("Choisis une date et une heure pour le live.");
      jumpToSection("info");
      return;
    }

    setIsSubmitting(true);

    try {
      const existingEntry = editingScheduledLiveId
        ? scheduledLives.find((item) => item.id === editingScheduledLiveId) ?? null
        : null;
      const nextEntry = normalizeLiveShoppingScheduledLive({
        id: existingEntry?.id,
        title: title.trim(),
        liveDate,
        liveTime,
        repeatValue,
        categoryId,
        categoryLabel: selectedCategory.label,
        saleFormat,
        tags: selectedTags,
        moderators,
        coverName,
        previewName,
        freePickup,
        shippingDefault,
        shippingFees,
        disablePreBids,
        waitlistEnabled,
        replayEnabled,
        language,
        explicitLanguage,
        mutedWords,
        discoveryMode,
        liveState: existingEntry?.liveState ?? "scheduled",
        liveSessionSlug: existingEntry?.liveSessionSlug ?? null,
        liveSessionStartedAt: existingEntry?.liveSessionStartedAt ?? null,
        liveSessionUpdatedAt: existingEntry?.liveSessionUpdatedAt ?? Date.now(),
        createdAt: existingEntry?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      });
      const nextSchedule = existingEntry
        ? scheduledLives.map((item) => (item.id === existingEntry.id ? nextEntry : item))
        : [nextEntry, ...scheduledLives];
      const sortedSchedule = [...nextSchedule].sort((a, b) => toScheduleTimestamp(a) - toScheduleTimestamp(b));
      const persisted = await writeLiveShoppingScheduleToApi(sortedSchedule);
      setScheduledLives(persisted);
      setToast(existingEntry ? "Live mis a jour." : "Live programme.");
      setEditingScheduledLiveId(null);
      initialEditAppliedRef.current = true;
      window.setTimeout(() => router.push("/live-shopping"), 900);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <LiveHeader
        onNavClick={handleNav}
        onProfileClick={() => router.push("/profile")}
        onCreateClick={() => router.push("/live-shopping/schedule")}
        onNotificationsClick={() => setToast("Notifications live ouvertes.")}
        onMessagesClick={() => setToast("Messagerie live ouverte.")}
        onMenuClick={() => setToast("Menu du compte ouvert.")}
      />

      <section className="pt-[120px]">
        <div className="mx-auto w-[1440px] px-8 pb-36">
          <div className="mb-10 flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/live-shopping")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#101522] transition hover:border-[#cfe0ff]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-[38px] font-semibold tracking-[-0.05em] text-[#101522]">Programmer un live</h1>
              <p className="mt-2 text-[15px] leading-7 text-[#66768c]">
                Prepare ton prochain live sans friction. On garde le setup simple, clair et propre a partager.
              </p>
            </div>
          </div>

          <div className="mb-8 rounded-[10px] border border-black/8 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[18px] font-semibold tracking-[-0.03em] text-[#101522]">Lives programmes</p>
                <p className="mt-1 text-[13px] text-[#66768c]">
                  Tes prochains lives apparaissent ici et restent synchronises sur ton compte.
                </p>
              </div>
              <span className="rounded-full border border-[#d7e4f7] px-3 py-1 text-[12px] font-medium text-[#2b6fff]">
                {scheduledLives.length} planifie{scheduledLives.length > 1 ? "s" : ""}
              </span>
            </div>

            {editingScheduledLiveId ? (
              <div className="mt-4 flex items-center justify-between rounded-[10px] border border-[#dce8ff] bg-[#f7fbff] px-4 py-3">
                <p className="text-[13px] font-medium text-[#2b6fff]">Edition d un live programme en cours.</p>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="inline-flex h-8 items-center justify-center rounded-[10px] border border-[#bfd3ff] px-3 text-[12px] font-medium text-[#2b6fff]"
                >
                  Annuler l edition
                </button>
              </div>
            ) : null}

            {scheduleLoading ? (
              <div className="mt-4 rounded-[10px] border border-dashed border-[#d9e3f2] bg-[#fbfdff] px-4 py-4 text-[14px] text-[#7a889b]">
                Chargement du planning...
              </div>
            ) : scheduledLives.length === 0 ? (
              <div className="mt-4 rounded-[10px] border border-dashed border-[#d9e3f2] bg-[#fbfdff] px-4 py-4 text-[14px] text-[#7a889b]">
                Aucun live programme pour l&apos;instant.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {scheduledLives.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-[10px] border border-black/8 bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-[#101522]">{item.title}</p>
                      <p className="mt-1 text-[13px] text-[#6a788c]">
                        {formatScheduledDate(item)} · {item.categoryLabel} · {item.saleFormat}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditingFromList(item.id)}
                        className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[#dce4f2] px-3 text-[13px] font-medium text-[#101522] transition hover:border-[#bfd3ff] hover:text-[#2b6fff]"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void removeScheduledLive(item.id);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dce4f2] text-[#5f6f84] transition hover:border-[#bfd3ff] hover:text-[#2b6fff]"
                        aria-label="Supprimer ce live programme"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-10">
            <aside className="sticky top-[120px] self-start">
              <nav className="space-y-2">
                {scheduleSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => jumpToSection(section.id)}
                    className={`flex w-full items-center justify-between rounded-[10px] px-4 py-3 text-left text-[14px] transition ${
                      activeSection === section.id
                        ? "bg-[#eef4ff] font-semibold text-[#2b6fff]"
                        : "text-[#6a788c] hover:bg-[#f8faff] hover:text-[#101522]"
                    }`}
                  >
                    <span>{section.label}</span>
                    {activeSection === section.id ? <span className="h-2 w-2 rounded-full bg-[#2b6fff]" /> : null}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="space-y-6">
              <div
                ref={(node) => {
                  sectionRefs.current.info = node;
                }}
                className="rounded-[10px] border border-black/8 bg-white p-7"
              >
                <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#101522]">Informations du live</h2>
                <p className="mt-2 text-[14px] leading-6 text-[#66768c]">
                  Donne un titre clair, choisis une categorie precise et annonce le format de vente principal.
                </p>

                <div className="mt-6 space-y-5">
                  <ScheduleField label="Donne un nom a ton live">
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Ex: One Piece premium break + hits grades"
                      className="h-14 w-full rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none placeholder:text-[#9aa7b7] focus:border-[#bfd3ff]"
                    />
                  </ScheduleField>

                  <div className="grid grid-cols-3 gap-4">
                    <ScheduleField label="Date du live">
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f8da1]" />
                        <input
                          type="date"
                          value={liveDate}
                          onChange={(event) => setLiveDate(event.target.value)}
                          className="h-14 w-full rounded-[10px] border border-black/10 pl-11 pr-4 text-[15px] text-[#101522] outline-none focus:border-[#bfd3ff]"
                        />
                      </div>
                    </ScheduleField>
                    <ScheduleField label="Heure du live">
                      <div className="relative">
                        <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f8da1]" />
                        <input
                          type="time"
                          value={liveTime}
                          onChange={(event) => setLiveTime(event.target.value)}
                          className="h-14 w-full rounded-[10px] border border-black/10 pl-11 pr-4 text-[15px] text-[#101522] outline-none focus:border-[#bfd3ff]"
                        />
                      </div>
                    </ScheduleField>
                    <ScheduleField label="Repetitions">
                      <div className="relative">
                        <select
                          value={repeatValue}
                          onChange={(event) => setRepeatValue(event.target.value)}
                          className="h-14 w-full appearance-none rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none focus:border-[#bfd3ff]"
                        >
                          {repeatOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f8da1]" />
                      </div>
                    </ScheduleField>
                  </div>
                </div>
              </div>

              <div className="rounded-[10px] border border-black/8 bg-white p-7">
                <h3 className="text-[24px] font-semibold tracking-[-0.04em] text-[#101522]">Categorie principale</h3>
                <p className="mt-2 text-[14px] leading-6 text-[#66768c]">
                  Categoriser ton live avec precision permet d&apos;ameliorer sa lisibilite et sa decouverte.
                </p>

                <div className="mt-5 grid grid-cols-4 gap-3">
                  {liveShoppingCategories.slice(0, 12).map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setCategoryId(category.id)}
                      className={`rounded-[10px] border px-4 py-3 text-left text-[14px] transition ${
                        category.id === categoryId
                          ? "border-[#bfd3ff] bg-[#eef4ff] font-semibold text-[#2b6fff]"
                          : "border-black/8 bg-white text-[#101522] hover:border-[#d6e2f8]"
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-[10px] border border-dashed border-[#dbe5f4] bg-[#fbfdff] px-4 py-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8aa0bd]">Utilisee recemment</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[selectedCategory.label, "Cartes One Piece", "Selection premium"].map((label) => (
                      <span key={label} className="rounded-full border border-[#d7e4f7] px-3 py-1.5 text-[13px] text-[#4f6075]">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[10px] border border-black/8 bg-white p-7">
                <h3 className="text-[24px] font-semibold tracking-[-0.04em] text-[#101522]">Format de vente principal</h3>
                <p className="mt-2 text-[14px] leading-6 text-[#66768c]">
                  Choisis le format que tu utilises le plus souvent pendant le live. L&apos;acheteur comprend mieux le setup avant d&apos;entrer.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {liveFormats.map((format) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => setSaleFormat(format)}
                      className={`rounded-[10px] border px-4 py-3 text-left text-[14px] transition ${
                        saleFormat === format
                          ? "border-[#bfd3ff] bg-[#eef4ff] font-semibold text-[#2b6fff]"
                          : "border-black/8 text-[#101522] hover:border-[#d6e2f8]"
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[10px] border border-black/8 bg-white p-7">
                <h3 className="text-[24px] font-semibold tracking-[-0.04em] text-[#101522]">Tags de live</h3>
                <p className="mt-2 text-[14px] leading-6 text-[#66768c]">Selectionne jusqu&apos;a 3 tags pour aider la recommandation et la recherche.</p>
                <div className="mt-5 flex min-h-14 flex-wrap gap-2 rounded-[10px] border border-black/10 px-4 py-3">
                  {selectedTags.length ? (
                    selectedTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="inline-flex items-center gap-2 rounded-full bg-[#eef4ff] px-3 py-1.5 text-[13px] font-medium text-[#2b6fff]"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {tag}
                      </button>
                    ))
                  ) : (
                    <span className="text-[14px] text-[#99a7b7]">Aucun tag selectionne.</span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full border px-3 py-1.5 text-[13px] transition ${
                        selectedTags.includes(tag)
                          ? "border-[#bfd3ff] bg-[#eef4ff] text-[#2b6fff]"
                          : "border-[#d7e1f0] text-[#4f6075] hover:border-[#c7d8f5]"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div
                ref={(node) => {
                  sectionRefs.current.media = node;
                }}
                className="rounded-[10px] border border-black/8 bg-white p-7"
              >
                <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#101522]">Medias</h2>
                <p className="mt-2 text-[14px] leading-6 text-[#66768c]">
                  Ajoute une vignette et un apercu video pour maximiser la visibilite du live dans la grille.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed border-[#d6dfed] bg-[#fbfdff] text-center transition hover:border-[#bfd3ff]">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => setCoverName(event.target.files?.[0]?.name ?? null)}
                    />
                    <ImagePlus className="h-8 w-8 text-[#2b6fff]" />
                    <span className="mt-4 text-[16px] font-semibold text-[#101522]">Ajouter une photo</span>
                    <span className="mt-2 text-[13px] text-[#6a788c]">{coverName ?? "Vignette du live en 4:5 ou 1:1."}</span>
                  </label>
                  <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed border-[#d6dfed] bg-[#fbfdff] text-center transition hover:border-[#bfd3ff]">
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(event) => setPreviewName(event.target.files?.[0]?.name ?? null)}
                    />
                    <Video className="h-8 w-8 text-[#2b6fff]" />
                    <span className="mt-4 text-[16px] font-semibold text-[#101522]">Ajouter une video</span>
                    <span className="mt-2 text-[13px] text-[#6a788c]">{previewName ?? "Apercu court pour la decouverte."}</span>
                  </label>
                </div>

                <div className="mt-6">
                  <ScheduleField label="Moderateurs">
                    <div className="rounded-[10px] border border-black/10 px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {moderators.map((moderator) => (
                          <span key={moderator} className="inline-flex items-center gap-2 rounded-full border border-[#d7e4f7] px-3 py-1.5 text-[13px] text-[#101522]">
                            @{moderator}
                            <button
                              type="button"
                              onClick={() => setModerators((current) => current.filter((entry) => entry !== moderator))}
                              className="text-[#7f8da1]"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-3">
                        <input
                          value={moderatorDraft}
                          onChange={(event) => setModeratorDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addModerator();
                            }
                          }}
                          placeholder="Ajouter un moderateur"
                          className="h-11 flex-1 rounded-[10px] border border-black/10 px-4 text-[14px] text-[#101522] outline-none placeholder:text-[#9aa7b7]"
                        />
                        <button
                          type="button"
                          onClick={addModerator}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#d7e4f7] px-4 text-[14px] font-medium text-[#101522]"
                        >
                          <Plus className="h-4 w-4" />
                          Ajouter
                        </button>
                      </div>
                    </div>
                  </ScheduleField>
                </div>
              </div>

              <div
                ref={(node) => {
                  sectionRefs.current.shipping = node;
                }}
                className="rounded-[10px] border border-black/8 bg-white p-7"
              >
                <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#101522]">Parametres de livraison</h2>
                <p className="mt-2 text-[14px] leading-6 text-[#66768c]">
                  Ajuste les parametres par defaut pour les frais de port, la remise en main propre et le traitement du live.
                </p>

                <div className="mt-6 space-y-5">
                  <div className="flex items-start justify-between gap-8 rounded-[10px] border border-black/8 px-5 py-4">
                    <div>
                      <p className="text-[16px] font-semibold text-[#101522]">Retrait gratuit</p>
                      <p className="mt-1 text-[14px] text-[#66768c]">Propose la remise en main propre pour les acheteurs proches.</p>
                    </div>
                    <Toggle checked={freePickup} onChange={setFreePickup} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <ScheduleField label="Delai d&apos;expedition">
                      <input
                        value={shippingDefault}
                        onChange={(event) => setShippingDefault(event.target.value)}
                        className="h-14 w-full rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none focus:border-[#bfd3ff]"
                      />
                    </ScheduleField>
                    <ScheduleField label="Frais de port par defaut">
                      <input
                        value={shippingFees}
                        onChange={(event) => setShippingFees(event.target.value)}
                        className="h-14 w-full rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none focus:border-[#bfd3ff]"
                      />
                    </ScheduleField>
                  </div>
                </div>
              </div>

              <div
                ref={(node) => {
                  sectionRefs.current.options = node;
                }}
                className="rounded-[10px] border border-black/8 bg-white p-7"
              >
                <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#101522]">Afficher les options</h2>
                <div className="mt-6 space-y-5">
                  {[
                    {
                      title: "Desactiver les pre-encheres",
                      body: "Aucun acheteur ne pourra pre-encherir avant l'ouverture du live.",
                      value: disablePreBids,
                      setter: setDisablePreBids,
                    },
                    {
                      title: "Liste d'attente activee",
                      body: "Permet aux acheteurs d'etre prevenus si des lots reviennent en stock.",
                      value: waitlistEnabled,
                      setter: setWaitlistEnabled,
                    },
                    {
                      title: "Replay disponible",
                      body: "Garde le replay visible apres le live pour continuer la conversion.",
                      value: replayEnabled,
                      setter: setReplayEnabled,
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start justify-between gap-8 rounded-[10px] border border-black/8 px-5 py-4">
                      <div>
                        <p className="text-[16px] font-semibold text-[#101522]">{item.title}</p>
                        <p className="mt-1 text-[14px] text-[#66768c]">{item.body}</p>
                      </div>
                      <Toggle checked={item.value} onChange={item.setter} />
                    </div>
                  ))}
                </div>
              </div>

              <div
                ref={(node) => {
                  sectionRefs.current.content = node;
                }}
                className="rounded-[10px] border border-black/8 bg-white p-7"
              >
                <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#101522]">Parametres de contenu</h2>
                <div className="mt-6 grid grid-cols-[1fr_auto] gap-6">
                  <div className="space-y-5">
                    <ScheduleField label="Langue principale">
                      <div className="relative">
                        <select
                          value={language}
                          onChange={(event) => setLanguage(event.target.value)}
                          className="h-14 w-full appearance-none rounded-[10px] border border-black/10 px-4 text-[15px] text-[#101522] outline-none focus:border-[#bfd3ff]"
                        >
                          {languages.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f8da1]" />
                      </div>
                    </ScheduleField>
                    <ScheduleField label="Mots desactives">
                      <textarea
                        value={mutedWords}
                        onChange={(event) => setMutedWords(event.target.value)}
                        placeholder="Separer par des virgules, utilise des guillemets pour les phrases."
                        className="h-28 w-full resize-none rounded-[10px] border border-black/10 px-4 py-3 text-[14px] leading-6 text-[#101522] outline-none placeholder:text-[#9aa7b7] focus:border-[#bfd3ff]"
                      />
                    </ScheduleField>
                  </div>
                  <div className="rounded-[10px] border border-black/8 px-5 py-4">
                    <p className="text-[16px] font-semibold text-[#101522]">Langage explicite</p>
                    <p className="mt-1 max-w-[220px] text-[14px] leading-6 text-[#66768c]">Active le marquage contenu adulte si le vocabulaire du live peut le justifier.</p>
                    <div className="mt-5">
                      <Toggle checked={explicitLanguage} onChange={setExplicitLanguage} />
                    </div>
                  </div>
                </div>
              </div>

              <div
                ref={(node) => {
                  sectionRefs.current.discovery = node;
                }}
                className="rounded-[10px] border border-black/8 bg-white p-7"
              >
                <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[#101522]">Afficher la decouverte</h2>
                <p className="mt-2 text-[14px] leading-6 text-[#66768c]">Choisis si ton live est visible de tous, reserve aux abonnes ou prive.</p>
                <div className="mt-6 space-y-3">
                  {[
                    { id: "public", label: "Public", helper: "Visible par tous et eligible a la grille principale." },
                    { id: "followers", label: "Abonnes", helper: "Visible seulement aux personnes qui suivent ton profil." },
                    { id: "private", label: "Prive", helper: "Visible via un lien partage uniquement." },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDiscoveryMode(option.id as typeof discoveryMode)}
                      className={`flex w-full items-start gap-3 rounded-[10px] border px-4 py-4 text-left transition ${
                        discoveryMode === option.id
                          ? "border-[#bfd3ff] bg-[#eef4ff]"
                          : "border-black/8 bg-white hover:border-[#d6e2f8]"
                      }`}
                    >
                      <span
                        className={`mt-1 flex h-4 w-4 items-center justify-center rounded-full border ${
                          discoveryMode === option.id ? "border-[#2b6fff]" : "border-[#c8d2df]"
                        }`}
                      >
                        <span
                          className={`block h-2 w-2 rounded-full ${
                            discoveryMode === option.id ? "bg-[#2b6fff]" : "bg-transparent"
                          }`}
                        />
                      </span>
                      <span>
                        <span className="block text-[15px] font-semibold text-[#101522]">{option.label}</span>
                        <span className="mt-1 block text-[14px] text-[#66768c]">{option.helper}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-[130] border-t border-black/8 bg-[rgba(255,255,255,0.96)] backdrop-blur-[12px]">
        <div className="mx-auto flex w-[1440px] items-center justify-end gap-3 px-8 py-4">
          <button
            type="button"
            onClick={() => router.push("/live-shopping")}
            className="inline-flex h-12 items-center justify-center rounded-[10px] px-5 text-[14px] font-medium text-[#101522]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex h-12 items-center justify-center rounded-[10px] bg-[#2b6fff] px-5 text-[14px] font-semibold text-white shadow-[0_14px_30px_rgba(43,111,255,0.16)] transition hover:bg-[#1f63f5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Publication..."
              : editingScheduledLiveId
                ? "Mettre a jour le live"
                : "Programmer un live"}
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
