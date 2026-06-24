export const appConfig = {
  name: "myTution",
  scheme: "mytution",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://mytution.onrender.com",
  assets: {
    icon: "assets/myTution_icon.png",
    splash: "assets/myTution_splash.png"
  }
};
