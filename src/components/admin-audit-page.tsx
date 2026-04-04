"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, RefreshCw, ShieldCheck, UserCog } from "lucide-react";
import { LiveHeader } from "@/components/live-shopping-page";
import type { HeaderNavItemId } from "@/components/animated-header-nav";

type AuditLogRow = {
  id: number;
  user_id: string;
  role: string;
  action_type: string;
  resource_type: string;
  resource_id: string;
  metadata: string;
  metadata_parsed?: unknown;
  created_at: number;
};

type AuditApiPayload = {
  logs?: AuditLogRow[];
  count?: number;
  role?: string;
  scope?: string;
  message?: string;
};

function formatDate(value: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(value);
}

function summarizeMetadata(log: AuditLogRow) {
  const metadata = log.metadata_parsed;
  if (!metadata || typeof metadata !== "object") {
    return "Aucune metadonnee";
  }

  const record = metadata as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof record.amount === "number") {
    parts.push(`montant ${record.amount} EUR`);
  }
  if (typeof record.totalAmount === "number") {
    parts.push(`total ${record.totalAmount} EUR`);
  }
  if (typeof record.quantity === "number") {
    parts.push(`qte ${record.quantity}`);
  }
  if (typeof record.minimumBid === "number") {
    parts.push(`min ${record.minimumBid} EUR`);
  }
  if (typeof record.eventId === "number") {
    parts.push(`event #${record.eventId}`);
  }
  if (typeof record.orderId === "number") {
    parts.push(`order #${record.orderId}`);
  }
  if (typeof record.paymentMethod === "string") {
    parts.push(`paiement ${record.paymentMethod}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "Metadonnees disponibles";
}

export function AdminAuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiRole, setApiRole] = useState<string>("unknown");
  const [userFilter, setUserFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [limit, setLimit] = useState(120);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [elevatingRole, setElevatingRole] = useState(false);

  const handleNav = (item: HeaderNavItemId) => {
    if (item === "home") return router.push("/");
    if (item === "shop") return router.push("/marketplace");
    if (item === "watch") return router.push("/live-shopping");
    if (item === "search") return router.push("/live-shopping");
  };

  const loadLogs = async (options?: { quiet?: boolean }) => {
    const quiet = options?.quiet ?? false;
    if (!quiet) {
      setLoading(true);
      setErrorMessage(null);
    } else {
      setRefreshing(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (userFilter.trim()) {
        params.set("userId", userFilter.trim());
      }

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const payload = (await response.json()) as AuditApiPayload;

      if (response.status === 403) {
        setAccessDenied(true);
        setErrorMessage(payload.message ?? "Acces refuse aux logs d audit.");
        return;
      }

      if (!response.ok) {
        setErrorMessage(payload.message ?? "Impossible de charger les logs d audit.");
        return;
      }

      setAccessDenied(false);
      setLogs(Array.isArray(payload.logs) ? payload.logs : []);
      setApiRole(typeof payload.role === "string" ? payload.role : "unknown");
      setLastUpdatedAt(Date.now());
    } catch {
      setErrorMessage("Erreur reseau. Reessaie dans quelques secondes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadLogs();
    // First load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh || accessDenied) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadLogs({ quiet: true });
    }, 8000);

    return () => {
      window.clearInterval(timer);
    };
    // Intentional dependencies to update interval strategy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, accessDenied, limit, userFilter]);

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      const matchesRole = roleFilter === "all" ? true : entry.role === roleFilter;
      const matchesAction = actionFilter === "all" ? true : entry.action_type === actionFilter;
      return matchesRole && matchesAction;
    });
  }, [actionFilter, logs, roleFilter]);

  const metrics = useMemo(() => {
    const total = filteredLogs.length;
    const bids = filteredLogs.filter((entry) => entry.action_type === "place_bid").length;
    const checkouts = filteredLogs.filter((entry) => entry.action_type === "checkout").length;
    return { total, bids, checkouts };
  }, [filteredLogs]);

  const exportJson = () => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      role: apiRole,
      filters: {
        userFilter: userFilter.trim() || null,
        roleFilter,
        actionFilter,
        limit,
      },
      logs: filteredLogs,
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });

    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `pictomag-audit-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  const enableAdminRole = async () => {
    setElevatingRole(true);

    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "admin",
        }),
      });

      if (!response.ok) {
        setErrorMessage("Impossible d activer le role admin.");
        return;
      }

      await loadLogs();
    } catch {
      setErrorMessage("Impossible d activer le role admin pour la demo.");
    } finally {
      setElevatingRole(false);
    }
  };

  return (
      <div className="min-h-screen bg-white">
        <LiveHeader
          onNavClick={handleNav}
          onCreateClick={() => router.push("/live-shopping/schedule")}
          onNotificationsClick={() => setErrorMessage("Centre de notifications en cours de construction.")}
          onMessagesClick={() => setErrorMessage("Messagerie admin en cours de construction.")}
        />

      <section className="w-full px-8 pb-16 pt-[116px]">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8aa0bd]">Pictomag admin</p>
            <h1 className="mt-2 text-[42px] font-medium tracking-[-0.045em] text-[#101522]">Audit monitor</h1>
            <p className="mt-2 max-w-[760px] text-[15px] leading-7 text-[#66768c]">
              Journal temps reel des actions sensibles live shopping (encheres, checkout) avec filtres ops et export.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/live-shopping-cards")}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-[#d8e2f1] px-4 text-[14px] font-medium tracking-[-0.01em] text-[#101522] transition hover:bg-[#f7fbff]"
            >
              <UserCog className="h-4 w-4" />
              Studio live cards
            </button>
            <button
              type="button"
              onClick={() => void loadLogs({ quiet: true })}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-[#d8e2f1] px-4 text-[14px] font-medium tracking-[-0.01em] text-[#101522] transition hover:bg-[#f7fbff]"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Rafraichir
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-[#d8e2f1] px-4 text-[14px] font-medium tracking-[-0.01em] text-[#101522] transition hover:bg-[#f7fbff]"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Export JSON
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="rounded-[10px] border border-[#edf1f7] bg-white p-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8aa0bd]">Events filtres</p>
            <p className="mt-3 text-[34px] font-medium tracking-[-0.04em] text-[#101522]">{metrics.total}</p>
          </div>
          <div className="rounded-[10px] border border-[#edf1f7] bg-white p-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8aa0bd]">Encheres</p>
            <p className="mt-3 text-[34px] font-medium tracking-[-0.04em] text-[#101522]">{metrics.bids}</p>
          </div>
          <div className="rounded-[10px] border border-[#edf1f7] bg-white p-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8aa0bd]">Checkouts</p>
            <p className="mt-3 text-[34px] font-medium tracking-[-0.04em] text-[#101522]">{metrics.checkouts}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[10px] border border-[#edf1f7] bg-white p-5">
          <div className="grid grid-cols-[280px_220px_220px_140px_1fr] gap-3">
            <input
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
              placeholder="Filtre userId (optionnel)"
              className="h-11 rounded-[10px] border border-[#dce5f2] px-3 text-[14px] text-[#101522] outline-none focus:border-[#2b6fff]"
            />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-11 rounded-[10px] border border-[#dce5f2] px-3 text-[14px] text-[#101522] outline-none focus:border-[#2b6fff]"
            >
              <option value="all">Tous les roles</option>
              <option value="buyer">buyer</option>
              <option value="seller">seller</option>
              <option value="moderator">moderator</option>
              <option value="admin">admin</option>
              <option value="finance_admin">finance_admin</option>
            </select>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="h-11 rounded-[10px] border border-[#dce5f2] px-3 text-[14px] text-[#101522] outline-none focus:border-[#2b6fff]"
            >
              <option value="all">Toutes les actions</option>
              <option value="place_bid">place_bid</option>
              <option value="checkout">checkout</option>
            </select>
            <select
              value={String(limit)}
              onChange={(event) => setLimit(Number.parseInt(event.target.value, 10))}
              className="h-11 rounded-[10px] border border-[#dce5f2] px-3 text-[14px] text-[#101522] outline-none focus:border-[#2b6fff]"
            >
              <option value="60">60</option>
              <option value="120">120</option>
              <option value="180">180</option>
              <option value="250">250</option>
            </select>
            <div className="flex items-center justify-between rounded-[10px] border border-[#dce5f2] px-3">
              <div>
                <p className="text-[12px] uppercase tracking-[0.14em] text-[#8aa0bd]">Auto refresh</p>
                <p className="text-[13px] text-[#66768c]">Toutes les 8 sec</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoRefresh((value) => !value)}
                className={`relative h-6 w-11 rounded-full transition ${autoRefresh ? "bg-[#2b6fff]" : "bg-[#d2d9e4]"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                    autoRefresh ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-[10px] border border-[#ffd9d9] bg-[#fff8f8] px-4 py-3 text-[14px] text-[#9c3434]">
            {errorMessage}
          </div>
        ) : null}

        {accessDenied ? (
          <div className="mt-6 rounded-[10px] border border-[#edf1f7] bg-white p-8">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#eef4ff] text-[#2b6fff]">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-[26px] font-medium tracking-[-0.03em] text-[#101522]">Acces audit restreint</h2>
                <p className="mt-2 max-w-[720px] text-[15px] leading-7 text-[#66768c]">
                  Cette page demande un role admin, moderator ou finance_admin. Pour la demo, on peut activer un role admin local.
                </p>
                <button
                  type="button"
                  onClick={() => void enableAdminRole()}
                  disabled={elevatingRole}
                  className="mt-4 inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#2b6fff] px-4 text-[14px] font-medium tracking-[-0.01em] text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <UserCog className="h-4 w-4" />
                  {elevatingRole ? "Activation..." : "Activer mode admin (demo)"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!accessDenied ? (
          <div className="mt-6 overflow-hidden rounded-[10px] border border-[#edf1f7] bg-white">
            <div className="grid grid-cols-[170px_220px_120px_130px_170px_1fr] gap-3 border-b border-[#edf1f7] bg-[#fbfcfe] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#7f8fa8]">
              <span>Date</span>
              <span>User</span>
              <span>Role</span>
              <span>Action</span>
              <span>Resource</span>
              <span>Metadata</span>
            </div>

            {loading ? (
              <div className="px-5 py-8 text-[14px] text-[#66768c]">Chargement des logs d audit...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="px-5 py-8 text-[14px] text-[#66768c]">Aucun log pour ces filtres.</div>
            ) : (
              <div className="max-h-[620px] overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="grid grid-cols-[170px_220px_120px_130px_170px_1fr] gap-3 border-b border-[#edf1f7] px-5 py-3 text-[13px] text-[#101522]"
                  >
                    <span className="text-[#5f6f84]">{formatDate(log.created_at)}</span>
                    <span className="truncate font-medium">{log.user_id}</span>
                    <span className="truncate text-[#5f6f84]">{log.role}</span>
                    <span className="truncate font-medium">{log.action_type}</span>
                    <span className="truncate text-[#5f6f84]">
                      {log.resource_type} · {log.resource_id}
                    </span>
                    <span className="truncate text-[#5f6f84]">{summarizeMetadata(log)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between text-[13px] text-[#7f8fa8]">
          <span>Role courant: {apiRole}</span>
          <span>{lastUpdatedAt ? `Derniere synchro: ${formatDate(lastUpdatedAt)}` : "Pas encore synchronise."}</span>
        </div>
      </section>
    </div>
  );
}
