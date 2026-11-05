import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative paths, so the same build works at the root (:8443) and under /ironclad/ on port 443.
  base: "./",
  plugins: [react(), tailwindcss()],
  server: { port: 5175 },
});
