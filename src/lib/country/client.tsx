"use client";
import { createContext, useContext } from "react";
import { IRAN_PROFILE } from "./iran";
import type { CountryProfile } from "./types";
const CountryCtx = createContext<{ country: CountryProfile; ready: boolean }>({ country: IRAN_PROFILE, ready: true });
export function CountryProvider({ children }: { children: React.ReactNode; initialProfile?: CountryProfile | null }) {
  return <CountryCtx.Provider value={{ country: IRAN_PROFILE, ready: true }}>{children}</CountryCtx.Provider>;
}
export function useCountry() { return useContext(CountryCtx); }
