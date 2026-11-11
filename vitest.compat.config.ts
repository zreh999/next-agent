import { fileURLToPath } from "node:url";

// Same assertions as the default config. Native config loading avoids Vite's
// Windows drive-resolution subprocess on hosts that restrict child processes.
export default {
  resolve: {
    preserveSymlinks: true,
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    pool: "threads",
    maxWorkers: 1
  }
};
