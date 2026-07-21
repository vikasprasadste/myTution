import type { Role } from "@mytution/shared";

export const paletteConfig = {
  secondary: ["#EEF2F8", "#E5ECFA", "#D4DFF6", "#C3D5F6", "#B3CCF7", "#A2C2F7", "#91B8F7", "#80AEF7", "#70A5F8", "#7B63FF"],
  accent1: ["#FFFBF9", "#FFF6F3", "#FFF2EE", "#FFEDE8", "#FFE9E2", "#FFE4DC", "#FFDFD7", "#FFD8D1", "#FFD7C8", "#FFD2C5"],
  accent2: ["#FFFAF5", "#FFF6EB", "#FFF1E2", "#FFEDDB", "#FFE8CE", "#FFE4C4", "#FFDFBA", "#FEDBB1", "#FFD6A7", "#FED290"],
  accent3: ["#F7FAFF", "#F2F6FF", "#EAF1FF", "#E4EEFF", "#D6E4FF", "#BFD4FF", "#9DBDFF", "#7EA5FF", "#5F8AFF", "#3370FF"],
  accent4: ["#FDFBFE", "#FBF6FD", "#FAF2FD", "#F8EEFC", "#F6E9FB", "#F4E5FA", "#F2E1F9", "#F1DDF9", "#EFD8F8", "#EDD4F7"],
  accent5: ["#F7FCFD", "#F2FBFC", "#EEFAFB", "#EAF8FB", "#E6F7FA", "#E1F5F9", "#DDF4F8", "#D9F3F7", "#D4F1F6", "#CCEFF4"]
};

export const roleThemes: Record<Role, {
  background: string;
  surface: string;
  accent: string;
  accentStrong: string;
  text: string;
  card: string;
  cardAlt: string;
  cardSoft: string;
}> = {
  tutor: {
    background: paletteConfig.accent3[0],
    surface: paletteConfig.accent3[2],
    accent: paletteConfig.accent3[4],
    accentStrong: paletteConfig.accent3[9],
    text: paletteConfig.accent3[9],
    card: paletteConfig.accent3[1],
    cardAlt: paletteConfig.accent3[3],
    cardSoft: paletteConfig.accent3[0]
  },
  student: {
    background: paletteConfig.accent4[0],
    surface: paletteConfig.accent4[2],
    accent: paletteConfig.accent4[9],
    accentStrong: "#8F6BD8",
    text: "#4B2760",
    card: paletteConfig.accent4[1],
    cardAlt: paletteConfig.secondary[1],
    cardSoft: paletteConfig.accent1[1]
  },
  parent: {
    background: paletteConfig.accent5[0],
    surface: paletteConfig.accent5[2],
    accent: paletteConfig.accent5[9],
    accentStrong: "#1596A4",
    text: "#115E68",
    card: paletteConfig.accent5[1],
    cardAlt: paletteConfig.secondary[0],
    cardSoft: paletteConfig.accent3[1]
  }
};
