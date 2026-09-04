export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSuiteAwake } = await import("./lib/suite");
    ensureSuiteAwake();
  }
}
