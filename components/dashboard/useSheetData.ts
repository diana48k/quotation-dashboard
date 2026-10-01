"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SheetPayload } from "@/lib/types";

export function useSheetData() {
  const [payload, setPayload] = useState<SheetPayload | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changedAt, setChangedAt] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const latest = useRef<SheetPayload | null>(null);
  const refresh = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch("/api/sheets", {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "ไม่สามารถโหลดข้อมูลได้");
      if (!Array.isArray(data.rows) || !Array.isArray(data.availableFields))
        throw Error("รูปแบบข้อมูลไม่ถูกต้อง");
      if (mounted.current && request.current === controller) {
        const previous = latest.current;
        const unchanged =
          previous?.fingerprint && previous.fingerprint === data.fingerprint;
        const next = unchanged
          ? { ...previous, updatedAt: data.updatedAt }
          : data;
        if (previous && !unchanged) setChangedAt(data.updatedAt);
        latest.current = next;
        setPayload(next);
        setError(null);
      }
    } catch (e) {
      if (mounted.current && request.current === controller)
        setError(
          controller.signal.aborted
            ? "การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่"
            : e instanceof Error
              ? e.message
              : "เชื่อมต่อไม่ได้",
        );
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        if (mounted.current) setBusy(false);
      }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const raw = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL_MS || 45000);
    const interval = Number.isFinite(raw) && raw >= 30000 ? raw : 45000;
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, interval);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      request.current?.abort();
      request.current = null;
    };
  }, [refresh]);
  return { payload, busy, error, changedAt, refresh };
}
