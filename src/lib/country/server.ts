// نسخه تک‌کشوری بهار: ایران تنها پروفایل پشتیبانی‌شده است.
import { IRAN_PROFILE } from "./iran";
import type { CountryProfile } from "./types";
export async function getActiveCountry(): Promise<CountryProfile> { return IRAN_PROFILE; }
export async function refreshCountryCache(): Promise<CountryProfile> { return IRAN_PROFILE; }
export function invalidateCountryCache(): void {}
export async function getActiveCountryPublic(): Promise<CountryProfile> { return IRAN_PROFILE; }
