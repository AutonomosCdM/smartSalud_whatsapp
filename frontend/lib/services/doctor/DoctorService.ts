/**
 * Doctor Service - Business logic for doctor information
 * Extracted from appointmentMapper.ts
 */

import type { Gender, DoctorInfo, DoctorNameInput } from "./types";
import type { CountryCode } from "../../types";
import { GENDER_COUNTRY_MAP, SPECIALTY_TITLE_MAP } from "../../constants";

/**
 * DoctorService - Stateless service for doctor-related business logic
 * All methods are pure functions with no side effects
 */
export class DoctorService {
  /**
   * Detect doctor gender from name and Dra./Dr. prefix
   *
   * Rules:
   * 1. Explicit prefix: "Dra." = female, "Dr." = male
   * 2. Spanish female names end in 'a', 'ía', or 'ia'
   * 3. Default to male if no pattern matches
   *
   * Examples:
   * - "Dra. María González" → female (explicit prefix)
   * - "Dr. Carlos Ruiz" → male (explicit prefix)
   * - "María López" → female (name ending)
   * - "Carlos Martínez" → male (default)
   *
   * Extracted from: appointmentMapper.ts lines 27-44
   */
  static detectGender(doctorName: string): Gender {
    const normalized = doctorName.toLowerCase().trim();

    // Check for explicit Dra./Dr. prefix
    if (normalized.startsWith("dra.")) return "female";
    if (normalized.startsWith("dr.")) return "male";

    // Extract name after Dr./Dra.
    const nameOnly = normalized
      .replace(/^dra?\.\s*/, "")
      .split(" ")[0]
      .trim();

    // Female name patterns in Spanish
    const femaleEndings = ["a", "ía", "ia"];
    const isFemale = femaleEndings.some((ending) => nameOnly.endsWith(ending));

    return isFemale ? "female" : "male";
  }

  /**
   * Map doctor gender to country code for icon display
   *
   * Mapping:
   * - Female doctor → "us" (USA icon represents 👩‍⚕️)
   * - Male doctor → "jp" (Japan icon represents 👨‍⚕️)
   *
   * Extracted from: appointmentMapper.ts lines 54-57
   */
  static getGenderCountryCode(doctorName: string): CountryCode {
    const gender = this.detectGender(doctorName);
    return GENDER_COUNTRY_MAP[gender];
  }

  /**
   * Get professional title based on specialty and gender
   *
   * Returns gendered professional title (e.g., "Cardiólogo"/"Cardióloga")
   * Falls back to "Médico"/"Médica" for unknown specialties
   *
   * Extracted from: appointmentMapper.ts lines 122-131
   */
  static getProfessionalTitle(specialty: string, gender: Gender): string {
    const normalized = specialty.toLowerCase().trim();
    const titles = SPECIALTY_TITLE_MAP[normalized];

    if (!titles) {
      return gender === "female" ? "Médica" : "Médico";
    }

    return gender === "female" ? titles.female : titles.male;
  }

  /**
   * Get visual description for doctor gender
   *
   * Converts country code back to readable gender label
   * Used for UI display purposes
   *
   * Extracted from: appointmentMapper.ts lines 206-215
   */
  static getDoctorGenderLabel(countryCode: CountryCode): string {
    switch (countryCode) {
      case "us":
        return "Médica";
      case "jp":
        return "Médico";
      default:
        return "Doctor";
    }
  }

  /**
   * Parse complete doctor information
   *
   * Combines all doctor-related business logic into single operation
   * Returns all doctor metadata needed for UI display
   *
   * New method - orchestrates existing logic
   */
  static parseDoctorInfo(input: DoctorNameInput): DoctorInfo {
    const gender = this.detectGender(input.name);
    const countryCode = GENDER_COUNTRY_MAP[gender];
    const professionalTitle = this.getProfessionalTitle(input.specialty, gender);

    return {
      gender,
      countryCode,
      professionalTitle,
    };
  }
}
