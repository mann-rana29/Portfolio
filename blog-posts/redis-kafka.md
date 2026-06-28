---
title: "Pub/Sub vs Kafka"
date: "2026-06-21"
description: "This blog post explains how Redis Pub/Sub and Apache Kafka work and how they differ from each other."
image: "../assets/images/redis-kafka/redis-kafka-banner.png"
---


To understand the architecture and differences of Pub/Sub and Kafka, We will go through a real world example. It will help you understand which one is best for your own application.

## The Story
Imagine you are building a live football match betting app. Users can place bets on the matches. There can be different types of bets like guess the - winning team, exact score, number of yellow/red cards, etc.

To place a bet, user has to select any type of bet, the amount he wants to bet and complete the payment. 

When a user places a bet, the backend does this -

```
    placeBet(amount, betType) {
        paymentRepository(amount);  //saves payment in DB
        notificationService.notify(amount,betType); //notifies the user
        analyticsService.update(amount,betType); //updates analytics
    }
```

According to this function, placing a bet means peforming payment operations, notifying the user and updating the analytics.

## The Problem

The ```placeBet``` function above is tightly coupled. This means that if there is an error in any one of the services, the whole function will fail. For example, if the ```analyticsService``` is down, the user will not be able to place a bet. All the services are synchronously called which means they are dependent on each other. 

This is not good for scaling. The application cannot handle traffic spikes and downtimes of services.

## The Solution
Services should not be dependent on each other. The `paymentRepository` should be able to save the payment and return the result. It shouldn't care if `notificationService` or `analyticsService` is working or not.

Therefore, instead of calling these services synchronously, we should use a messaging system to communicate between services. 

Here comes the role of Pub/Sub or Kafka. First we will discuss about Pub/Sub.

## Pub/Sub

Pub/Sub is a messaging system where a service (producer) sends messages (events) to a channel. Any other services (subscriber) that subscribes to that channel can receive these messages. 
- Every subscriber receives the message simultaneously.
- Publisher doesn't know who the subscriber is or if it exists or not.
- Subscriber doesn't know who the publisher is or where the messages are coming from.
- Adding a new subscriber needs no change in producer or other services.

Coming back to the story, we can have `bet:placed` as a channel and when a user places a bet, the `placeBet` function will work as a producer and publishes the event to the `bet:placed` channel.

Then, `analyticsService` and `notificationService` will act as subscribers and subscribe to the `bet:placed` channel. They will receive the event and process it.

### Redis Pub/Sub Internals
1. **The Subscription Table**

    Redis maintains an internal data structure called the subscription table. It is a dictionary that maps channel names to a list of client connections subscribed to that channel.

    ```
    'bet:placed' --> [client1, client2]
     'bet:result' --> [client3, client1, client 4]
    ```

    When `PUBLISH 'bet:placed'` fires, then Redis looks up the channel in table, then iterates through the list of clients and writes message directly to each client's socket buffer.

2. **Connection State**
    
    When a client connects to Redis, it is in a "normal" state. When it subscribes to a channel, it enters a "subscriber" state. In this state, the client can only send SUBSCRIBE, PSUBSCRIBE, UNSUBSCRIBE, PUNSUBSCRIBE, PING and RESET commands. It cannot run GET, SET or any other redis commands.
    
    ```
    SUBSCRIBE    - enters subscriber state 
     UNSUBSCRIBE  - exits subscriber state 
     PSUBSCRIBE   - enters subscriber state with pattern matching 
     PUNSUBSCRIBE - exits subscriber state with pattern matching 
     PING         - sends a PONG response 
     RESET        - resets the connection 

    [pattern matching means 'bet:*' will subscribe to 'bet:placed', 'bet:result', etc.]
    ```

3. **Message Delivery**

    Redis Pub/Sub has no persistence. This means that when a producer publishes a event, it gets delivered to all currently available subscribers. If any subscriber is offline at the moment of publishing, then it will never receive that message. That message is lost.

    Redis doesn't store messages, so there is no message history. Subscribers can't retrieve old messages.

4. **What PUBLISH Returns**

    The PUBLISH command returns the number of subscribers that received the message. This is important because it lets the producer know if the message was received by any subscriber. This is how you detect that subscribers are down.

