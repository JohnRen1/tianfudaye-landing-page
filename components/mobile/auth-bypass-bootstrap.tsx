"use client";

import { useEffect } from "react";
import { hydrateClientAuthFromServer } from "@/lib/client-auth";

export function AuthBypassBootstrap() {
  useEffect(() => {
    void hydrateClientAuthFromServer();
  }, []);

  return null;
}
