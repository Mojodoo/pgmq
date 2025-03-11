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
		const message = await client.send(queueName, { foo: "bar" })
		expect(message).toBeDefined();
		expect(message.messageId).toBeString();
		const res = await client.read(queueName, 1, 10);
		expect(res.length).toBe(1);
	});

	test("pop - reads and deletes the messages", async () => {
		const res = await client.pop(queueName);
		expect(res).toBeDefined();
	});

	test("archive - archives the message", async () => {
		const res = await client.send(queueName, { toBeArchived: true });
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();

		await client.archive(queueName, res.messageId);
	});

	test("delete - deletes the message", async () => {
		const res = await client.send(queueName, { toBeArchived: true });
		expect(res).toBeDefined();
		expect(res.messageId).toBeString();

		await client.delete(queueName, res.messageId);
	});

	test("purgeQueue - purges queue of messages", async () => {
		const res = await client.purgeQueue(queueName);
		expect(res).toBeDefined();
		expect(res).toBeNumber();
	});

	test("queueManagement.create - creates a queue", async () => {
		expect(
			async () => await client.queueManagement.create("foo")
		).not.toThrowError();
	});
});
