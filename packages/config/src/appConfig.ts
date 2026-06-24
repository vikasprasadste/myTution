export const appConfig = {
  name: "myTution",
  scheme: "mytution",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://mytution.onrender.com",
  assets: {
    icon: "assets/AppIcons/appstore.png",
    splash: "assets/splash-screen.png"
  }
};
