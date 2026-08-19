import startServer from "@tanstack/react-start/server-entry";
import { getDb } from "#/db/client.worker";
import { runAssessmentCleanup } from "#/server/assessmentCleanup";

export default {
	async fetch(request) {
		return await startServer.fetch(request);
	},
	async scheduled(controller, env) {
		await runAssessmentCleanup(getDb(env), {
			now: new Date(),
			scheduledAt: new Date(controller.scheduledTime),
			cron: controller.cron,
		});
	},
} satisfies ExportedHandler<Cloudflare.Env>;
