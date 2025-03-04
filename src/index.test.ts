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
		const res = await client.readMessages("a_test_queue", 5, 10);
		expect(res.length).toBe(5);
	})
});
