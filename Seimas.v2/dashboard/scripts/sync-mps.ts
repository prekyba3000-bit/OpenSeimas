import { syncMps } from "../src/server/lib/lrs-sync";

// Execute the sync function
syncMps()
  .then(() => {
    console.log("Script finished successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
