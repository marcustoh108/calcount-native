import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import Purchases, { type CustomerInfo, type PurchasesPackage } from "react-native-purchases";

import { useAuth } from "../backend/AuthContext";
import { hasPremium, packageForPlan, type PlanId, withTimeout } from "./plans";

/**
 * RevenueCat public SDK keys. These are meant to be built into the app (they can only read
 * offerings and make purchases for the signed-in person); never put a RevenueCat secret key here.
 * The App Store key is added once Apple approves the developer account; until then purchases are
 * simply unavailable on iPhone.
 */
const REVENUECAT_KEYS: Partial<Record<typeof Platform.OS, string>> = {
  android: "goog_XdsJEdaFItiJmAnndHbeDVhUgKj",
};

const STORE_TIMEOUT_MS = 20_000;
const SUBSCRIPTIONS_URL = Platform.select({
  android: "https://play.google.com/store/account/subscriptions?package=com.avencia.yumbalance",
  default: "https://apps.apple.com/account/subscriptions",
});

export type PurchaseOutcome = "purchased" | "cancelled";

interface PremiumState {
  /** True when in-app purchases are set up on this device (store build with a RevenueCat key). */
  available: boolean;
  /** True once the subscription status has been checked (or there's nothing to check). */
  ready: boolean;
  /** True while the person has Premium, including during the free trial. */
  isPremium: boolean;
  /** The store's own price for each plan, in the person's currency, once loaded. */
  prices: Partial<Record<PlanId, string>>;
  /** Starts the store's purchase sheet. Throws (with a raw store error) if it fails. */
  purchase: (plan: PlanId) => Promise<PurchaseOutcome>;
  /** Re-checks the store for earlier purchases. Resolves true if Premium is now active. */
  restore: () => Promise<boolean>;
  /** Opens the store's subscription settings so the person can change or cancel. */
  manageSubscription: () => Promise<void>;
}

const PremiumReactContext = createContext<PremiumState | null>(null);

let configured = false;

function configureOnce(): boolean {
  const apiKey = REVENUECAT_KEYS[Platform.OS];
  if (!apiKey) return false;
  if (!configured) {
    Purchases.configure({ apiKey });
    configured = true;
  }
  return true;
}

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [available] = useState(() => {
    try {
      return configureOnce();
    } catch (err) {
      console.warn("In-app purchases couldn't start:", err);
      return false;
    }
  });
  const [ready, setReady] = useState(!available);
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const loggedInAs = useRef<string | null>(null);

  // Keep the subscription status current: the SDK reports renewals, expiries and refunds.
  useEffect(() => {
    if (!available) return;
    const listener = (next: CustomerInfo) => setInfo(next);
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [available]);

  // Link purchases to the YumBalance account, so Premium follows the person to a new phone and
  // the server can see who is subscribed.
  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    (async () => {
      try {
        if (userId && loggedInAs.current !== userId) {
          const { customerInfo } = await withTimeout(Purchases.logIn(userId), STORE_TIMEOUT_MS, "timeout");
          loggedInAs.current = userId;
          if (!cancelled) setInfo(customerInfo);
        } else if (!userId && loggedInAs.current) {
          loggedInAs.current = null;
          const customerInfo = await withTimeout(Purchases.logOut(), STORE_TIMEOUT_MS, "timeout");
          if (!cancelled) setInfo(customerInfo);
        } else {
          const customerInfo = await withTimeout(Purchases.getCustomerInfo(), STORE_TIMEOUT_MS, "timeout");
          if (!cancelled) setInfo(customerInfo);
        }
      } catch (err) {
        // Offline or the store is unavailable: keep the last known status and try again later.
        console.warn("Couldn't check the subscription:", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [available, userId]);

  // Load the plans and their real store prices.
  useEffect(() => {
    if (!available) return;
    withTimeout(Purchases.getOfferings(), STORE_TIMEOUT_MS, "timeout")
      .then((offerings) => setPackages(offerings.current?.availablePackages ?? []))
      .catch((err) => console.warn("Couldn't load subscription plans:", err));
  }, [available]);

  const purchase = useCallback(
    async (plan: PlanId): Promise<PurchaseOutcome> => {
      let list = packages;
      if (list.length === 0) {
        const offerings = await withTimeout(Purchases.getOfferings(), STORE_TIMEOUT_MS, "timeout");
        list = offerings.current?.availablePackages ?? [];
        setPackages(list);
      }
      const pkg = packageForPlan(list, plan);
      if (!pkg) throw { code: "5" };
      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        setInfo(customerInfo);
        return "purchased";
      } catch (err) {
        if ((err as { userCancelled?: boolean }).userCancelled) return "cancelled";
        throw err;
      }
    },
    [packages],
  );

  const restore = useCallback(async () => {
    const customerInfo = await withTimeout(Purchases.restorePurchases(), STORE_TIMEOUT_MS, "timeout");
    setInfo(customerInfo);
    return hasPremium(customerInfo);
  }, []);

  const manageSubscription = useCallback(async () => {
    try {
      if (available) {
        await Purchases.showManageSubscriptions();
        return;
      }
    } catch {
      // Fall back to the store's web page below.
    }
    await Linking.openURL(SUBSCRIPTIONS_URL);
  }, [available]);

  const prices = useMemo(() => {
    const out: Partial<Record<PlanId, string>> = {};
    for (const plan of ["yearly", "monthly"] as const) {
      const pkg = packageForPlan(packages, plan);
      if (pkg) out[plan] = pkg.product.priceString;
    }
    return out;
  }, [packages]);

  const value = useMemo<PremiumState>(
    () => ({ available, ready, isPremium: hasPremium(info), prices, purchase, restore, manageSubscription }),
    [available, ready, info, prices, purchase, restore, manageSubscription],
  );

  return <PremiumReactContext.Provider value={value}>{children}</PremiumReactContext.Provider>;
}

export function usePremium(): PremiumState {
  const ctx = useContext(PremiumReactContext);
  if (!ctx) throw new Error("usePremium must be used within PremiumProvider");
  return ctx;
}
