import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Lexpsique",
        short_name: "Lexpsique",
        description: "Hipnose clínica e apoio psicológico — Lexpsique, Lda.",
        lang: "pt-PT",
        theme_color: "#1f2937",
        background_color: "#ffffff",
        display: "standalone",
        icons: [],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
