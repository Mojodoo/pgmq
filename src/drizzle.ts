import { Param, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/bun-sql";

export type Db = ReturnType<typeof drizzle>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Client = Db | Tx;

export type PGMQMessage<T> = {
	msg_id: string;
	read_ct: number;
	enqueued_at: Date;
	vt: Date;
	message: T | null;
	headers: object | null;
};

export function createClient<QueueEventMap extends Record<string, unknown>>() {
	type QueueName = keyof QueueEventMap & string;

	return (client: Client) => ({
		send: async <Q extends QueueName>(
			queueName: Q,
			events: QueueEventMap[Q] | QueueEventMap[Q][],
			delay: number | Date = 0,
		) => {
			const eventArray = Array.isArray(events) ? events : [events];

			const delayType = typeof delay === "number" ? "int" : "timestamp";

			if (eventArray.length < 1) {
				return;
			}

			if (eventArray.length === 1) {
				await client.execute(sql`
					SELECT * from pgmq.send(
						queue_name  => ${queueName},
						msg         => ${new Param(eventArray[0])},
						delay       => ${delay}::${sql.raw(delayType)}
					);
				`);

				return;
			}

			await client.execute(sql`
				SELECT * from pgmq.send_batch(
					queue_name  => ${queueName},
					msgs        => ${sql.raw(`ARRAY[${eventArray.map((m) => `'${JSON.stringify(m)}'`).join(",")}]::jsonb[]`)},
					delay       => ${delay}::${sql.raw(delayType)}
				);
			`);
		},
		archive: async (queueName: QueueName, msgIdOrMsgIds: string | string[]) => {
			const msgIdArray = Array.isArray(msgIdOrMsgIds)
				? msgIdOrMsgIds
				: [msgIdOrMsgIds];

			if (msgIdArray.length < 1) {
				return;
			}

			if (msgIdArray.length === 1) {
				await client.execute(sql`
					SELECT * from pgmq.archive(
						queue_name  => ${queueName},
						msg_id       => ${msgIdArray[0]}
					);
				`);
				return;
			}
		},
		poll: async function* <Q extends QueueName>(
			queueName: Q,
			vt: number,
			qty = 1,
			maxPollSeconds = 5,
			pollIntervalMs = 100,
		) {
			while (true) {
				const result = await client.execute(sql`
					SELECT * FROM pgmq.read_with_poll(
						queue_name => ${queueName},
						vt => ${vt},
						qty => ${qty},
						max_poll_seconds => ${maxPollSeconds},
						poll_interval_ms => ${pollIntervalMs}
					);
				`);

				for (const msg of result) {
					yield msg as PGMQMessage<QueueEventMap[Q]>;
				}
			}
		},
	});
}
