import startServer from "@tanstack/react-start/server-entry";
import { getDb } from "#/db/client.worker";
import { runAssessmentCleanup } from "#/server/assessmentCleanup";

export default {
	async fetch(request) {
		const response = await startServer.fetch(request);
		// HTML can embed guest results, and RPC errors can precede the handler.
		// Static assets are served separately by the assets binding.
		const privateResponse = new Response(response.body, response);
		privateResponse.headers.set("Cache-Control", "private, no-store");
		return privateResponse;
	},
	async scheduled(controller, env) {
		await runAssessmentCleanup(getDb(env), {
			now: new Date(),
			scheduledAt: new Date(controller.scheduledTime),
			cron: controller.cron,
		});
	},
} satisfies ExportedHandler<Cloudflare.Env>;
