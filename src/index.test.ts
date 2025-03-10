import { describe, test, expect } from "bun:test";
import { testClient as client, queueName } from "../test-setup";

describe("@mojodoo/pgmq - tests", () => {
	test("createClient - returns a db connection", async () => {
		expect(client.$connection).toBeDefined();
	});

	test("send - sends a message", async () => {
		const res = await client.send(queueName, { foo: "bar" })
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();
	});

	test("sendDelayed - sends a message", async () => {
		const res = await client.send(queueName, { foo: "bar" }, 5)
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();
	});

	test("read - reads messages", async () => {
		const res = await client.read(queueName, 1, 10);
		expect(res.length).toBe(1);
	});

	test("archive - archives the message", async () => {
		const res = await client.send(queueName, { toBeArchived: true });
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();

		await client.archive(queueName, res.messageId);
	});

	test("delete - archives the message", async () => {
		const res = await client.send(queueName, { toBeArchived: true });
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();

		await client.delete(queueName, res.messageId);
	});

});
