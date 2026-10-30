import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orders } from '@/services/api';
import { playNewOrderBeep } from '@/lib/posOrderAlertSound';

const STORAGE_KEY = 'yasvik-pos-seen-order-ids';
const ALERTS_ENABLED_KEY = 'yasvik-pos-online-alerts';
const POLL_MS = 20_000;

const ALERT_STATUSES = new Set(['pending', 'payment_received', 'confirmed']);

function loadSeenIds() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids) {
  try {
    const arr = [...ids].slice(-200);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore quota errors
  }
}

function loadAlertsEnabled() {
  try {
    const v = localStorage.getItem(ALERTS_ENABLED_KEY);
    return v !== 'false';
  } catch {
    return true;
  }
}

function isWebOrder(order) {
  return order?.order_channel !== 'pos';
}

function isAlertable(order) {
  return isWebOrder(order) && ALERT_STATUSES.has(order?.status);
}

function orderLabel(order) {
  return order?.order_number || order?.id?.slice(-8) || 'New order';
}

function orderTotal(order) {
  const paise = order?.amount_paise ?? order?.total_paise ?? 0;
  return Math.round(Number(paise) / 100);
}

export function usePosOnlineOrderAlerts({ enabled = true } = {}) {
  const [alertsEnabled, setAlertsEnabledState] = useState(loadAlertsEnabled);
  const [alerts, setAlerts] = useState([]);
  const seenRef = useRef(loadSeenIds());
  const initializedRef = useRef(false);

  const setAlertsEnabled = useCallback((on) => {
    setAlertsEnabledState(on);
    try {
      localStorage.setItem(ALERTS_ENABLED_KEY, on ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, []);

  const dismissAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setAlerts([]);
  }, []);

  const markSeen = useCallback((orderId) => {
    seenRef.current.add(orderId);
    saveSeenIds(seenRef.current);
  }, []);

  const pushAlert = useCallback((order) => {
    const id = order.id;
    markSeen(id);
    setAlerts((prev) => {
      if (prev.some((a) => a.id === id)) return prev;
      return [
        {
          id,
          orderNumber: orderLabel(order),
          customer: order.customer_name || order.guest_name || 'Customer',
          total: orderTotal(order),
          status: order.status,
          createdAt: order.created_date,
        },
        ...prev,
      ].slice(0, 8);
    });
    playNewOrderBeep();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('New online order', {
          body: `${orderLabel(order)} · ₹${orderTotal(order).toLocaleString('en-IN')}`,
          tag: `yasvik-order-${id}`,
          requireInteraction: true,
        });
      } catch {
        // ignore
      }
    }
  }, [markSeen]);

  const { data: orderList = [] } = useQuery({
    queryKey: ['pos-online-order-alerts'],
    queryFn: () => orders.list('-created_date', 80),
    enabled: enabled && alertsEnabled,
    refetchInterval: enabled && alertsEnabled ? POLL_MS : false,
    refetchIntervalInBackground: true,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!enabled || !alertsEnabled || !orderList.length) return;

    const alertable = orderList.filter(isAlertable);

    if (!initializedRef.current) {
      alertable.forEach((o) => seenRef.current.add(o.id));
      saveSeenIds(seenRef.current);
      initializedRef.current = true;
      return;
    }

    for (const order of alertable) {
      if (!seenRef.current.has(order.id)) {
        pushAlert(order);
      }
    }
  }, [orderList, enabled, alertsEnabled, pushAlert]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    return result;
  }, []);

  return {
    alerts,
    alertsEnabled,
    setAlertsEnabled,
    dismissAlert,
    dismissAll,
    requestNotificationPermission,
    notificationPermission:
      typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  };
}
