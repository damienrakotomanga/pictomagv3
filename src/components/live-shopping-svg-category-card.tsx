import { LIVE_SHOPPING_CATEGORY_CARD_MASK_PATH } from "@/lib/live-shopping-category-card-art";

export function LiveShoppingSvgCategoryCard({
  categoryId,
  label,
  imageSrc,
  offsetX = 0,
  offsetY = 0,
  zoom = 1,
  animate = true,
}: {
  categoryId: string;
  label: string;
  imageSrc: string;
  offsetX?: number;
  offsetY?: number;
  zoom?: number;
  animate?: boolean;
}) {
  const clipPathId = `live-shopping-card-mask-${categoryId}`;
  const normalizedZoom = Number.isFinite(zoom) ? Math.max(0.84, Math.min(1.4, zoom)) : 1;
  const imageWidth = 343 * normalizedZoom;
  const imageHeight = 259 * normalizedZoom;
  const imageX = -10 - (imageWidth - 343) / 2 + offsetX;
  const imageY = -8 - (imageHeight - 259) / 2 + offsetY;

  return (
    <div className="relative overflow-hidden rounded-[22px] transition duration-300 group-hover:-translate-y-0.5">
      <div className="relative px-3 pb-[48px] pt-3">
        <div className="relative aspect-[323/243] w-full overflow-visible">
          <svg
            viewBox="0 0 323 243.24"
            aria-label={label}
            role="img"
            className="absolute inset-0 block h-full w-full overflow-visible"
          >
            <defs>
              <clipPath id={clipPathId}>
                <path d={LIVE_SHOPPING_CATEGORY_CARD_MASK_PATH} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipPathId})`}>
              <image
                href={imageSrc}
                x={imageX}
                y={imageY}
                width={imageWidth}
                height={imageHeight}
                preserveAspectRatio="xMidYMid slice"
              >
                {animate ? (
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0 0; -4 3; 0 0"
                    dur="8.2s"
                    repeatCount="indefinite"
                  />
                ) : null}
              </image>
            </g>
          </svg>

          <div className="pointer-events-none absolute inset-x-0 bottom-[-16px] flex justify-center">
            <div className="w-[78%] text-center">
          <p className="text-[17px] font-bold uppercase italic leading-[0.96] tracking-[-0.028em] text-[#101522]">
                {label}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
