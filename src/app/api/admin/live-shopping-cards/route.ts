import { extname, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { liveShoppingCategories } from "@/lib/live-shopping-data";
import {
  getLiveShoppingCategoryCardDefaultArtSettings,
  getLiveShoppingCategoryCardDefaultImageSrc,
} from "@/lib/live-shopping-category-card-art";
import { isRoleAllowed, resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import { attachPreferenceUserCookie, resolveExistingPreferenceUser } from "@/lib/server/preference-user";
import {
  deleteLiveCategoryCardAssetRow,
  getLiveCategoryCardAssetRow,
  insertAuditLog,
  listLiveCategoryCardAssetRows,
  upsertLiveCategoryCardAssetRow,
} from "@/lib/server/sqlite-store";

export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
]);

function buildResponseItems() {
  const overrides = new Map(
    listLiveCategoryCardAssetRows().map((row) => [
      row.category_id,
      {
        imageSrc: row.image_src,
        offsetX: row.offset_x,
        offsetY: row.offset_y,
        zoom: row.zoom,
        updatedAt: row.updated_at,
        updatedByUserId: row.updated_by_user_id,
      },
    ]),
  );

  return liveShoppingCategories.map((category) => {
    const override = overrides.get(category.id);
    const defaultArt = getLiveShoppingCategoryCardDefaultArtSettings(category.id);
    return {
      categoryId: category.id,
      label: category.label,
      defaultImageSrc: defaultArt.imageSrc,
      imageSrc: override?.imageSrc ?? defaultArt.imageSrc,
      overrideImageSrc: override?.imageSrc ?? null,
      offsetX: override?.offsetX ?? defaultArt.offsetX,
      offsetY: override?.offsetY ?? defaultArt.offsetY,
      zoom: override?.zoom ?? defaultArt.zoom,
      updatedAt: override?.updatedAt ?? null,
      updatedByUserId: override?.updatedByUserId ?? null,
    };
  });
}

