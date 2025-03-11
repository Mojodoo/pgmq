# @mojodoo/pgmq

A library for using Postgres Message Queue with `Bun.sql`

## Getting started

To use this library you first need a Postgres instance with the PGMQ extension available.

Fastest way to do that is to run the Tembo Docker image.

```bash
docker run -d --name pgmq-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 tembo.docker.scarf.sh/tembo/pg17-pgmq:latest
```

Install this library:
```bash
bun add @mojodoo/pgmq
```

## Using the library

### API compability

Sending messages
- [x] send
- [ ] send_batch

Reading messages
- [x] read
- [x] read_with_poll
- [x] pop

Deleting/archiving messages
- [x] delete (single)
- [ ] delete (batch)
- [x] purge_queue
- [x] archive (single)

Queue management
- [x] create
- [ ] create_partitioned
- [ ] create_unlogged
- [ ] detach_archive
- [x] drop_queue

Utilities
- [ ] set_vt
- [ ] list_queues
- [ ] metrics
- [ ] metrics_all

### Import the Library

Import the `createClient` function to create a new queue client.

```typescript
import { createClient } from '@mojodoo/pgmq';
```

### Create a Client

To create a client, call `createClient` with a connection string to your database.

```typescript
const connectionString = 'your-database-connection-string';
const client = createClient(connectionString);
```

### Sending a Message

To send a message to a queue, use the `send` method. You can optionally specify a delay (in seconds) before the message is enqueued.

```typescript
const queueName = 'your-queue-name';
const message = { text: 'Hello, world!' };

// Send the message with no delay
const { messageId } = await client.send(queueName, message);

// Optionally, you can send with a delay
const delayInSeconds = 5;
const { messageId: delayedMessageId } = await client.send(queueName, message, delayInSeconds);

console.log(`Message sent with ID: ${messageId}`);
```

### Reading Messages

To read messages from a queue, use the `read` method. You can specify how many messages to read and the lease duration in seconds.

```typescript
const queueName = 'your-queue-name';
const quantity = 10; // Number of messages to read
const leaseInSeconds = 60; // Lease duration for messages

const messages = await client.read(queueName, quantity, leaseInSeconds);

for (const message of messages) {
  console.log(`Received message: ${message.message}`);
}
```

### Polling for Messages

To read messages with polling (i.e., repeatedly checking the queue for new messages), use the `readWithPoll` method. This method returns an `AsyncGenerator`, so you can use `for await...of` to consume the messages as they come in.

```typescript
const queueName = 'your-queue-name';
const quantity = 5;
const leaseInSeconds = 60;
const maxWaitTimeInSeconds = 30;
const pollIntervalInMilliseconds = 100;

// Use async generator to poll for messages
for await (const message of client.readWithPoll(
  queueName,
  quantity,
  leaseInSeconds,
  maxWaitTimeInSeconds,
  pollIntervalInMilliseconds
)) {
  console.log(`Polled message: ${message.message}`);
}
```

### Archiving a Message

To archive a message in the queue (mark it as archived), use the `archive` method. You need to provide the `queueName` and `messageId`.

```typescript
const queueName = 'your-queue-name';
const messageId = 'your-message-id';

// Archive the message
await client.archive(queueName, messageId);

console.log(`Message with ID ${messageId} archived.`);
```

### Managing Queues

You can also manage the queues by creating or dropping them using the `queueManagement` methods.

#### Creating a Queue

```typescript
const queueName = 'new-queue-name';

// Create a new queue
await client.queueManagement.create(queueName);

console.log(`Queue ${queueName} created.`);
```

#### Dropping a Queue

```typescript
const queueName = 'old-queue-name';

// Drop the queue
await client.queueManagement.dropQueue(queueName);

console.log(`Queue ${queueName} dropped.`);
```

## Example

Here’s an example of how you can send a message, read it, and then archive it:

```typescript
import { createClient } from '@mojodoo/pgmq';

const client = createClient('your-database-connection-string');

async function example() {
  const queueName = 'test-queue';
  const message = { text: 'Hello, world!' };

  // Send a message
  const { messageId } = await client.send(queueName, message);

  // Read the message
  const messages = await client.read(queueName, 1, 60);
  console.log('Read messages:', messages);

  // Archive the message
  await client.archive(queueName, messageId);
  console.log(`Message with ID ${messageId} archived.`);
}

example();
```


## Development

Install dependencies:

```bash
bun install
```

Start the PGMQ container
```bash
docker run -d --name pgmq-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 tembo.docker.scarf.sh/tembo/pg17-pgmq:latest
```

Run the tests:

```bash
bun run test
```

## License

MIT
```


