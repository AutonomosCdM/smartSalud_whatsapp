/**
 * Doctor Service Type Definitions
 */

import type { CountryCode } from "../../types";

export type Gender = "male" | "female";

export interface DoctorInfo {
  gender: Gender;
  countryCode: CountryCode;
  professionalTitle: string;
}

export interface DoctorNameInput {
  name: string;
  specialty: string;
}
