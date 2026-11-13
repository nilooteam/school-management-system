// کش سازگاری قدیمی؛ پروفایل کشور در نسخه هنرستان ثابت و فقط ایران است.
import { IRAN_PROFILE } from "./iran";
import type { CountryProfile } from "./types";
export function getCountrySync(): CountryProfile { return IRAN_PROFILE; }
export function setCountryCache(_profile: CountryProfile): void {}
export function resetCountryCache(): void {}
export function countryCacheAgeMs(): number { return Number.POSITIVE_INFINITY; }
export function isIranDefault(): boolean { return true; }
