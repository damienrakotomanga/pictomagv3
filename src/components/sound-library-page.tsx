"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Ellipsis, Pause, Play, Share2 } from "lucide-react";
import { getSoundCollectionBySlug } from "@/lib/sound-library";

function formatSeconds(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function parseCompactViews(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");

  if (normalized.endsWith("m")) {
    return Number.parseFloat(normalized.slice(0, -1)) * 1_000_000;
  }

  if (normalized.endsWith("k")) {
    return Number.parseFloat(normalized.slice(0, -1)) * 1_000;
  }

  return Number.parseFloat(normalized) || 0;
}

function formatFullViews(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function SoundLibraryPage({ soundId }: { soundId: string }) {
  const collection = getSoundCollectionBySlug(soundId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const syncState = () => {
      setCurrentTime(audio.currentTime);
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setPlaying(!audio.paused);
    };

    syncState();
    audio.addEventListener("loadedmetadata", syncState);
    audio.addEventListener("timeupdate", syncState);
    audio.addEventListener("play", syncState);
    audio.addEventListener("pause", syncState);
    audio.addEventListener("ended", syncState);

    return () => {
      audio.removeEventListener("loadedmetadata", syncState);
      audio.removeEventListener("timeupdate", syncState);
      audio.removeEventListener("play", syncState);
      audio.removeEventListener("pause", syncState);
      audio.removeEventListener("ended", syncState);
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!collection) {
    return null;
  }

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const previewDurationLabel = duration > 0 ? formatSeconds(duration) : "0:15";
  const totalViewsLabel = formatFullViews(
    collection.clips.reduce((sum, clip) => sum + parseCompactViews(clip.views), 0),
  );

  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      await audio.play();
      return;
    }

    audio.pause();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(35,37,44,0.96)_0%,rgba(10,10,12,1)_42%,rgba(3,3,4,1)_100%)] text-[#f5f5f7]">
      <audio ref={audioRef} src={collection.previewSrc} preload="metadata" />

      <div className="mx-auto flex min-h-screen w-full max-w-[1380px] flex-col px-6 pb-20 pt-8 lg:px-8">
        <header className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#f5f5f7] shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-[1px]"
          >
            <ChevronLeft size={20} strokeWidth={2.2} />
          </Link>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Pictomag Audio</p>
            <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-[#f5f5f7]">Bibliotheque sonore</h1>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,20,24,0.96)_0%,rgba(10,10,12,0.98)_100%)] shadow-[0_32px_90px_rgba(0,0,0,0.4)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.35)_24%,rgba(255,255,255,0.35)_76%,rgba(255,255,255,0)_100%)]" />
            <div className="absolute right-[-10%] top-[-18%] h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(96,103,129,0.2)_0%,rgba(96,103,129,0)_72%)]" />
            <div className="absolute bottom-[-18%] left-[10%] h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(58,63,78,0.34)_0%,rgba(58,63,78,0)_72%)]" />
          </div>

          <div className="relative grid gap-10 px-6 py-6 lg:grid-cols-[minmax(0,1.08fr)_390px] lg:px-8 lg:py-8">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-[9px] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48 backdrop-blur-xl">
                Son d&apos;origine
              </div>

              <div className="mt-7">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white/42">Audio</p>
                  <h2 className="mt-3 max-w-[760px] text-[40px] font-semibold leading-[0.92] tracking-[-0.06em] text-[#f5f5f7] lg:text-[64px]">
                    {collection.title}
                  </h2>

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-white/55">
                    <span className="font-semibold text-[#f5f5f7]">{collection.creatorName}</span>
                    <span className="h-1 w-1 rounded-full bg-white/24" />
                    <span>{collection.creatorHandle}</span>
                    <span className="h-1 w-1 rounded-full bg-white/24" />
                    <span>{collection.reelsCount} videos</span>
                  </div>
                </div>
              </div>

              <p className="mt-7 max-w-[680px] text-[17px] leading-[1.72] text-white/52">
                Une bibliotheque audio sombre, dense et plus cinematographique, concue pour ecouter, sauvegarder et
                explorer chaque son sans bruit visuel inutile.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSaved((current) => !current)}
                  className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-[14px] font-semibold transition ${
                    saved
                      ? "border border-white/10 bg-white/10 text-[#f5f5f7]"
                      : "bg-[#f5f5f7] text-[#0a0a0c] shadow-[0_18px_36px_rgba(255,255,255,0.09)]"
                  }`}
                >
                  {saved ? "Son enregistre" : "Enregistrer le son"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (typeof window === "undefined") {
                      return;
                    }

                    try {
                      await navigator.clipboard.writeText(window.location.href);
                      setToast("Lien audio copie.");
                    } catch {
                      setToast("Impossible de copier le lien.");
                    }
                  }}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#f5f5f7] transition hover:-translate-y-[1px]"
                >
                  <Share2 size={18} strokeWidth={2.1} />
                </button>
                <button
                  type="button"
                  onClick={() => setToast("Options audio: signaler, partager, ajouter a playlist.")}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#f5f5f7] transition hover:-translate-y-[1px]"
                >
                  <Ellipsis size={18} strokeWidth={2.1} />
                </button>
              </div>

              <div className="mt-8 grid max-w-[720px] gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/36">Clips</p>
                  <p className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-[#f5f5f7]">{collection.reelsCount}</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/36">Preview</p>
                  <p className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-[#f5f5f7]">{previewDurationLabel}</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/36">Ecoutes</p>
                  <p className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-[#f5f5f7]">{totalViewsLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-end">
              <div className="w-full max-w-[390px] rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,32,38,0.96)_0%,rgba(14,15,18,0.98)_100%)] p-6 shadow-[0_22px_50px_rgba(0,0,0,0.34)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/38">Preview</p>
                    <p className="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-[#f5f5f7]">Lecture du son</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-semibold text-white/54">
                    {collection.creatorHandle}
                  </span>
                </div>

                <div className="relative mx-auto mt-8 flex h-[250px] w-[250px] items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(116,120,137,0.18)_0%,rgba(116,120,137,0)_70%)]" />
                  <div className="absolute inset-[8px] rounded-full border border-white/10 bg-[linear-gradient(180deg,#1f2127_0%,#0b0c10_100%)] shadow-[0_26px_50px_rgba(0,0,0,0.4)]" />
                  <div className={`absolute inset-[22px] ${playing ? "animate-[spin_4.8s_linear_infinite]" : ""}`}>
                    <div className="absolute inset-0 rounded-full border border-white/10 bg-[linear-gradient(180deg,#2f323b_0%,#0e1015_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_24px_rgba(0,0,0,0.38)]" />
                    <div className="absolute left-1/2 top-[18px] h-9 w-[2px] -translate-x-1/2 rounded-full bg-white/65 blur-[0.4px]" />
                    <div className="absolute inset-[14px] rounded-full border border-white/6" />
                    <div className="absolute inset-[22px] overflow-hidden rounded-full border border-white/10 shadow-[0_20px_36px_rgba(0,0,0,0.32)]">
                      <Image src={collection.artwork} alt={collection.title} fill sizes="170px" className="object-cover" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0)_42%,rgba(0,0,0,0.28)_100%)]" />
                    </div>
                  </div>
                  <div className="absolute inset-[106px] rounded-full border border-white/10 bg-[#08090c] shadow-[0_10px_20px_rgba(0,0,0,0.4)]" />
                </div>

                <div className="mt-8 rounded-[18px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => void togglePlayback()}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f5f7] text-[#09090b] shadow-[0_16px_30px_rgba(255,255,255,0.08)]"
                    >
                      {playing ? <Pause size={18} strokeWidth={2.3} /> : <Play size={18} strokeWidth={2.3} />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="h-[6px] overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#ffffff_0%,#8f98ab_100%)] transition-[width]"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[12px] font-semibold text-white/40">
                        <span>{formatSeconds(currentTime)}</span>
                        <span>{previewDurationLabel}</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-[13px] leading-[1.6] text-white/48">
                    Quand l&apos;extrait demarre, le disque passe en lecture et tourne comme un vrai support musical.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,17,20,0.98)_0%,rgba(9,10,12,1)_100%)] px-6 py-6 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/36">Selection</p>
              <h3 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#f5f5f7]">Videos utilisant ce son</h3>
              <p className="mt-2 max-w-[620px] text-[15px] leading-[1.65] text-white/48">
                Une galerie sombre, plus cinematographique, avec des cartes plus nettes et un contraste plus premium.
              </p>
            </div>

            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white/50">
              {collection.clips.length} clips visibles
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {collection.clips.map((clip) => (
              <article
                key={clip.id}
                className="group overflow-hidden rounded-[18px] border border-white/10 bg-[#111215] shadow-[0_14px_30px_rgba(0,0,0,0.3)] transition duration-300 hover:-translate-y-[2px] hover:shadow-[0_22px_42px_rgba(0,0,0,0.38)]"
              >
                <div className="relative aspect-[9/16] overflow-hidden bg-[#121317]">
                  <video
                    src={clip.src}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                  <div className="absolute inset-x-0 top-0 h-[18%] bg-[linear-gradient(180deg,rgba(3,4,8,0.28)_0%,rgba(3,4,8,0)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(180deg,rgba(3,4,8,0)_0%,rgba(3,4,8,0.68)_100%)]" />
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/5">
                        <Image src={clip.avatar} alt={clip.author} fill sizes="36px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-[#f5f5f7]">@{clip.author}</p>
                        <p className="text-[12px] font-medium text-white/42">{clip.views} vues</p>
                      </div>
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/46">
                      Clip
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-2 text-[15px] font-semibold leading-[1.35] text-[#f5f5f7]">{clip.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {toast ? (
          <div className="fixed bottom-6 right-6 z-[220] rounded-[10px] border border-white/15 bg-[#111217] px-4 py-3 text-[14px] font-medium text-[#f5f5f7] shadow-[0_18px_42px_rgba(0,0,0,0.35)]">
            {toast}
          </div>
        ) : null}
      </div>
    </main>
  );
}
