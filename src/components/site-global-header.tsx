"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { AnimatedHeaderNav, type HeaderNavItemId } from "@/components/animated-header-nav";
import { SiteAccountMenu } from "@/components/site-account-menu";

const headerTopActions = [
  { id: "create", src: "/figma-assets/top-plus.svg", label: "Create" },
  { id: "notifications", src: "/figma-assets/top-notification.svg", label: "Notifications" },
  { id: "messages", src: "/figma-assets/top-message.svg", label: "Messages" },
] as const;

type HeaderTopActionId = (typeof headerTopActions)[number]["id"];

export function SiteGlobalHeader() {
  const router = useRouter();

  const handleNavClick = useCallback(
    (itemId: HeaderNavItemId) => {
      if (itemId === "home" || itemId === "search") {
        router.push("/");
        return;
      }

      if (itemId === "watch") {
        router.push("/live-shopping");
        return;
      }

      router.push("/marketplace");
    },
    [router],
  );

  const handleTopActionClick = useCallback(
    (actionId: HeaderTopActionId) => {
      if (actionId === "create") {
        router.push("/compose");
        return;
      }

      if (actionId === "notifications") {
        if (typeof window !== "undefined") {
          window.alert("Centre de notifications: ouverture en cours d integration.");
        }
        return;
      }

      router.push("/messages");
    },
    [router],
  );

  return (
    <header className="fixed inset-x-0 top-0 z-[200] h-[73px]" data-app-header="global">
      <div className="absolute inset-x-0 top-0 h-[61px] bg-[rgba(255,255,255,0.87)] backdrop-blur-[13px]" />
      <div className="relative h-[73px] w-full px-[18px]">
        <div className="flex h-[61px] items-center justify-between">
          <div className="flex items-center">
            <Image
              src="/figma-assets/pictomag-logo.svg"
              alt="Pictomag"
              width={626}
              height={167}
              priority
              className="h-[34px] w-auto"
            />
          </div>

          <div className="flex items-center gap-[18px]">
            {headerTopActions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTopActionClick(item.id)}
                className="h-6 w-6"
                aria-label={item.label}
              >
                <Image src={item.src} alt="" width={24} height={24} className="h-6 w-6" />
              </button>
            ))}

            <div className="h-9 w-px bg-black/12" />

            <SiteAccountMenu
              className="flex h-8 w-[69px] items-center gap-[13px]"
              menuButtonClassName="h-6 w-6"
              avatarButtonClassName="relative h-8 w-8 overflow-hidden rounded-full"
              avatarImageClassName="object-cover"
              avatarSize="32px"
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
          <div className="pointer-events-auto relative h-16 w-[194px]">
            <AnimatedHeaderNav activeItemId={null} onItemClick={handleNavClick} />
          </div>
        </div>
      </div>
    </header>
  );
}
