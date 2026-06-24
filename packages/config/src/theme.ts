import type { Role } from "@mytution/shared";

export const roleThemes: Record<Role, {
  background: string;
  surface: string;
  accent: string;
  accentStrong: string;
  text: string;
}> = {
  tutor: {
    background: "#FEFEF7",
    surface: "#FBFBE5",
    accent: "#F3F2AA",
    accentStrong: "#9B8700",
    text: "#625900"
  },
  student: {
    background: "#FDFBFE",
    surface: "#FAF2FD",
    accent: "#EDD4F7",
    accentStrong: "#8F6BD8",
    text: "#4B2760"
  },
  parent: {
    background: "#F7FCFD",
    surface: "#EEFAFB",
    accent: "#CCEFF4",
    accentStrong: "#1596A4",
    text: "#115E68"
  }
};
