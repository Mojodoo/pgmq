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
		sendMessage: async (queueName: string, message: JSONSerializable) => {
			const payload = JSON.stringify(message);
			const res = await sql`select * from pgmq.send(
				queue_name => ${queueName},
				msg	   => ${payload}
			)`.values();
			return { messageId: res[0][0] };
		},
		sendDelayedMessage: async (queueName: string, message: JSONSerializable, delayInSeconds: number) => {
			const payload = JSON.stringify(message);
			const res = await sql`select * from pgmq.send(
				queue_name => ${queueName},
				msg	   => ${payload},
				delay      => ${delayInSeconds}
			)`.values();
			return { messageId: res[0][0] };
		},
		readMessages: async (queueName: string, quantity: number, leaseInSeconds: number) => {
			const res = await sql`select * from pgmq.read(
				queue_name => ${queueName},
				vt         => ${leaseInSeconds},
				qty        => ${quantity}
			)`

			return res.slice(0, quantity) as QueueMessage[];
		}
	}
}
