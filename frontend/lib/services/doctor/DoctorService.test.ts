/**
 * DoctorService Tests
 */

import { DoctorService } from "./DoctorService";
import type { Gender } from "./types";

describe("DoctorService", () => {
  describe("detectGender", () => {
    it("detects female from explicit Dra. prefix", () => {
      expect(DoctorService.detectGender("Dra. María González")).toBe("female");
      expect(DoctorService.detectGender("DRA. PATRICIA RUIZ")).toBe("female");
    });

    it("detects male from explicit Dr. prefix", () => {
      expect(DoctorService.detectGender("Dr. Carlos Martínez")).toBe("male");
      expect(DoctorService.detectGender("DR. JUAN LÓPEZ")).toBe("male");
    });

    it("detects female from Spanish name endings", () => {
      // Names ending in 'a'
      expect(DoctorService.detectGender("María González")).toBe("female");
      expect(DoctorService.detectGender("Ana López")).toBe("female");
      expect(DoctorService.detectGender("Laura Martínez")).toBe("female");
      expect(DoctorService.detectGender("Rosa Fernández")).toBe("female");

      // Names ending in 'ía'
      expect(DoctorService.detectGender("María José")).toBe("female");

      // Names ending in 'ia'
      expect(DoctorService.detectGender("Patricia Ruiz")).toBe("female");
    });

    it("detects male from Spanish name patterns", () => {
      expect(DoctorService.detectGender("Carlos Ruiz")).toBe("male");
      expect(DoctorService.detectGender("Roberto Fernández")).toBe("male");
      expect(DoctorService.detectGender("Francisco López")).toBe("male");
      expect(DoctorService.detectGender("Juan Martínez")).toBe("male");
    });

    it("handles edge cases", () => {
      // Empty string
      expect(DoctorService.detectGender("")).toBe("male");

      // Single name
      expect(DoctorService.detectGender("María")).toBe("female");
      expect(DoctorService.detectGender("Carlos")).toBe("male");

      // Multiple spaces
      expect(DoctorService.detectGender("  Dra.   María   González  ")).toBe("female");
    });
  });

  describe("getGenderCountryCode", () => {
    it("returns 'us' for female doctors", () => {
      expect(DoctorService.getGenderCountryCode("Dra. María González")).toBe("us");
      expect(DoctorService.getGenderCountryCode("Ana López")).toBe("us");
    });

    it("returns 'jp' for male doctors", () => {
      expect(DoctorService.getGenderCountryCode("Dr. Carlos Martínez")).toBe("jp");
      expect(DoctorService.getGenderCountryCode("Juan López")).toBe("jp");
    });
  });

  describe("getProfessionalTitle", () => {
    const testCases: Array<{ specialty: string; gender: Gender; expected: string }> = [
      // Cardiología
      { specialty: "Cardiología", gender: "male", expected: "Cardiólogo" },
      { specialty: "cardiología", gender: "female", expected: "Cardióloga" },
      { specialty: "cardiology", gender: "male", expected: "Cardiólogo" },

      // Dermatología
      { specialty: "Dermatología", gender: "male", expected: "Dermatólogo" },
      { specialty: "dermatología", gender: "female", expected: "Dermatóloga" },

      // Oftalmología
      { specialty: "Oftalmología", gender: "male", expected: "Oftalmólogo" },
      { specialty: "oftalmología", gender: "female", expected: "Oftalmóloga" },
      { specialty: "oftalmologia", gender: "male", expected: "Oftalmólogo" },

      // Neurología
      { specialty: "Neurología", gender: "male", expected: "Neurólogo" },
      { specialty: "neurología", gender: "female", expected: "Neuróloga" },

      // Urología
      { specialty: "Urología", gender: "male", expected: "Urólogo" },
      { specialty: "urología", gender: "female", expected: "Uróloga" },

      // Pediatría (gender-neutral)
      { specialty: "Pediatría", gender: "male", expected: "Pediatra" },
      { specialty: "pediatría", gender: "female", expected: "Pediatra" },

      // Unknown specialty
      { specialty: "Unknown Specialty", gender: "male", expected: "Médico" },
      { specialty: "Unknown Specialty", gender: "female", expected: "Médica" },
    ];

    testCases.forEach(({ specialty, gender, expected }) => {
      it(`returns "${expected}" for ${specialty} (${gender})`, () => {
        expect(DoctorService.getProfessionalTitle(specialty, gender)).toBe(expected);
      });
    });
  });

  describe("getDoctorGenderLabel", () => {
    it("returns 'Médica' for US country code", () => {
      expect(DoctorService.getDoctorGenderLabel("us")).toBe("Médica");
    });

    it("returns 'Médico' for JP country code", () => {
      expect(DoctorService.getDoctorGenderLabel("jp")).toBe("Médico");
    });

    it("returns 'Doctor' for other country codes", () => {
      expect(DoctorService.getDoctorGenderLabel("fr")).toBe("Doctor");
      expect(DoctorService.getDoctorGenderLabel("de")).toBe("Doctor");
    });
  });

  describe("parseDoctorInfo", () => {
    it("parses complete doctor information for female doctor", () => {
      const result = DoctorService.parseDoctorInfo({
        name: "Dra. María González",
        specialty: "Cardiología",
      });

      expect(result).toEqual({
        gender: "female",
        countryCode: "us",
        professionalTitle: "Cardióloga",
      });
    });

    it("parses complete doctor information for male doctor", () => {
      const result = DoctorService.parseDoctorInfo({
        name: "Dr. Carlos Ruiz",
        specialty: "Dermatología",
      });

      expect(result).toEqual({
        gender: "male",
        countryCode: "jp",
        professionalTitle: "Dermatólogo",
      });
    });

    it("handles unknown specialty", () => {
      const result = DoctorService.parseDoctorInfo({
        name: "Dra. Patricia López",
        specialty: "Unknown",
      });

      expect(result).toEqual({
        gender: "female",
        countryCode: "us",
        professionalTitle: "Médica",
      });
    });
  });
});
