export type TimeLikeMutationResult = {
  active: boolean;
  totalCount: number;
  timelike?: {
    activeMs: number;
    maxProgress: number;
    createdAt: number;
    updatedAt: number;
  };
};

async function readMutationResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || "Operation TimeLike impossible.");
  }

  return payload;
}

export async function persistTimeLike({
  postId,
  activeMs,
  maxProgress,
}: {
  postId: number;
  activeMs: number;
  maxProgress: number;
}) {
  const response = await fetch(`/api/posts/${postId}/timelike`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      activeMs,
      maxProgress,
    }),
  });

  return (await readMutationResponse(response)) as TimeLikeMutationResult;
}

export async function removeTimeLike(postId: number) {
  const response = await fetch(`/api/posts/${postId}/timelike`, {
    method: "DELETE",
    credentials: "same-origin",
  });

  return (await readMutationResponse(response)) as TimeLikeMutationResult;
}
