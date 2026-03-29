import {
  createLiveShoppingRoomStateSeed,
  normalizeLiveShoppingRoomState,
  type LiveShoppingRoomState,
} from "@/lib/live-shopping-room-state";
import { getLiveRoomStateRow, upsertLiveRoomStateRow } from "@/lib/server/sqlite-store";

function parseJson(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export async function readLiveShoppingRoomStateServer(eventId: number) {
  const normalizedEventId = Math.max(1, Math.trunc(eventId));
  const row = getLiveRoomStateRow(normalizedEventId);
  const fallback = createLiveShoppingRoomStateSeed(normalizedEventId);
  const parsed = parseJson(row?.state_json);
  const normalized = normalizeLiveShoppingRoomState(parsed, fallback);

  upsertLiveRoomStateRow({
    eventId: normalizedEventId,
    stateJson: JSON.stringify(normalized),
  });

  return normalized;
}

export async function writeLiveShoppingRoomStateServer(eventId: number, state: unknown) {
  const normalizedEventId = Math.max(1, Math.trunc(eventId));
  const fallback = await readLiveShoppingRoomStateServer(normalizedEventId);
  const normalized = normalizeLiveShoppingRoomState(state, fallback);

  upsertLiveRoomStateRow({
    eventId: normalizedEventId,
    stateJson: JSON.stringify(normalized),
  });

  return normalized;
}

export async function patchLiveShoppingRoomStateServer(
  eventId: number,
  patcher: (current: LiveShoppingRoomState) => LiveShoppingRoomState,
) {
  const current = await readLiveShoppingRoomStateServer(eventId);
  const next = patcher(current);
  return writeLiveShoppingRoomStateServer(eventId, next);
}
