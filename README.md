# event-persister
This lambda connects to the `kahula-events-{env}` bus and persists all the relevant events passing on that bus.
  
There is a tiny bit of logic in the event-persister.  
If an event matches the pattern `*UpdatedEvent`, then the event-persister emits a follow up `ValidatableEvent` with the source events `DOMAIN` applied.

If an event matches the pattern `*ValidatedEvent`, then the event-persister emits a follow up `IndexableEvent` with the source events `DOMAIN` applied.

## Event Persister
This application connects to the `kahula-events-{env}` bus and persists all the events passing on that bus.

### Architecture

All the events arriving to the event-bus will be route to two places:
1. the event-persister lambda
2. the kinesis firehose delivery stream

The lambda(1) will do some computation and persist the event on DynamoDB (table mbocdp-events-{env})

The Firehose stream will generate batches of events in one single file, and push them to the s3 bucket.

Flow:
```

 +----------------\                 +-------------------------+                            +----------------|   
 |kahula-events-{env} \  ------->   |kahula-event-persister-{env}|    FollowUp Event       |kahula-event--{env}|
 | event bus       /                | lambda                  |      ------------------->  | event bus      |
 +----------------/                 +-------------------------+                            +----------------|  
         |                                  |
         v                                  v
+--------------------------+      +-----------------------------+
| kahula-events-{env}      |      | kahula-events-{env}         |
| firehose stream           |      | dynamo table                |    
+--------------------------+      +-----------------------------+
               |
               v
   +---------------------------+
   | batch: 128 MB or 900 secs |
   +---------------------------+
                |
                v
   +--------------------------+
   | kahula-events-{env}      |
   | s3 bucket                |
   +--------------------------+
    
```

DynamoDB event indexing:
```
|unique_id | payload_hash | mbocdp_id | aws_id | saga_id | event_name | timestamp | domain | source | payload | 
---------------------------------------------------------------------------------------------------------------
|          | w/o saga     |           | id on  |         | simple     |           |        |        |         |
|          | and time     |           | bus    |         | name       |           |        |        |         |
```


