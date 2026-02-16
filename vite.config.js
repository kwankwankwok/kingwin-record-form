import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const scriptUrl = env.VITE_GOOGLE_SCRIPT_URL || "";
  const url = scriptUrl ? new URL(scriptUrl) : null;

  // GitHub Pages serves at https://<user>.github.io/<repo>/
  const base =
    process.env.GITHUB_ACTIONS && process.env.GITHUB_REPOSITORY
      ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}/`
      : "/";

  return {
    base,
    plugins: [react()],
    server: {
      proxy: url
        ? {
          "/api/sheet": {
            target: url.origin,
            changeOrigin: true,
            secure: true,
            rewrite: () => url.pathname + url.search,
          },
        }
        : undefined,
    },
  };
});
