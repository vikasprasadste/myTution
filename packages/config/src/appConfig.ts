export const appConfig = {
  name: "myTution",
  scheme: "mytution",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://mytution.onrender.com",
  home: {
    maxActivitiesPerCarousel: Number(process.env.EXPO_PUBLIC_HOME_CAROUSEL_MAX ?? 5),
    maxRemindersPreview: Number(process.env.EXPO_PUBLIC_HOME_REMINDERS_MAX ?? 2)
  },
  assets: {
    icon: "assets/AppIcons/appstore.png",
    splash: "assets/splash-screen.png"
  }
};
