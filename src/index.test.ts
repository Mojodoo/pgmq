import { describe, test, expect } from "bun:test";
import { testClient as client, queueName } from "../test-setup";

describe("@mojodoo/pgmq - tests", () => {
	test("createClient - returns a db connection", async () => {
		expect(client.$connection).toBeDefined();
	});

	test("sendMessage - sends a message", async () => {
		const res = await client.sendMessage(queueName, { foo: "bar" })
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();
	});

	test("sendDelayedMessage - sends a message", async () => {
		const res = await client.sendDelayedMessage(queueName, { foo: "bar" }, 5)
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();
	});

	test("readMessages - reads messages", async () => {
		const res = await client.readMessages(queueName, 1, 10);
		expect(res.length).toBe(1);
	});

	test("archiveMessage - archives the message", async () => {
		const res = await client.sendMessage(queueName, { toBeArchived: true });
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();

		await client.archiveMessage(queueName, res.messageId);
	});

	test("deleteMessage - archives the message", async () => {
		const res = await client.sendMessage(queueName, { toBeArchived: true });
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();

		await client.deleteMessage(queueName, res.messageId);
	});

});
