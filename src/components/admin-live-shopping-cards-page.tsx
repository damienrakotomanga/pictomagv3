"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ImagePlus, RefreshCw, RotateCcw, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { liveShoppingCategories } from "@/lib/live-shopping-data";
import { getLiveShoppingCategoryCardDefaultArtSettings } from "@/lib/live-shopping-category-card-art";
import { LiveShoppingSvgCategoryCard } from "@/components/live-shopping-svg-category-card";

type AdminLiveShoppingCardItem = {
  categoryId: string;
  label: string;
  defaultImageSrc: string;
  imageSrc: string;
  overrideImageSrc: string | null;
  offsetX: number;
  offsetY: number;
  zoom: number;
  updatedAt: number | null;
  updatedByUserId: string | null;
};

type LiveShoppingCardsPayload = {
  items?: AdminLiveShoppingCardItem[];
  message?: string;
};

const fallbackItems: AdminLiveShoppingCardItem[] = liveShoppingCategories.map((category) => ({
  categoryId: category.id,
  label: category.label,
  defaultImageSrc: getLiveShoppingCategoryCardDefaultArtSettings(category.id).imageSrc,
  imageSrc: getLiveShoppingCategoryCardDefaultArtSettings(category.id).imageSrc,
  overrideImageSrc: null,
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  updatedAt: null,
  updatedByUserId: null,
}));

type CardDraftSettings = {
  offsetX: number;
  offsetY: number;
  zoom: number;
};

