import { schedules } from "@trigger.dev/sdk/v3";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const cleanupFailedDocuments = schedules.task({
  id: "cleanup-failed-documents",
  cron: "0 3 * * *", // Run daily at 3 AM
  maxDuration: 60,
  run: async () => {
    // Delete documents that have been stuck in PROCESSING for more than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const stuckDocs = await prisma.document.updateMany({
      where: {
        status: "PROCESSING",
        updatedAt: { lt: oneHourAgo },
      },
      data: { status: "FAILED" },
    });

    // Delete documents that failed more than 7 days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const oldFailedDocs = await prisma.document.deleteMany({
      where: {
        status: "FAILED",
        updatedAt: { lt: sevenDaysAgo },
      },
    });

    return {
      markedFailed: stuckDocs.count,
      deletedOldFailures: oldFailedDocs.count,
    };
  },
});
