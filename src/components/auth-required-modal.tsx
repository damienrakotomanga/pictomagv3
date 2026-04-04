"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { resolveProfileAvatarSrc } from "@/lib/profile-avatar";

type AuthRequiredModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  signupHref: string;
  loginHref: string;
  avatarSrc?: string | null;
  avatarAlt?: string;
};

export function AuthRequiredModal({
  open,
  onClose,
  title,
  description,
  signupHref,
  loginHref,
  avatarSrc,
  avatarAlt = "Profil public",
}: AuthRequiredModalProps) {
  if (!open) {
    return null;
  }

  const safeAvatar = resolveProfileAvatarSrc(avatarSrc ?? null, "/figma-assets/avatar-user.png");

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-[rgba(9,12,20,0.82)] px-4 py-8 backdrop-blur-[10px]">
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-[34px] bg-white px-8 pb-8 pt-8 shadow-[0_44px_140px_rgba(8,15,28,0.42)] sm:px-10 sm:pb-10 sm:pt-10">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full text-[#101522] transition hover:bg-black/[0.05]"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center justify-center">
          <Image
            src="/figma-assets/pictomag-logo.svg"
            alt="Pictomag"
            width={626}
            height={167}
            className="h-[28px] w-auto"
          />
        </div>

        <div className="mt-10 flex flex-col items-center text-center">
          <div className="rounded-full border border-black/[0.06] bg-[#f5f7fb] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8392a7]">
            Profil public
          </div>

          <div className="mx-auto mt-7 flex w-fit items-center justify-center rounded-full bg-[#f4f7fb] p-1.5">
            <div className="relative h-[92px] w-[92px] overflow-hidden rounded-full bg-[#edf2f8] ring-1 ring-black/[0.05]">
              <Image src={safeAvatar} alt={avatarAlt} fill sizes="92px" className="object-cover" />
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-[420px]">
            <h2 className="text-[42px] font-semibold leading-[0.9] tracking-[-0.07em] text-[#101522] sm:text-[48px]">
              {title}
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-[#5f6f82]">{description}</p>
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-3">
          <Link
            href={signupHref}
            className="inline-flex h-14 items-center justify-center rounded-full bg-[#101522] px-5 text-[17px] font-semibold text-white transition hover:bg-[#1a2333]"
          >
            Creer un compte
          </Link>
          <Link
            href={loginHref}
            className="inline-flex h-14 items-center justify-center rounded-full border border-black/8 bg-white text-[16px] font-semibold text-[#101522] transition hover:bg-[#f6f8fb]"
          >
            Se connecter
          </Link>
        </div>

        <div className="mt-8 border-t border-black/[0.06] pt-6 text-center">
          <p className="text-[14px] font-medium text-[#101522]">Le profil reste visible. Le reste s&apos;ouvre apres connexion.</p>
          <p className="mt-2 text-[12px] leading-6 text-[#8d99ab]">
            Creer un compte te donne acces au feed, aux messages, aux videos et aux albums.
          </p>
        </div>
      </div>
    </div>
  );
}
