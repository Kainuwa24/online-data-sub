"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const PERSIST_KEY = "ods-app-cache-v2";

export type HistoryFilter = "ALL" | "CREDIT" | "DEBIT";

export type WalletTransaction = {
  id: string;
  label: string;
  type: string;
  amountKobo: number;
  createdAt: string;
  category?: string;
  credit?: boolean;
  amountFormatted?: string;
  status?: string;
  reference?: string;
  meta?: unknown;
  [key: string]: unknown;
};

export type FundingProviderId = "palmpay" | "flutterwave";

export type WalletSnapshot = {
  balanceKobo: number;
  transactions: WalletTransaction[];
  account: {
    provider?: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    accountReference: string;
    kycIncomplete?: boolean;
  } | null;
  kycReady: boolean;
  configured: boolean;
  fundingProvider?: FundingProviderId;
  providers?: {
    palmpay: { enabled: boolean; label: string };
    flutterwave: { enabled: boolean; label: string };
  };
};

export type ProfileSnapshot = {
  name: string;
  phone: string;
  email: string | null;
  bvnMasked: string | null;
  ninMasked: string | null;
};

export type NotificationSnapshot = {
  id: string;
  title: string;
  body: string;
  unread: boolean;
  createdAt: string;
};

export type BillerSnapshot = {
  serviceID: string;
  name: string;
  variationCode?: string;
};

export type BillersSnapshot = Record<string, BillerSnapshot[]>;

export type WatchSnapshot = {
  gold: {
    pricePerGramNgn: number;
    changePercent: number;
  } | null;
  stocks: {
    ticker: string;
    name: string;
    priceKobo: number;
    changePercent: number;
  }[];
};

export type ReferralInvite = {
  id: string;
  name: string;
  status: string;
  done: boolean;
};

export type ReferralSnapshot = {
  code: string;
  tagline: string;
  friendsJoined: number;
  earnedFormatted: string;
  invites: ReferralInvite[];
};

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

type AppCacheState = {
  profile?: CacheEntry<ProfileSnapshot>;
  wallet?: CacheEntry<WalletSnapshot>;
  notifications?: CacheEntry<NotificationSnapshot[]>;
  unreadCount?: CacheEntry<number>;
  billers?: CacheEntry<BillersSnapshot>;
  watch?: CacheEntry<WatchSnapshot>;
  referral?: CacheEntry<ReferralSnapshot>;
  history: Partial<Record<HistoryFilter, CacheEntry<WalletTransaction[]>>>;
};

type PersistedShell = {
  profile?: ProfileSnapshot;
  wallet?: WalletSnapshot;
  notifications?: NotificationSnapshot[];
  unreadCount?: number;
  billers?: BillersSnapshot;
  watch?: WatchSnapshot;
  referral?: ReferralSnapshot;
  /** Full history list (ALL filter) for instant History/Home return visits */
  historyAll?: WalletTransaction[];
};

function readPersistedShell(): PersistedShell {
  if (typeof window === "undefined") return {};
  try {
    // Prefer v2; fall back to v1 (profile + wallet only)
    const raw =
      window.localStorage.getItem(PERSIST_KEY) ||
      window.localStorage.getItem("ods-app-cache-v1");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedShell;
    return {
      profile: parsed?.profile,
      wallet: parsed?.wallet,
      notifications: parsed?.notifications,
      unreadCount: parsed?.unreadCount,
      billers: parsed?.billers,
      watch: parsed?.watch,
      referral: parsed?.referral,
      historyAll: parsed?.historyAll,
    };
  } catch {
    return {};
  }
}

function writePersistedShell(shell: PersistedShell) {
  if (typeof window === "undefined") return;
  try {
    const empty =
      !shell.profile &&
      !shell.wallet &&
      !shell.notifications &&
      !shell.billers &&
      !shell.watch &&
      !shell.referral &&
      !shell.historyAll;
    if (empty) {
      window.localStorage.removeItem(PERSIST_KEY);
      return;
    }
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(shell));
  } catch {
    // Quota / private mode — ignore
  }
}