You might be wondering if Pub/Sub solves the above problem, then what is the need of Kafka. So let's imagine a situation. 
1. Let's say `notificationService` is down for 1 hour. 
2. A user places a bet. 
3. The message is published on the channel but since the subscriber is down, it never receives that message. 
4. The message is also not stored so it gets lost and the user never gets notified. 

This is not a good user experience. So to overcome these limitations of Pub/Sub Kafka was developed.

## What is Kafka?

> *Kafka is a distributed commit log.*

A commit log is an append only data structure. It is a ordered sequence of records. You can only add at the end of the file. You can read from any position and once a record is added, it can't be removed unless it expires based on time or size, etc.

Kafka takes this concept and makes it distributed. The log is split across multiple machines called brokers, replicated for fault tolerance and made readable by multiple consumers simultaneously.

### Kafka Concepts

1. #### Broker
    A kafka broker is a single kafka server. It is like a process running on a machine that stores messages and serves producers and consumers.

    It is advised to use three or more brokers for fault tolerance. For our betting app, we will use only 1 broker.

2. #### Topic
    A topic is a named category of messages. Producers write to topics. Consumers read from topics. Topics are the primary abstraction in Kafka like a table in a database but for stream of events.

    ```
    bet:placed          -->  All submitted bets will go here 
     bet:placed.retry    -->  Failed bets wait here to be retried 
     bet:placed.dlq      -->  Dead Letter Queue - Failed bets go here after max retries 
    ```

3. #### Partition
    Each topic is divided into partitions. A partition is an ordered, immutable sequence of messages. It is an individual segment of the commit log.

    ```
    Topic = 'bets:placed'
     Partition 0 : [msg 0] -> [msg 3] -> ... 
     Partition 1 : [msg 1] -> [msg 4] -> ... 
     Partition 2 : [msg 2] -> [msg 5] -> ... 
    ```

    Messages are distributed across partitions by : 
    - Message Key Hash (same key -> always same partitions)
    - Round Robin (no key -> distributed evenly)

    More partitions means more throughput potential and more scalibility.

4. #### Offset
    An offset is the position of a message within a partition. It is an incrementing integer starting at `0`. The offset is how consumers track what they have and have not read.

    ```
    Partition 0 of topic 'bet:placed' 

     Offset :  |   0   |    1   |   2   |    3  |    4   |  
               | Bet 1 |  Bet 2 | Bet 3 | Bet 4 |  Bet 5 |  
    ```

    Lets say Consumer A (NotificationService) has committed offset 3 : 
    - This means it has processed bet 1 , 2, 3, 4.
    - Next read will fetch bet 5 (offset 4)

    Now Consumer A crashes and restarts :
    - Reads commited offset from Kafka : 3
    - Resumes from offset 4
    - Bet 5 is not lost

    This is how kafka guarantees **atleast once delivery**.

5. #### Producer
    The producer is the client that publishes messages to Kafka topics. It is responsible for serializing the message, choosing the partition and handling send failures.


6. #### Consumer and Consumer Groups
    A consumer reads messages from one or more partitions. Consumer in the same consumer group share the work. Each partition is assigned to exactly one consumer in the group. This is **load balanced processing**.

    ```
    Topic : 'bet:placed' (3 partitions)        Consumer Group : 'bet-workers' 

     Partition 0              ------->                Worker Instance 1 
     Partition 1              ------->                Worker Instance 2 
     Partition 2              ------->                Worker Instance 3 
    ```
    
    When a consumer joins or leaves a group, Kafka triggers a rebalance. It reassigns partitions among available consumers. During rebalance, all consumers in the group stop processing. Rebalancing takes around 1 - 30 seconds.

7. #### Retention, Replication and Fault Tolerance
    Kafka retains messages based on time or size. Messages are not deleted when consumed they expire naturally. This allows multiple consumers to read the same topic independently and allows replaying the events.


Now that i have explained architectures of both pub/sub and kafka. It should be pretty clear how Kafka is more reliable and safe in comparison to pub/sub model. But that doesn't mean we should never use pub/sub. We should always choose the model that is best for our application according to its use cases. 

For example, we should use pub/sub for live score updates - if a user is online he should get the message and if he is offline then it's okay if he doesn't get it. On the other hand if he has placed a bet then it is important that he gets the message no matter what. In this case we should use kafka.


Hope you found this article useful! Do let me know in comments below. Also let me know if you have any questions. I will be happy to answer them.