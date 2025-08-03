import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
  },
  resolve: {
    alias: {
      "@pages": path.resolve(__dirname, "src/pages"),
      "@components": path.resolve(__dirname, "src/components"),
      "@api": path.resolve(__dirname, "src/api"),
      "@styles": path.resolve(__dirname, "src/styles"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
    },
  },
});