function parseFiniteNumber(value: FormDataEntryValue | null, fallback: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function jsonWithCompat(
  request: NextRequest,
  body: Record<string, unknown>,
  init?: ResponseInit,
) {
  const response = NextResponse.json(body, init);
  const resolvedUser = resolveExistingPreferenceUser(request, {
    allowQueryUserId: false,
  });
  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}

function requireAdmin(request: NextRequest) {
  const authenticatedUser = resolveAuthenticatedAppUser(request);

  if (!authenticatedUser) {
    return {
      error: jsonWithCompat(
        request,
        {
          message: "Authentification requise pour administrer les cartes live.",
        },
        { status: 401 },
      ),
    };
  }

  if (!isRoleAllowed(authenticatedUser.role, ["admin"])) {
    return {
      error: jsonWithCompat(
        request,
        {
          message: "Acces reserve aux administrateurs.",
          role: authenticatedUser.role,
        },
        { status: 403 },
      ),
    };
  }

  return { authenticatedUser };
}

function validateCategoryId(categoryId: string | null) {
  if (!categoryId) {
    return null;
  }

  return liveShoppingCategories.find((category) => category.id === categoryId) ?? null;
}

export async function GET(request: NextRequest) {
  const access = requireAdmin(request);
  if ("error" in access) {
    return access.error;
  }

  return jsonWithCompat(request, {
    items: buildResponseItems(),
    role: access.authenticatedUser.role,
  });
}

export async function POST(request: NextRequest) {
  const access = requireAdmin(request);
  if ("error" in access) {
    return access.error;
  }

  const formData = await request.formData();
  const categoryId = typeof formData.get("categoryId") === "string" ? String(formData.get("categoryId")) : null;
  const category = validateCategoryId(categoryId);

  if (!category) {
    return jsonWithCompat(
      request,
      {
        message: "Categorie live invalide.",
      },
      { status: 400 },
    );
  }

  const existing = getLiveCategoryCardAssetRow(category.id);
  const defaultArt = getLiveShoppingCategoryCardDefaultArtSettings(category.id);
  const rawFile = formData.get("file");
  const offsetX = Math.max(-70, Math.min(70, parseFiniteNumber(formData.get("offsetX"), existing?.offset_x ?? 0)));
  const offsetY = Math.max(-70, Math.min(70, parseFiniteNumber(formData.get("offsetY"), existing?.offset_y ?? 0)));
  const zoom = Math.max(0.84, Math.min(1.4, parseFiniteNumber(formData.get("zoom"), existing?.zoom ?? 1)));

  let imageSrc = existing?.image_src ?? defaultArt.imageSrc;
  let fileName: string | null = null;

  if (rawFile instanceof File && rawFile.size > 0) {
    if (rawFile.size > 10 * 1024 * 1024) {
      return jsonWithCompat(
        request,
        {
          message: "Le fichier doit faire entre 1 octet et 10 Mo.",
        },
        { status: 400 },
      );
    }

    const extension =
      ALLOWED_IMAGE_TYPES.get(rawFile.type) ||
      extname(rawFile.name).toLowerCase() ||
      null;

    if (!extension || ![".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(extension)) {
      return jsonWithCompat(
        request,
        {
          message: "Formats acceptes: JPG, PNG, WEBP, AVIF.",
        },
        { status: 400 },
      );
    }

    fileName = `${category.id}-${Date.now()}-${randomUUID().slice(0, 8)}${extension === ".jpeg" ? ".jpg" : extension}`;
    const directory = join(process.cwd(), "public", "live-shopping", "categories", "custom");
    mkdirSync(directory, { recursive: true });

    const buffer = Buffer.from(await rawFile.arrayBuffer());
    writeFileSync(join(directory, fileName), buffer);

    imageSrc = `/live-shopping/categories/custom/${fileName}`;
  }

  const row = upsertLiveCategoryCardAssetRow({
    categoryId: category.id,
    imageSrc,
    offsetX,
    offsetY,
    zoom,
    updatedByUserId: access.authenticatedUser.user.id,
  });

  insertAuditLog({
    userId: access.authenticatedUser.user.id,
    role: access.authenticatedUser.role,
    actionType: "update_live_category_card_asset",
    resourceType: "live_category_card_asset",
    resourceId: category.id,
    metadata: JSON.stringify({
      categoryId: category.id,
      imageSrc,
      fileName,
      offsetX,
      offsetY,
      zoom,
    }),
  });

  return jsonWithCompat(request, {
    item: {
      categoryId: category.id,
      label: category.label,
      defaultImageSrc: getLiveShoppingCategoryCardDefaultImageSrc(category.id),
      imageSrc: row?.image_src ?? imageSrc,
      overrideImageSrc: row?.image_src ?? imageSrc,
      offsetX: row?.offset_x ?? offsetX,
      offsetY: row?.offset_y ?? offsetY,
      zoom: row?.zoom ?? zoom,
      updatedAt: row?.updated_at ?? Date.now(),
      updatedByUserId: row?.updated_by_user_id ?? access.authenticatedUser.user.id,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const access = requireAdmin(request);
  if ("error" in access) {
    return access.error;
  }

  const payload = (await request.json().catch(() => null)) as { categoryId?: string } | null;
  const category = validateCategoryId(payload?.categoryId ?? null);

  if (!category) {
    return jsonWithCompat(
      request,
      {
        message: "Categorie live invalide.",
      },
      { status: 400 },
    );
  }

  deleteLiveCategoryCardAssetRow(category.id);

  insertAuditLog({
    userId: access.authenticatedUser.user.id,
    role: access.authenticatedUser.role,
    actionType: "reset_live_category_card_asset",
    resourceType: "live_category_card_asset",
    resourceId: category.id,
    metadata: JSON.stringify({
      categoryId: category.id,
      imageSrc: getLiveShoppingCategoryCardDefaultImageSrc(category.id),
    }),
  });

  return jsonWithCompat(request, {
    item: {
      categoryId: category.id,
      label: category.label,
      defaultImageSrc: getLiveShoppingCategoryCardDefaultImageSrc(category.id),
      imageSrc: getLiveShoppingCategoryCardDefaultImageSrc(category.id),
      overrideImageSrc: null,
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
      updatedAt: null,
      updatedByUserId: null,
    },
  });
}
