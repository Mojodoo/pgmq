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
- [x] send_batch

Reading messages
- [x] read
- [x] read_with_poll
- [ ] pop

Deleting/archiving messages
- [x] delete (single)
- [ ] delete (batch)
- [ ] purge_queue
- [x] archive (single)

Queue management
- [ ] create
- [ ] create_partitioned
- [ ] create_unlogged
- [ ] detach_archive
- [ ] drop_queue

Utilities
- [ ] set_vt
- [ ] list_queues
- [ ] metrics
- [ ] metrics_all


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