function persistFromState(state: AppCacheState) {
  writePersistedShell({
    profile: state.profile?.data,
    wallet: state.wallet?.data,
    notifications: state.notifications?.data,
    unreadCount: state.unreadCount?.data,
    billers: state.billers?.data,
    watch: state.watch?.data,
    referral: state.referral?.data,
    historyAll: state.history.ALL?.data,
  });
}

type AppCacheContextValue = {
  profile?: ProfileSnapshot;
  wallet?: WalletSnapshot;
  notifications?: NotificationSnapshot[];
  unreadCount?: number;
  billers?: BillersSnapshot;
  watch?: WatchSnapshot;
  referral?: ReferralSnapshot;
  history: Partial<Record<HistoryFilter, WalletTransaction[]>>;
  setProfile: (profile: ProfileSnapshot) => void;
  updateProfile: (updater: (current?: ProfileSnapshot) => ProfileSnapshot | undefined) => void;
  setWallet: (wallet: WalletSnapshot) => void;
  updateWallet: (updater: (current?: WalletSnapshot) => WalletSnapshot | undefined) => void;
  setNotifications: (notifications: NotificationSnapshot[]) => void;
  updateNotifications: (
    updater: (current?: NotificationSnapshot[]) => NotificationSnapshot[] | undefined,
  ) => void;
  setUnreadCount: (count: number) => void;
  updateUnreadCount: (updater: (current?: number) => number | undefined) => void;
  setBillers: (billers: BillersSnapshot) => void;
  updateBillers: (updater: (current?: BillersSnapshot) => BillersSnapshot | undefined) => void;
  setWatch: (watch: WatchSnapshot) => void;
  updateWatch: (updater: (current?: WatchSnapshot) => WatchSnapshot | undefined) => void;
  setReferral: (referral: ReferralSnapshot) => void;
  updateReferral: (
    updater: (current?: ReferralSnapshot) => ReferralSnapshot | undefined,
  ) => void;
  setHistory: (filter: HistoryFilter, transactions: WalletTransaction[]) => void;
  updateHistory: (
    filter: HistoryFilter,
    updater: (current?: WalletTransaction[]) => WalletTransaction[] | undefined,
  ) => void;
  clearHistory: () => void;
  reset: () => void;
};

const AppCacheContext = createContext<AppCacheContextValue | null>(null);

