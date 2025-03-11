import { afterAll, beforeAll } from "bun:test";

import { createClient } from "./src";

export const testClient = createClient(process.env.CONNECTION_STRING);
export const queueName = "a_test_queue";

beforeAll(async () => {
	await testClient.$connection`select from pgmq.create(${queueName})`;
});

afterAll(async () => {
	await testClient.$connection`select from pgmq.drop_queue(${queueName})`;
});
