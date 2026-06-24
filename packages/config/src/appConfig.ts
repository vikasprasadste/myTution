export const appConfig = {
  name: "myTution",
  scheme: "mytution",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  assets: {
    icon: "assets/myTution_icon.png",
    splash: "assets/myTution_splash.png"
  }
};