function formatUpdatedAt(value: number | null) {
  if (!value) {
    return "Source par defaut";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export function AdminLiveShoppingCardsPage() {
  const [items, setItems] = useState<AdminLiveShoppingCardItem[]>(fallbackItems);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [previewUrlById, setPreviewUrlById] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [statusById, setStatusById] = useState<Record<string, string>>({});
  const [draftById, setDraftById] = useState<Record<string, CardDraftSettings>>({});
  const [elevatingRole, setElevatingRole] = useState(false);

  const sortedItems = useMemo(
    () => [...items].sort((left, right) => left.label.localeCompare(right.label, "fr")),
    [items],
  );

  const loadItems = async (options?: { quiet?: boolean }) => {
    const quiet = options?.quiet ?? false;
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch("/api/admin/live-shopping-cards", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const payload = (await response.json()) as LiveShoppingCardsPayload;

      if (response.status === 401 || response.status === 403) {
        setAccessDenied(true);
        setErrorMessage(payload.message ?? "Acces refuse au studio live.");
        return;
      }

      if (!response.ok) {
        setErrorMessage(payload.message ?? "Impossible de charger les cartes live.");
        return;
      }

      setAccessDenied(false);
      setErrorMessage(null);
      const nextItems = Array.isArray(payload.items) ? payload.items : fallbackItems;
      setItems(nextItems);
      setDraftById(
        Object.fromEntries(
          nextItems.map((item) => [
            item.categoryId,
            {
              offsetX: item.offsetX,
              offsetY: item.offsetY,
              zoom: item.zoom,
            },
          ]),
        ),
      );
    } catch {
      setErrorMessage("Erreur reseau pendant le chargement du studio live.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(previewUrlById).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [previewUrlById]);

  const enableAdminRole = async () => {
    setElevatingRole(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "admin" }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setErrorMessage(payload?.message ?? "Impossible d activer le mode admin demo.");
        return;
      }

      setAccessDenied(false);
      await loadItems();
    } catch {
      setErrorMessage("Erreur reseau pendant l activation admin.");
    } finally {
      setElevatingRole(false);
    }
  };

  const handleUpload = async (categoryId: string) => {
    const file = selectedFiles[categoryId];
    const draft = draftById[categoryId];
    if (!file && !draft) {
      setStatusById((current) => ({
        ...current,
        [categoryId]: "Aucun changement a enregistrer.",
      }));
      return;
    }

    if (!file) {
      setStatusById((current) => ({
        ...current,
        [categoryId]: "Enregistrement du cadrage...",
      }));
    }

    setSavingIds((current) => ({ ...current, [categoryId]: true }));
    setStatusById((current) => ({
      ...current,
      [categoryId]: file ? "Upload en cours..." : "Enregistrement en cours...",
    }));

    try {
      const formData = new FormData();
      formData.set("categoryId", categoryId);
      if (file) {
        formData.set("file", file);
      }
      formData.set("offsetX", String(draft?.offsetX ?? 0));
      formData.set("offsetY", String(draft?.offsetY ?? 0));
      formData.set("zoom", String(draft?.zoom ?? 1));

      const response = await fetch("/api/admin/live-shopping-cards", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      const payload = (await response.json()) as {
        item?: AdminLiveShoppingCardItem;
        message?: string;
      };

      if (!response.ok || !payload.item) {
        setStatusById((current) => ({
          ...current,
          [categoryId]: payload.message ?? "Upload impossible.",
        }));
        return;
      }

      const nextItem = payload.item;

      setItems((current) =>
        current.map((item) => (item.categoryId === categoryId ? nextItem : item)),
      );
      setDraftById((current) => ({
        ...current,
        [categoryId]: {
          offsetX: nextItem.offsetX,
          offsetY: nextItem.offsetY,
          zoom: nextItem.zoom,
        },
      }));
      setSelectedFiles((current) => ({ ...current, [categoryId]: null }));
      setPreviewUrlById((current) => {
        const next = { ...current };
        if (next[categoryId]) {
          URL.revokeObjectURL(next[categoryId]);
          delete next[categoryId];
        }
        return next;
      });
      setStatusById((current) => ({
        ...current,
        [categoryId]: "Image mise a jour.",
      }));
    } catch {
      setStatusById((current) => ({
        ...current,
        [categoryId]: "Erreur reseau pendant l upload.",
      }));
    } finally {
      setSavingIds((current) => ({ ...current, [categoryId]: false }));
    }
  };

  const handleReset = async (categoryId: string) => {
    setSavingIds((current) => ({ ...current, [categoryId]: true }));
    setStatusById((current) => ({ ...current, [categoryId]: "Retour a l image par defaut..." }));

    try {
      const response = await fetch("/api/admin/live-shopping-cards", {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ categoryId }),
      });

      const payload = (await response.json()) as {
        item?: AdminLiveShoppingCardItem;
        message?: string;
      };

      if (!response.ok || !payload.item) {
        setStatusById((current) => ({
          ...current,
          [categoryId]: payload.message ?? "Reset impossible.",
        }));
        return;
      }

      const nextItem = payload.item;

      setItems((current) =>
        current.map((item) => (item.categoryId === categoryId ? nextItem : item)),
      );
      setDraftById((current) => ({
        ...current,
        [categoryId]: {
          offsetX: 0,
          offsetY: 0,
          zoom: 1,
        },
      }));
      setSelectedFiles((current) => ({ ...current, [categoryId]: null }));
      setPreviewUrlById((current) => {
        const next = { ...current };
        if (next[categoryId]) {
          URL.revokeObjectURL(next[categoryId]);
          delete next[categoryId];
        }
        return next;
      });
      setStatusById((current) => ({
        ...current,
        [categoryId]: "Image par defaut restauree.",
      }));
    } catch {
      setStatusById((current) => ({
        ...current,
        [categoryId]: "Erreur reseau pendant le reset.",
      }));
    } finally {
      setSavingIds((current) => ({ ...current, [categoryId]: false }));
    }
  };

  return (
    <section className="w-full px-8 pb-16 pt-[108px]">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8aa0bd]">
            Pictomag admin
          </p>
          <h1 className="mt-2 text-[42px] font-medium tracking-[-0.045em] text-[#101522]">
            Live cards studio
          </h1>
          <p className="mt-2 max-w-[860px] text-[15px] leading-7 text-[#66768c]">
            Remplace l image affichee derriere chaque carte SVG de la grille live shopping. Le
            design reste identique, seule la source image change.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/audit"
            className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-[#d8e2f1] px-4 text-[14px] font-medium tracking-[-0.01em] text-[#101522] transition hover:bg-[#f7fbff]"
          >
            Audit admin
          </Link>
          <button
            type="button"
            onClick={() => void loadItems({ quiet: true })}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-[#d8e2f1] px-4 text-[14px] font-medium tracking-[-0.01em] text-[#101522] transition hover:bg-[#f7fbff]"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Rafraichir
          </button>
        </div>
      </div>

      {accessDenied ? (
        <div className="mt-8 rounded-[16px] border border-[#f0d6d6] bg-[#fff7f7] p-6">
          <div className="flex items-start gap-4">
            <ShieldAlert className="mt-1 h-5 w-5 text-[#c05566]" />
            <div>
              <h2 className="text-[24px] font-medium tracking-[-0.03em] text-[#101522]">
                Acces restreint
              </h2>
              <p className="mt-2 text-[15px] leading-7 text-[#66768c]">
                {errorMessage ?? "Le studio live est reserve aux administrateurs."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void enableAdminRole()}
                  className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#101522] px-4 text-[14px] font-medium tracking-[-0.01em] text-white transition hover:opacity-95"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {elevatingRole ? "Activation..." : "Activer mode admin demo"}
                </button>
                <Link
                  href="/debug/auth"
                  className="inline-flex h-11 items-center rounded-[10px] border border-[#d8e2f1] px-4 text-[14px] font-medium tracking-[-0.01em] text-[#101522] transition hover:bg-[#f7fbff]"
                >
                  Ouvrir auth
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {errorMessage ? (
            <div className="mt-8 rounded-[14px] border border-[#f0d6d6] bg-[#fff7f7] px-5 py-4 text-[14px] text-[#b34354]">
              {errorMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-8 rounded-[16px] border border-[#edf1f7] bg-white px-5 py-8 text-[14px] text-[#66768c]">
              Chargement du studio live...
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(420px,1fr))] gap-6">
              {sortedItems.map((item) => {
                const pendingFile = selectedFiles[item.categoryId];
                const saving = savingIds[item.categoryId] === true;
                const defaultArt = getLiveShoppingCategoryCardDefaultArtSettings(item.categoryId);
                const draft = draftById[item.categoryId] ?? {
                  offsetX: item.offsetX,
                  offsetY: item.offsetY,
                  zoom: item.zoom,
                };
                const draftImageSrc = previewUrlById[item.categoryId] ?? item.imageSrc;

                return (
                  <article
                    key={item.categoryId}
                    className="rounded-[18px] border border-[#edf1f7] bg-white p-5 shadow-[0_18px_40px_rgba(16,21,34,0.04)]"
                  >
                    <div className="grid grid-cols-[248px_minmax(0,1fr)] gap-5">
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8aa0bd]">
                            Avant
                          </p>
                          <div className="group">
                            <LiveShoppingSvgCategoryCard
                              categoryId={`${item.categoryId}-before`}
                              label={item.label}
                              imageSrc={defaultArt.imageSrc}
                              offsetX={defaultArt.offsetX}
                              offsetY={defaultArt.offsetY}
                              zoom={defaultArt.zoom}
                              animate={false}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8aa0bd]">
                            Apres
                          </p>
                          <div className="group">
                            <LiveShoppingSvgCategoryCard
                              categoryId={`${item.categoryId}-after`}
                              label={item.label}
                              imageSrc={draftImageSrc}
                              offsetX={draft.offsetX}
                              offsetY={draft.offsetY}
                              zoom={draft.zoom}
                              animate={false}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8aa0bd]">
                              {item.categoryId}
                            </p>
                            <h2 className="mt-2 text-[24px] font-medium tracking-[-0.03em] text-[#101522]">
                              {item.label}
                            </h2>
                          </div>
                          <ImagePlus className="h-5 w-5 text-[#90a0b5]" />
                        </div>

                        <dl className="mt-5 space-y-3 text-[13px] leading-6 text-[#66768c]">
                          <div>
                            <dt className="font-semibold text-[#101522]">Source active</dt>
                            <dd className="break-all">{item.imageSrc}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-[#101522]">Statut</dt>
                            <dd>
                              {item.overrideImageSrc ? "Image personnalisee" : "Image par defaut"} ·{" "}
                              {formatUpdatedAt(item.updatedAt)}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <label
                            htmlFor={`card-upload-${item.categoryId}`}
                            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-[#d8e2f1] px-4 text-[14px] font-medium tracking-[-0.01em] text-[#101522] transition hover:bg-[#f7fbff]"
                          >
                            <Upload className="h-4 w-4" />
                            Choisir une image
                          </label>
                          <input
                            id={`card-upload-${item.categoryId}`}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/avif"
                            className="hidden"
                            onChange={(event) => {
                              const nextFile = event.target.files?.[0] ?? null;
                              setSelectedFiles((current) => ({
                                ...current,
                                [item.categoryId]: nextFile,
                              }));
                              setPreviewUrlById((current) => {
                                const next = { ...current };
                                if (next[item.categoryId]) {
                                  URL.revokeObjectURL(next[item.categoryId]);
                                  delete next[item.categoryId];
                                }
                                if (nextFile) {
                                  next[item.categoryId] = URL.createObjectURL(nextFile);
                                }
                                return next;
                              });
                            }}
                          />

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleUpload(item.categoryId)}
                            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#101522] px-4 text-[14px] font-medium tracking-[-0.01em] text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Upload className="h-4 w-4" />
                            Enregistrer
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleReset(item.categoryId)}
                            className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-[#d8e2f1] px-4 text-[14px] font-semibold text-[#101522] transition hover:bg-[#f7fbff] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Defaut
                          </button>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 rounded-[14px] border border-[#edf1f7] bg-[#fafbfd] p-4">
                          <label className="block">
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="font-semibold text-[#101522]">Position X</span>
                              <span className="text-[#66768c]">{draft.offsetX}px</span>
                            </div>
                            <input
                              type="range"
                              min="-70"
                              max="70"
                              step="1"
                              value={draft.offsetX}
                              onChange={(event) =>
                                setDraftById((current) => ({
                                  ...current,
                                  [item.categoryId]: {
                                    offsetX: Number.parseInt(event.target.value, 10),
                                    offsetY: draft.offsetY,
                                    zoom: draft.zoom,
                                  },
                                }))
                              }
                              className="mt-2 w-full"
                            />
                          </label>

                          <label className="block">
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="font-semibold text-[#101522]">Position Y</span>
                              <span className="text-[#66768c]">{draft.offsetY}px</span>
                            </div>
                            <input
                              type="range"
                              min="-70"
                              max="70"
                              step="1"
                              value={draft.offsetY}
                              onChange={(event) =>
                                setDraftById((current) => ({
                                  ...current,
                                  [item.categoryId]: {
                                    offsetX: draft.offsetX,
                                    offsetY: Number.parseInt(event.target.value, 10),
                                    zoom: draft.zoom,
                                  },
                                }))
                              }
                              className="mt-2 w-full"
                            />
                          </label>

                          <label className="block">
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="font-semibold text-[#101522]">Zoom</span>
                              <span className="text-[#66768c]">{draft.zoom.toFixed(2)}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.84"
                              max="1.4"
                              step="0.01"
                              value={draft.zoom}
                              onChange={(event) =>
                                setDraftById((current) => ({
                                  ...current,
                                  [item.categoryId]: {
                                    offsetX: draft.offsetX,
                                    offsetY: draft.offsetY,
                                    zoom: Number.parseFloat(event.target.value),
                                  },
                                }))
                              }
                              className="mt-2 w-full"
                            />
                          </label>
                        </div>

                        <div className="mt-3 min-h-[20px] text-[13px] text-[#66768c]">
                          {pendingFile ? `Fichier pret: ${pendingFile.name}` : statusById[item.categoryId] ?? ""}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
