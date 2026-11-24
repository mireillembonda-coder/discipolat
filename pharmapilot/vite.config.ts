import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          supabase: ["@supabase/supabase-js"],
          ui: ["@radix-ui/react-dropdown-menu", "@radix-ui/react-dialog", "@radix-ui/react-tabs", "@radix-ui/react-tooltip", "lucide-react"],
        },
      },
    },
  },
});
