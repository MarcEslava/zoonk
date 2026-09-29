import { type MetadataRoute } from "next";

/**
 * Makes the web app installable. On iPhone, web push only reaches a site added
 * to the home screen, so reminders there depend on this manifest. It opens on
 * My Courses because that is where assigned training and the habit live.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#ffffff",
    display: "standalone",
    icons: [
      { sizes: "any", src: "/icon.svg", type: "image/svg+xml" },
      { sizes: "256x256", src: "/apple-icon.png", type: "image/png" },
    ],
    name: "Zoonk",
    short_name: "Zoonk",
    start_url: "/my",
    theme_color: "#ffffff",
  };
}
