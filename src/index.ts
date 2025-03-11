import { SQL } from "bun";

type JSONPrimitive = string | number | boolean | null;

type JSONValue = JSONPrimitive | JSONObject | JSONArray;

type JSONObject = { [key: string]: JSONValue };

type JSONArray = JSONValue[];

type JSONSerializable = JSONValue;

type QueueMessage = {
	msg_id: string;
	read_ct: string;
	enqueued_at: Date;
	vt: Date;
	message: string;
	headers: string | null;
}

export function createClient(connectionString: string) {
	const sql = new SQL({
		url: connectionString,
	});

	return {
		$connection: sql,
		send: async (queueName: string, message: JSONSerializable, delayInSeconds: number = 0) => {
			const payload = JSON.stringify(message);
			const res = await sql`select * from pgmq.send(
				queue_name => ${queueName},
				msg	   => ${payload},
				delay      => ${delayInSeconds}
			)`.values();
			return { messageId: res[0][0] };
		},
		read: async (queueName: string, quantity: number, leaseInSeconds: number) => {
			const res = await sql`select * from pgmq.read(
				queue_name => ${queueName},
				vt         => ${leaseInSeconds},
				qty        => ${quantity}
			)`

			return res.slice(0, quantity) as QueueMessage[];
		},
		readWithPoll: async function*(queueName: string, quantity: number, leaseInSeconds: number, maxWaitTimeInSeconds: number, pollIntervalInMilliseconds: number = 100): AsyncGenerator<QueueMessage, void, unknown> {
			while (true) {
				const res = await sql`select * from pgmq.read_with_poll(
						queue_name 	 => ${queueName},
						vt	   	 => ${leaseInSeconds},
						qty	   	 => ${quantity},
						max_poll_seconds => ${maxWaitTimeInSeconds},
						poll_interval_ms => ${pollIntervalInMilliseconds}
					)`;
				const messages = res.slice(0, quantity) as QueueMessage[];
				for (const message of messages) {
					yield message;
				}
			}
		},
		pop: async (queueName: string) => {
			const res = await sql`select * from pgmq.pop(${queueName})`;
			return res[0] as QueueMessage;
		},
		archive: async (queueName: string, messageId: string) => {
			await sql`select pgmq.archive(
				queue_name => ${queueName},
				msg_id	   => ${messageId}
			)`;
		},
		delete: async (queueName: string, messageId: string) => {
			await sql`select pgmq.delete(
				queue_name => ${queueName},
				msg_id	   => ${messageId}
			)`;
		},
		purgeQueue: async (queueName: string) => {
			const res = await sql`select * from pgmq.purge_queue(${queueName})`;
			return parseInt(res[0].purge_queue);
		},
		queueManagement: {
			create: async (queueName: string) => {
				await sql`select from pgmq.create(${queueName})`;
			}
		}
	}
}
