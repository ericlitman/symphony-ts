import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  lint: { options: { typeAware: true, typeCheck: true } },
  build: {
    // viteSingleFile handles inlining; set high limit as fallback
    assetsInlineLimit: 100000000,
  },
  test: {
    environment: "jsdom",
  },
});
