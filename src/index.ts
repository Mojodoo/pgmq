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
};

export function createClient(connectionString: string) {
	const sql = new SQL({
		url: connectionString,
	});

	return {
		/**
		 * @type {import("bun").SQL} The SQL client used to interact with the database.
		 */
		$connection: sql,
		/**
		 * Sends a message to the specified queue.
		 *
		 * @param queueName - The name of the queue to send the message to.
		 * @param message - The message to be sent, which can be any serializable JSON value.
		 * @param delayInSeconds - The delay in seconds before the message is enqueued.
		 * @returns A promise that resolves with the message ID of the sent message.
		 */
		send: async (
			queueName: string,
			message: JSONSerializable,
			delayInSeconds = 0,
		) => {
			const payload = JSON.stringify(message);
			const res = await sql`select * from pgmq.send(
				queue_name => ${queueName},
				msg	   => ${payload},
				delay      => ${delayInSeconds}
			)`.values();
			return { messageId: res[0][0] };
		},
		/**
		 * Reads messages from the specified queue.
		 *
		 * @param queueName - The name of the queue to read from.
		 * @param quantity - The number of messages to read.
		 * @param leaseInSeconds - The lease duration in seconds for the messages.
		 * @returns A promise that resolves with an array of the read messages.
		 */
		read: async (
			queueName: string,
			quantity: number,
			leaseInSeconds: number,
		) => {
			const res = await sql`select * from pgmq.read(
				queue_name => ${queueName},
				vt         => ${leaseInSeconds},
				qty        => ${quantity}
			)`;

			return res.slice(0, quantity) as QueueMessage[];
		},
		/**
		 * Reads messages from the specified queue with polling. Yields messages one by one.
		 *
		 * @param queueName - The name of the queue to read from.
		 * @param quantity - The number of messages to read.
		 * @param leaseInSeconds - The lease duration in seconds for the messages.
		 * @param maxWaitTimeInSeconds - The maximum amount of time to wait for messages, in seconds.
		 * @param pollIntervalInMilliseconds - The interval in milliseconds to wait between each poll.
		 * @returns An async generator that yields messages from the queue.
		 */
		readWithPoll: async function* (
			queueName: string,
			quantity: number,
			leaseInSeconds: number,
			maxWaitTimeInSeconds: number,
			pollIntervalInMilliseconds = 100,
		): AsyncGenerator<QueueMessage, void, unknown> {
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
		/**
		 * Pops a message from the specified queue. Note: This will delete the message instantly
		 *
		 * @param queueName - The name of the queue to pop the message from.
		 * @returns A promise that resolves with the popped message.
		 */
		pop: async (queueName: string) => {
			const res = await sql`select * from pgmq.pop(${queueName})`;
			return res[0] as QueueMessage;
		},
		/**
		 * Archives a message in the specified queue.
		 *
		 * @param queueName - The name of the queue where the message will be archived.
		 * @param messageId - The ID of the message to archive.
		 * @returns A promise that resolves once the message is archived.
		 */
		archive: async (queueName: string, messageId: string) => {
			await sql`select pgmq.archive(
				queue_name => ${queueName},
				msg_id	   => ${messageId}
			)`;
		},
		/**
		 * Deletes a message from the specified queue.
		 *
		 * @param queueName - The name of the queue from which to delete the message.
		 * @param messageId - The ID of the message to delete.
		 * @returns A promise that resolves once the message is deleted.
		 */
		delete: async (queueName: string, messageId: string) => {
			await sql`select pgmq.delete(
				queue_name => ${queueName},
				msg_id	   => ${messageId}
			)`;
		},
		/**
		 * Purges all messages from the specified queue.
		 *
		 * @param queueName - The name of the queue to purge.
		 * @returns A promise that resolves with the number of purged messages.
		 */
		purgeQueue: async (queueName: string) => {
			const res = await sql`select * from pgmq.purge_queue(${queueName})`;
			return Number.parseInt(res[0].purge_queue);
		},
		/**
		 * Queue management operations.
		 */
		queueManagement: {
			/**
			 * Creates a new queue.
			 *
			 * @param queueName - The name of the queue to create.
			 * @returns A promise that resolves once the queue is created.
			 */
			create: async (queueName: string) => {
				await sql`select from pgmq.create(${queueName})`;
			},
			/**
			 * Drops an existing queue.
			 *
			 * @param queueName - The name of the queue to drop.
			 * @returns A promise that resolves once the queue is dropped.
			 */
			dropQueue: async (queueName: string) => {
				await sql`select from pgmq.drop_queue(${queueName})`;
			},
		},
	};
}
