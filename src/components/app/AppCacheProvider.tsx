"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const PERSIST_KEY = "ods-app-cache-v1";

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
};

function readPersistedShell(): PersistedShell {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedShell;
    return {
      profile: parsed?.profile,
      wallet: parsed?.wallet,
    };
  } catch {
    return {};
  }
}

function writePersistedShell(shell: PersistedShell) {
  if (typeof window === "undefined") return;
  try {
    if (!shell.profile && !shell.wallet) {
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

  // Restore last shell (name + balance) so home feels instant on return visits.
  useEffect(() => {
    const persisted = readPersistedShell();
    if (!persisted.profile && !persisted.wallet) return;
    setState((current) => ({
      ...current,
      profile: persisted.profile
        ? current.profile ?? { data: persisted.profile, fetchedAt: 0 }
        : current.profile,
      wallet: persisted.wallet
        ? current.wallet ?? { data: persisted.wallet, fetchedAt: 0 }
        : current.wallet,
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
    setState((current) => ({
      ...current,
      notifications: { data: notifications, fetchedAt: Date.now() },
    }));
  }, []);

  const updateNotifications = useCallback(
    (updater: (current?: NotificationSnapshot[]) => NotificationSnapshot[] | undefined) => {
      setState((current) => {
        const next = updater(current.notifications?.data);
        return next
          ? { ...current, notifications: { data: next, fetchedAt: Date.now() } }
          : { ...current, notifications: undefined };
      });
    },
    [],
  );

  const setUnreadCount = useCallback((count: number) => {
    setState((current) => ({
      ...current,
      unreadCount: { data: count, fetchedAt: Date.now() },
    }));
  }, []);

  const updateUnreadCount = useCallback((updater: (current?: number) => number | undefined) => {
    setState((current) => {
      const next = updater(current.unreadCount?.data);
      return next == null
        ? { ...current, unreadCount: undefined }
        : { ...current, unreadCount: { data: next, fetchedAt: Date.now() } };
    });
  }, []);

  const setBillers = useCallback((billers: BillersSnapshot) => {
    setState((current) => ({
      ...current,
      billers: { data: billers, fetchedAt: Date.now() },
    }));
  }, []);

  const updateBillers = useCallback(
    (updater: (current?: BillersSnapshot) => BillersSnapshot | undefined) => {
      setState((current) => {
        const next = updater(current.billers?.data);
        return next
          ? { ...current, billers: { data: next, fetchedAt: Date.now() } }
          : { ...current, billers: undefined };
      });
    },
    [],
  );

  const setWatch = useCallback((watch: WatchSnapshot) => {
    setState((current) => ({
      ...current,
      watch: { data: watch, fetchedAt: Date.now() },
    }));
  }, []);

  const updateWatch = useCallback(
    (updater: (current?: WatchSnapshot) => WatchSnapshot | undefined) => {
      setState((current) => {
        const next = updater(current.watch?.data);
        return next
          ? { ...current, watch: { data: next, fetchedAt: Date.now() } }
          : { ...current, watch: undefined };
      });
    },
    [],
  );

  const setReferral = useCallback((referral: ReferralSnapshot) => {
    setState((current) => ({
      ...current,
      referral: { data: referral, fetchedAt: Date.now() },
    }));
  }, []);

  const updateReferral = useCallback(
    (updater: (current?: ReferralSnapshot) => ReferralSnapshot | undefined) => {
      setState((current) => {
        const next = updater(current.referral?.data);
        return next
          ? { ...current, referral: { data: next, fetchedAt: Date.now() } }
          : { ...current, referral: undefined };
      });
    },
    [],
  );

  const setHistory = useCallback((filter: HistoryFilter, transactions: WalletTransaction[]) => {
    setState((current) => ({
      ...current,
      history: {
        ...current.history,
        [filter]: { data: transactions, fetchedAt: Date.now() },
      },
    }));
  }, []);

  const updateHistory = useCallback(
    (
      filter: HistoryFilter,
      updater: (current?: WalletTransaction[]) => WalletTransaction[] | undefined,
    ) => {
      setState((current) => {
        const next = updater(current.history[filter]?.data);
        if (!next) {
          const { [filter]: _removed, ...rest } = current.history;
          return { ...current, history: rest };
        }
        return {
          ...current,
          history: {
            ...current.history,
            [filter]: { data: next, fetchedAt: Date.now() },
          },
        };
      });
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setState((current) => ({ ...current, history: {} }));
  }, []);

  const reset = useCallback(() => {
    setState({ history: {} });
    try {
      window.localStorage.removeItem(PERSIST_KEY);
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
