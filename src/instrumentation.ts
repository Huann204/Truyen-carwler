export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutoCrawlerScheduler } = await import(
      "@/lib/crawler/scheduler"
    );
    startAutoCrawlerScheduler();
  }
}
