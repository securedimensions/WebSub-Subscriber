# WebSub-Subscriber
This repository contains an open source implementation of a generic W3C WebSub-Subscriber. The implementation consists of two parts:

* Part 1: This is the Web-Application implemented in `index.html` which functions as the role Discovery.
* Part 2: This is the Server-side implementation which functions as the role Subscriber.

The first part is a generic Javascript-based Web-Application that demonstrates the topic discovery via an HTTP HEAD request to a publisher. The Web-App also initiates that the server-side part initiates `subscribe` and `unsubscribe` with the WebSub Hub. Finally, the Web-App displays the data received via a WebSocket that was created with the server-side.

The server-side part functions as a WebSub Subscriber as defined in the W3C WebSub Recommendation.

## Deployment
After cloning this repository, `cd` into the `docker` directory and create a `.env` file to configure the behavior of the WebSub Subscriber. See the next section Configuration for details.

To start the subscriber, simply use the command `docker-compose up -d --build`. After a successful startup, you can visit the Web-Subscriber in the Web Browser.

Please modify the `index.html` URLs as they are hard-coded and pointing to the Secure Dimensions demo deployments.

## Configuration
Using a `.env` file in the `docker` directory configures the WebSub-Subscriber

* `PORT` is the port that the subscriber starts listening. Default: 3000
* `URL` is the homepage URL for the Web-Sub Subscriber.
* `WEBSOCKET_DOMAINS` is a comma separated list of domain names that are allowed to create a WebSocket
* `LOG_LEVEL` is the log level to use. Default INFO
* `LEASE_SECONDS` is the number of seconds used with the subscribe request to the Hub as parameter `hub.lease_seconds`. **Note:** The actual `lease_seconds` value is received with the validation of intent!
* `LEASE_SKEW_SECONDS` is the number of seconds that the subscriber calls for a period subscription earlier than `hub.lease_seconds` received from the Hub with the validation of intent. For example, if `hub.lease_seconds=300` and `LEASE_SKEW_SECONDS=30`, the periodic re-new of the subscription is done after `270` seconds.
