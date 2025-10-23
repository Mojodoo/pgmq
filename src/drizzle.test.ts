import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { createClient } from "./drizzle";

const queueName = "drizzle_test_queue";
const connectionString =
	process.env.CONNECTION_STRING ||
	"postgres://postgres:postgres@localhost:5432/postgres";
const db = drizzle(connectionString);

type QueueEventMap = {
	[queueName]:
		| { type: "email"; to: string; subject: string }
		| { type: "sms"; phoneNumber: string; message: string };
};

const pgmq = createClient<QueueEventMap>();

beforeAll(async () => {
	await db.execute(sql`select from pgmq.create(${queueName})`);
});

afterAll(async () => {
	await db.execute(sql`select from pgmq.drop_queue(${queueName})`);
});

describe("@mojodoo/pgmq/drizzle - tests", () => {
	test("send - sends a single message", async () => {
		await pgmq(db).send(queueName, {
			type: "email",
			to: "test@example.com",
			subject: "Test",
		});

		const messages = await db.execute(
			sql`SELECT * FROM pgmq.read(${queueName}, 10, 1)`,
		);
		expect(messages.length).toBeGreaterThan(0);
	});

	test("send - sends batch messages", async () => {
		// Purge queue first to ensure clean state
		await db.execute(sql`SELECT pgmq.purge_queue(${queueName})`);

		await pgmq(db).send(queueName, [
			{ type: "email", to: "user1@example.com", subject: "Test 1" },
			{ type: "email", to: "user2@example.com", subject: "Test 2" },
		]);

		const messages = await db.execute(
			sql`SELECT * FROM pgmq.read(${queueName}, 10, 10)`,
		);
		expect(messages.length).toBeGreaterThanOrEqual(2);
	});

	test("send - sends with delay (seconds)", async () => {
		await pgmq(db).send(
			queueName,
			{ type: "sms", phoneNumber: "+1234567890", message: "Delayed" },
			5,
		);

		// Message should not be immediately available
		const messages = await db.execute<{
			message?: { phoneNumber?: string };
		}>(sql`SELECT * FROM pgmq.read(${queueName}, 10, 1)`);
		const delayedMsg = messages.find(
			(m) => m.message?.phoneNumber === "+1234567890",
		);
		expect(delayedMsg).toBeUndefined();
	});

	test("send - sends with delay (timestamp)", async () => {
		const futureDate = new Date(Date.now() + 10000); // 10 seconds from now
		await pgmq(db).send(
			queueName,
			{ type: "sms", phoneNumber: "+9999999999", message: "Future" },
			futureDate,
		);

		const messages = await db.execute<{
			message?: { phoneNumber?: string };
		}>(sql`SELECT * FROM pgmq.read(${queueName}, 10, 1)`);
		const delayedMsg = messages.find(
			(m) => m.message?.phoneNumber === "+9999999999",
		);
		expect(delayedMsg).toBeUndefined();
	});

	test("archive - archives a single message", async () => {
		await pgmq(db).send(queueName, {
			type: "email",
			to: "archive@example.com",
			subject: "Archive me",
		});

		const messages = await db.execute<{ msg_id: string }>(
			sql`SELECT * FROM pgmq.read(${queueName}, 1, 10)`,
		);
		expect(messages.length).toBeGreaterThan(0);

		const msgId = messages[0].msg_id;
		await pgmq(db).archive(queueName, msgId);

		// Verify message is archived (check archive table)
		const archived = await db.execute(
			sql`SELECT * FROM pgmq.${sql.raw(`a_${queueName}`)} WHERE msg_id = ${msgId}`,
		);
		expect(archived.length).toBe(1);
	});

	test("archive - handles empty array", async () => {
		await pgmq(db).archive(queueName, []);
		// Should not throw
	});

	test("poll - yields messages", async () => {
		await pgmq(db).send(queueName, {
			type: "email",
			to: "poll@example.com",
			subject: "Poll test",
		});

		const generator = pgmq(db).poll(queueName, 10, 1, 1, 100);
		const result = await generator.next();

		expect(result.done).toBe(false);
		expect(result.value).toBeDefined();
		expect(result.value.message).toBeDefined();
		expect(result.value.msg_id).toBeDefined();
	});

	test("works within transaction", async () => {
		await db.transaction(async (tx) => {
			await pgmq(tx).send(queueName, {
				type: "email",
				to: "tx@example.com",
				subject: "Transaction test",
			});
		});

		const messages = await db.execute<{
			message?: { to?: string };
		}>(sql`SELECT * FROM pgmq.read(${queueName}, 10, 1)`);
		const txMsg = messages.find((m) => m.message?.to === "tx@example.com");
		expect(txMsg).toBeDefined();
	});

	test("type discrimination works correctly", async () => {
		// Purge queue first to ensure clean state
		await db.execute(sql`SELECT pgmq.purge_queue(${queueName})`);

		await pgmq(db).send(queueName, [
			{ type: "email", to: "test@example.com", subject: "Email" },
			{ type: "sms", phoneNumber: "+1234567890", message: "SMS" },
		]);

		const messages = await db.execute<{
			message?: QueueEventMap[typeof queueName];
		}>(sql`SELECT * FROM pgmq.read(${queueName}, 10, 10)`);

		const emailMsg = messages.find((m) => m.message?.type === "email");
		const smsMsg = messages.find((m) => m.message?.type === "sms");

		expect(emailMsg).toBeDefined();
		expect(smsMsg).toBeDefined();

		if (emailMsg?.message && emailMsg.message.type === "email") {
			expect(emailMsg.message.to).toBeDefined();
			expect(emailMsg.message.subject).toBeDefined();
		}

		if (smsMsg?.message && smsMsg.message.type === "sms") {
			expect(smsMsg.message.phoneNumber).toBeDefined();
			expect(smsMsg.message.message).toBeDefined();
		}
	});
});
