/**
 * Constants - smartSalud v4
 * Medical specialty, workflow, and display configuration
 */

import type { OSType, CountryCode, SpecialtyTitle } from "./types";

/**
 * SPECIALTY ICON MAP - Map specialty to OS type for icon display
 * MEDICAL APPOINTMENTS (smartSalud v4):
 * windows = morbilidad (🩺)
 * ubuntu = salud_mental (🧠)
 * linux = control_cronico (💊), pausa_saludable (☕), recetas (📋)
 */
export const SPECIALTY_ICON_MAP: Record<string, OSType> = {
  // smartSalud v4 specialties
  "morbilidad": "windows",
  "salud_mental": "ubuntu",
  "control_cronico": "linux",
  "recetas": "linux",
  // Legacy medical specialties
  "cardiología": "windows",
  "cardiology": "windows",
  "dermatología": "ubuntu",
  "dermatology": "ubuntu",
  "oftalmología": "linux",
  "ophthalmology": "linux",
  "oftalmologia": "linux",
  "neurología": "linux",
  "neurology": "linux",
  "urología": "ubuntu",
  "urology": "ubuntu",
  "pediatría": "windows",
  "pediatrics": "windows",
  "medicina general": "linux",
  "general medicine": "linux",
};

/**
 * GENDER COUNTRY MAP - Map doctor gender to country code for icon display
 * us (usa icon) = Female doctor (👩‍⚕️)
 * jp (japan icon) = Male doctor (👨‍⚕️)
 */
export const GENDER_COUNTRY_MAP: Record<"female" | "male", CountryCode> = {
  female: "us",
  male: "jp",
};

/**
 * WORKFLOW STEPS - 8-step appointment confirmation process
 * Maps current_step to CPU percentage (progress indicator)
 */
export const WORKFLOW_STEPS: Record<string, number> = {
  "send_initial_reminder": 12,
  "wait_initial_response": 25,
  "process_cancellation": 37,
  "send_alternatives": 50,
  "wait_alternative_response": 62,
  "trigger_voice_call": 75,
  "wait_voice_outcome": 87,
  "escalate_to_human": 100,
};

/**
 * SPECIALTY TITLE MAP - Professional titles by specialty and gender
 * Used for doctor's professional title display (e.g., "Cardiólogo", "Dermatóloga")
 */
export const SPECIALTY_TITLE_MAP: Record<string, SpecialtyTitle> = {
  "cardiología": { male: "Cardiólogo", female: "Cardióloga" },
  "cardiology": { male: "Cardiólogo", female: "Cardióloga" },
  "dermatología": { male: "Dermatólogo", female: "Dermatóloga" },
  "dermatology": { male: "Dermatólogo", female: "Dermatóloga" },
  "oftalmología": { male: "Oftalmólogo", female: "Oftalmóloga" },
  "ophthalmology": { male: "Oftalmólogo", female: "Oftalmóloga" },
  "oftalmologia": { male: "Oftalmólogo", female: "Oftalmóloga" },
  "neurología": { male: "Neurólogo", female: "Neuróloga" },
  "neurology": { male: "Neurólogo", female: "Neuróloga" },
  "urología": { male: "Urólogo", female: "Uróloga" },
  "urology": { male: "Urólogo", female: "Uróloga" },
  "pediatría": { male: "Pediatra", female: "Pediatra" },
  "pediatrics": { male: "Pediatra", female: "Pediatra" },
  "medicina general": { male: "Médico General", female: "Médica General" },
  "general medicine": { male: "Médico General", female: "Médica General" },
};

/**
 * DEFAULT VALUES
 */
export const DEFAULT_OS_TYPE: OSType = "linux"; // Gray monitor for unknown specialties
export const DEFAULT_WORKFLOW_PROGRESS = 12; // First step (SEND_INITIAL_REMINDER)
