---
title: "Pub/Sub vs Kafka"
date: "2026-06-21"
description: "This blog post explains how Redis Pub/Sub and Apache Kafka work and how they differ from each other."
image: "../assets/images/redis-kafka/redis-kafka-logos.png"
---


To understand the architecture and differences of Pub/Sub and Kafka, We will go through a real world example. It will help you understand which one is best for your own application.

## The Story
Imagine you are building a live football match betting app. Users can place bets on the matches. Whenever there is a live match, users place bets on the match. There can be different types of bets like guess the - winning team, exact score, number of yellow/red cards, etc.

To place a bet, user has to select any type of bet, the amount he wants to bet and complete the payment. 

When a user places a bet, the backend does this -

```
    placeBet(amount, betType) {
        paymentService.transaction(amount);  //performs payment
        notificationService.notify(amount,betType); //notifies the user
        analyticsService.update(amount,betType); //updates analytics
    }
```

According to this function, placing a bet means peforming payment operations, notifying the user and updating the analytics.

## The Problem

The ```placeBet``` function above is tightly coupled. This means that if there is an error in any one of the services, the whole function will fail. For example, if the ```analyticsService``` is down, the user will not be able to place a bet. All the services are synchronously called which means they are dependent on each other. 

This is not good for scaling. The application cannot handle traffic spikes and downtimes of services.

## The Solution
Services should not be dependent on each other. The `paymentService` should be able to process the payment and return the result. It shouldn't care if `notitificationService` or `analyticsService` is working or not.

Therefore, instead of calling these services synchronously, we should use a messaging system to communicate between services. 