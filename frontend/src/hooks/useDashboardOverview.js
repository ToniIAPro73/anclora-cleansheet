import { useEffect, useState } from "react";
import { api } from "../lib/api";

// Reuses the same already-existing /api endpoints that HistoryView, RecipesView,
// AutomationsView, ConnectorsView and SchedulesView each already call individually.
// This hook does not add any new backend route or contract; it only aggregates
// lightweight counts/lists for the dashboard overview cards.
const ENDPOINTS = {
  executions: "/executions",
  recipes: "/recipes",
  automations: "/automations",
  connectors: "/connectors",
  schedules: "/schedules"
};

const initialState = {
  loading: true,
  executions: null,
  recipes: null,
  automations: null,
  connectors: null,
  schedules: null
};

export function useDashboardOverview() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let cancelled = false;

    const safeGet = async (path) => {
      try {
        const res = await api.get(path);
        return Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        // A null result means "no backing data available" so the caller can
        // omit the metric instead of showing a fake/zero value.
        return null;
      }
    };

    (async () => {
      const keys = Object.keys(ENDPOINTS);
      const results = await Promise.all(keys.map((k) => safeGet(ENDPOINTS[k])));
      if (cancelled) return;
      const next = { loading: false };
      keys.forEach((k, idx) => {
        next[k] = results[idx];
      });
      setState(next);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
