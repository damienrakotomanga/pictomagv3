"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AnimationItem } from "lottie-web";
import homeAnimationData from "../../public/news-menu/animations/watch-animation-new.json";
import searchAnimationData from "../../public/news-menu/animations/search-animation-new.json";
import watchAnimationData from "../../public/news-menu/animations/home-animation-new.json";
import shopAnimationData from "../../public/news-menu/animations/shop-animation-new.json";

export type HeaderNavItemId = "home" | "search" | "watch" | "shop";

type NavItem = {
  id: HeaderNavItemId;
  label: string;
  staticSrc: string;
  animationData: Record<string, unknown>;
  iconSize: number;
  slotWidth: number;
};

const navItems: NavItem[] = [
  {
    id: "home",
    label: "Home",
    staticSrc: "/news-menu/home-icon.svg",
    animationData: homeAnimationData,
    iconSize: 38,
    slotWidth: 38,
  },
  {
    id: "search",
    label: "Search",
    staticSrc: "/news-menu/search-icon.svg",
    animationData: searchAnimationData,
    iconSize: 24,
    slotWidth: 24,
  },
  {
    id: "watch",
    label: "Watch",
    staticSrc: "/news-menu/box-icon.svg",
    animationData: watchAnimationData,
    iconSize: 24,
    slotWidth: 24,
  },
  {
    id: "shop",
    label: "Shop",
    staticSrc: "/news-menu/bag-icon.svg",
    animationData: shopAnimationData,
    iconSize: 24,
    slotWidth: 24,
  },
];

export function AnimatedHeaderNav({
  activeItemId = null,
  onItemClick,
}: {
  activeItemId?: HeaderNavItemId | null;
  onItemClick?: (id: HeaderNavItemId) => void;
}) {
  const lottieRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const animationsRef = useRef<Array<AnimationItem | null>>([]);
  const [loaded, setLoaded] = useState<boolean[]>(() => navItems.map(() => false));

  useEffect(() => {
    let active = true;
    const animations: Array<AnimationItem | null> = [];

    const loadAnimations = async () => {
      const { default: lottie } = await import("lottie-web");

      if (!active) {
        return;
      }

      navItems.forEach((item, index) => {
        const container = lottieRefs.current[index];

        if (!container) {
          animations[index] = null;
          return;
        }

        const animation = lottie.loadAnimation({
          container,
          renderer: "svg",
          loop: false,
          autoplay: false,
          animationData: item.animationData,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
            progressiveLoad: true,
          },
        });

        const handleDomLoaded = () => {
          const svg = container.querySelector("svg");

          if (svg) {
            svg.setAttribute("width", "100%");
            svg.setAttribute("height", "100%");
            svg.style.width = "100%";
            svg.style.height = "100%";
            svg.style.display = "block";
          }

          animation.goToAndStop(0, true);

          setLoaded((current) => {
            if (current[index]) {
              return current;
            }

            const next = [...current];
            next[index] = true;
            return next;
          });
        };

        animation.addEventListener("DOMLoaded", handleDomLoaded);
        animations[index] = animation;
      });

      animationsRef.current = animations;
    };

    void loadAnimations();

    return () => {
      active = false;
      animations.forEach((animation) => animation?.destroy());
    };
  }, []);

  const handleMouseEnter = (index: number) => {
    const animation = animationsRef.current[index];

    if (!animation) {
      return;
    }

    animation.goToAndPlay(0, true);
  };

  const handleMouseLeave = (index: number) => {
    const animation = animationsRef.current[index];

    if (!animation) {
      return;
    }

    animation.goToAndStop(0, true);
  };

  return (
    <nav className="absolute left-1/2 top-0 flex h-16 w-[194px] -translate-x-1/2 items-start">
      {navItems.map((item, index) => {
        return (
          <button
            key={item.id}
            aria-label={item.label}
            type="button"
            className={`group relative flex h-16 items-center justify-center ${
              index === 0 ? "w-[38px]" : "w-6"
            } ${index !== navItems.length - 1 ? "mr-7" : ""}`}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={() => handleMouseLeave(index)}
            onClick={() => onItemClick?.(item.id)}
          >
            <span
              className={`absolute left-1/2 top-0 h-[3px] w-[45px] -translate-x-1/2 bg-[linear-gradient(90deg,#1984FF_0%,#1CB1FE_100.01%)] shadow-[0_4px_12px_0_#0094FF] transition-opacity ${
                item.id === activeItemId ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            />

            <span
              className="relative block"
              style={{ width: `${item.iconSize}px`, height: `${item.iconSize}px` }}
            >
              {!loaded[index] ? (
                <Image
                  src={item.staticSrc}
                  alt=""
                  width={item.iconSize}
                  height={item.iconSize}
                  unoptimized
                  className="block"
                  style={{ width: `${item.iconSize}px`, height: `${item.iconSize}px` }}
                />
              ) : null}

              <span
                ref={(element) => {
                  lottieRefs.current[index] = element;
                }}
                className={`menu-lottie pointer-events-none absolute inset-0 block ${
                  loaded[index] ? "opacity-100" : "opacity-0"
                }`}
              />
            </span>
          </button>
        );
      })}
    </nav>
  );
}
