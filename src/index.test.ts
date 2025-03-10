import { describe, test, expect } from "bun:test";
import { createClient } from ".";

describe("@mojodoo/pgmq - tests", () => {
	test("createClient - returns a db connection", async () => {
		const client = createClient(process.env.CONNECTION_STRING);
		expect(client.$connection).toBeDefined();
	});

	test("sendMessage - sends a message", async () => {
		const client = createClient(process.env.CONNECTION_STRING);
		const res = await client.sendMessage("a_test_queue", { foo: "bar" })
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();
	});

	test("sendDelayedMessage - sends a message", async () => {
		const client = createClient(process.env.CONNECTION_STRING);
		const res = await client.sendDelayedMessage("a_test_queue", { foo: "bar" }, 5)
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();
	});

	test("readMessages - reads messages", async () => {
		const client = createClient(process.env.CONNECTION_STRING);
		const res = await client.readMessages("a_test_queue", 1, 10);
		expect(res.length).toBe(1);
	});

	test("archiveMessage - archives the message", async () => {
		const client = createClient(process.env.CONNECTION_STRING);
		const res = await client.sendMessage("a_test_queue", { toBeArchived: true });
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();

		await client.archiveMessage("a_test_queue", res.messageId);
	});

	test("deleteMessage - archives the message", async () => {
		const client = createClient(process.env.CONNECTION_STRING);
		const res = await client.sendMessage("a_test_queue", { toBeArchived: true });
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();

		await client.deleteMessage("a_test_queue", res.messageId);
	});

});