export function AppCacheProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppCacheState>({ history: {} });

  // Restore last snapshots so browse screens feel instant on return visits.
  useEffect(() => {
    const p = readPersistedShell();
    if (
      !p.profile &&
      !p.wallet &&
      !p.notifications &&
      !p.billers &&
      !p.watch &&
      !p.referral &&
      !p.historyAll
    ) {
      return;
    }
    setState((current) => ({
      ...current,
      profile: p.profile
        ? current.profile ?? { data: p.profile, fetchedAt: 0 }
        : current.profile,
      wallet: p.wallet
        ? current.wallet ?? { data: p.wallet, fetchedAt: 0 }
        : current.wallet,
      notifications: p.notifications
        ? current.notifications ?? { data: p.notifications, fetchedAt: 0 }
        : current.notifications,
      unreadCount:
        typeof p.unreadCount === "number"
          ? current.unreadCount ?? { data: p.unreadCount, fetchedAt: 0 }
          : current.unreadCount,
      billers: p.billers
        ? current.billers ?? { data: p.billers, fetchedAt: 0 }
        : current.billers,
      watch: p.watch
        ? current.watch ?? { data: p.watch, fetchedAt: 0 }
        : current.watch,
      referral: p.referral
        ? current.referral ?? { data: p.referral, fetchedAt: 0 }
        : current.referral,
      history: p.historyAll
        ? {
            ...current.history,
            ALL: current.history.ALL ?? { data: p.historyAll, fetchedAt: 0 },
          }
        : current.history,
    }));
  }, []);

  const setProfile = useCallback((profile: ProfileSnapshot) => {
    setState((current) => {
      const next = {
        ...current,
        profile: { data: profile, fetchedAt: Date.now() },
      };
      persistFromState(next);
      return next;
    });
  }, []);

  const updateProfile = useCallback(
    (updater: (current?: ProfileSnapshot) => ProfileSnapshot | undefined) => {
      setState((current) => {
        const nextProfile = updater(current.profile?.data);
        const next = nextProfile
          ? { ...current, profile: { data: nextProfile, fetchedAt: Date.now() } }
          : { ...current, profile: undefined };
        persistFromState(next);
        return next;
      });
    },
    [],
  );

  const setWallet = useCallback((wallet: WalletSnapshot) => {
    setState((current) => {
      const next = {
        ...current,
        wallet: { data: wallet, fetchedAt: Date.now() },
      };
      persistFromState(next);
      return next;
    });
  }, []);

  const updateWallet = useCallback(
    (updater: (current?: WalletSnapshot) => WalletSnapshot | undefined) => {
      setState((current) => {
        const nextWallet = updater(current.wallet?.data);
        const next = nextWallet
          ? { ...current, wallet: { data: nextWallet, fetchedAt: Date.now() } }
          : { ...current, wallet: undefined };
        persistFromState(next);
        return next;
      });
    },
    [],
  );

  const setNotifications = useCallback((notifications: NotificationSnapshot[]) => {
    setState((current) => {
      const next = {
        ...current,
        notifications: { data: notifications, fetchedAt: Date.now() },
      };
      persistFromState(next);
      return next;
    });
  }, []);

  const updateNotifications = useCallback(
    (updater: (current?: NotificationSnapshot[]) => NotificationSnapshot[] | undefined) => {
      setState((current) => {
        const nextList = updater(current.notifications?.data);
        const next = nextList
          ? { ...current, notifications: { data: nextList, fetchedAt: Date.now() } }
          : { ...current, notifications: undefined };
        persistFromState(next);
        return next;
      });
    },
    [],
  );

  const setUnreadCount = useCallback((count: number) => {
    setState((current) => {
      const next = {
        ...current,
        unreadCount: { data: count, fetchedAt: Date.now() },
      };
      persistFromState(next);
      return next;
    });
  }, []);

  const updateUnreadCount = useCallback((updater: (current?: number) => number | undefined) => {
    setState((current) => {
      const nextCount = updater(current.unreadCount?.data);
      const next =
        nextCount == null
          ? { ...current, unreadCount: undefined }
          : { ...current, unreadCount: { data: nextCount, fetchedAt: Date.now() } };
      persistFromState(next);
      return next;
    });
  }, []);

  const setBillers = useCallback((billers: BillersSnapshot) => {
    setState((current) => {
      const next = {
        ...current,
        billers: { data: billers, fetchedAt: Date.now() },
      };
      persistFromState(next);
      return next;
    });
  }, []);

  const updateBillers = useCallback(
    (updater: (current?: BillersSnapshot) => BillersSnapshot | undefined) => {
      setState((current) => {
        const nextBillers = updater(current.billers?.data);
        const next = nextBillers
          ? { ...current, billers: { data: nextBillers, fetchedAt: Date.now() } }
          : { ...current, billers: undefined };
        persistFromState(next);
        return next;
      });
    },
    [],
  );

  const setWatch = useCallback((watch: WatchSnapshot) => {
    setState((current) => {
      const next = {
        ...current,
        watch: { data: watch, fetchedAt: Date.now() },
      };
      persistFromState(next);
      return next;
    });
  }, []);

  const updateWatch = useCallback(
    (updater: (current?: WatchSnapshot) => WatchSnapshot | undefined) => {
      setState((current) => {
        const nextWatch = updater(current.watch?.data);
        const next = nextWatch
          ? { ...current, watch: { data: nextWatch, fetchedAt: Date.now() } }
          : { ...current, watch: undefined };
        persistFromState(next);
        return next;
      });
    },
    [],
  );

  const setReferral = useCallback((referral: ReferralSnapshot) => {
    setState((current) => {
      const next = {
        ...current,
        referral: { data: referral, fetchedAt: Date.now() },
      };
      persistFromState(next);
      return next;
    });
  }, []);

  const updateReferral = useCallback(
    (updater: (current?: ReferralSnapshot) => ReferralSnapshot | undefined) => {
      setState((current) => {
        const nextReferral = updater(current.referral?.data);
        const next = nextReferral
          ? { ...current, referral: { data: nextReferral, fetchedAt: Date.now() } }
          : { ...current, referral: undefined };
        persistFromState(next);
        return next;
      });
    },
    [],
  );

  const setHistory = useCallback((filter: HistoryFilter, transactions: WalletTransaction[]) => {
    setState((current) => {
      const next = {
        ...current,
        history: {
          ...current.history,
          [filter]: { data: transactions, fetchedAt: Date.now() },
        },
      };
      persistFromState(next);
      return next;
    });
  }, []);

  const updateHistory = useCallback(
    (
      filter: HistoryFilter,
      updater: (current?: WalletTransaction[]) => WalletTransaction[] | undefined,
    ) => {
      setState((current) => {
        const nextList = updater(current.history[filter]?.data);
        let next: AppCacheState;
        if (!nextList) {
          const { [filter]: _removed, ...rest } = current.history;
          next = { ...current, history: rest };
        } else {
          next = {
            ...current,
            history: {
              ...current.history,
              [filter]: { data: nextList, fetchedAt: Date.now() },
            },
          };
        }
        persistFromState(next);
        return next;
      });
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setState((current) => {
      const next = { ...current, history: {} };
      persistFromState(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState({ history: {} });
    try {
      window.localStorage.removeItem(PERSIST_KEY);
      window.localStorage.removeItem("ods-app-cache-v1");
      window.sessionStorage.removeItem("ods-biometric-session-ok");
    } catch {
      // ignore
    }
  }, []);

  const historyView = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(state.history).map(([filter, entry]) => [filter, entry?.data]),
      ) as Partial<Record<HistoryFilter, WalletTransaction[]>>,
    [state.history],
  );

  const value = useMemo<AppCacheContextValue>(
    () => ({
      profile: state.profile?.data,
      wallet: state.wallet?.data,
      notifications: state.notifications?.data,
      unreadCount: state.unreadCount?.data,
      billers: state.billers?.data,
      watch: state.watch?.data,
      referral: state.referral?.data,
      history: historyView,
      setProfile,
      updateProfile,
      setWallet,
      updateWallet,
      setNotifications,
      updateNotifications,
      setUnreadCount,
      updateUnreadCount,
      setBillers,
      updateBillers,
      setWatch,
      updateWatch,
      setReferral,
      updateReferral,
      setHistory,
      updateHistory,
      clearHistory,
      reset,
    }),
    [
      state.profile,
      state.wallet,
      state.notifications,
      state.unreadCount,
      state.billers,
      state.watch,
      state.referral,
      historyView,
      setProfile,
      updateProfile,
      setWallet,
      updateWallet,
      setNotifications,
      updateNotifications,
      setUnreadCount,
      updateUnreadCount,
      setBillers,
      updateBillers,
      setWatch,
      updateWatch,
      setReferral,
      updateReferral,
      setHistory,
      updateHistory,
      clearHistory,
      reset,
    ],
  );

  return <AppCacheContext.Provider value={value}>{children}</AppCacheContext.Provider>;
}

export function useAppCache() {
  const value = useContext(AppCacheContext);
  if (!value) {
    throw new Error("useAppCache must be used within AppCacheProvider");
  }
  return value;
}
