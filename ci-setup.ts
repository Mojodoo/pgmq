import { createClient } from "./src";

const client = createClient(process.env.CONNECTION_STRING);

await client.$connection`CREATE EXTENSION pgmq;`;

process.exit();
