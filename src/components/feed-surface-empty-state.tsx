"use client";

export function FeedClassicEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="absolute left-1/2 top-[265px] w-[760px] -translate-x-1/2">
      <div className="mx-auto max-w-[468px] rounded-[28px] bg-white px-8 py-10 ring-1 ring-black/[0.05]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea2bc]">Feed classique</p>
        <h2 className="mt-4 max-w-[520px] text-[40px] font-medium leading-[0.98] tracking-[-0.05em] text-[#101522]">
          Aucun post n&apos;est visible pour le moment.
        </h2>
        <p className="mt-4 max-w-[560px] text-[16px] leading-8 text-[#637488]">
          Cree ton premier post pour remplir ce flux. Les publications reelles apparaitront ici des qu&apos;elles sont disponibles.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onCreate}
            className="rounded-full bg-[#101522] px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-[#1b2433]"
          >
            Creer un post
          </button>
        </div>
      </div>
    </section>
  );
}

export function FeedPhotoEmptyState() {
  return (
    <div className="col-span-4 flex min-h-[260px] items-center justify-center rounded-[28px] border border-[#e7edf6] bg-[#fbfdff] px-10 text-center">
      <div className="max-w-[460px]">
        <p className="text-[22px] font-semibold tracking-[-0.03em] text-[#101522]">Vos photos apparaitront ici.</p>
        <p className="mt-3 text-[15px] leading-7 text-[#667085]">
          Publiez un post photo ou une galerie depuis la composition pour construire une vraie grille visuelle.
        </p>
      </div>
    </div>
  );
}
