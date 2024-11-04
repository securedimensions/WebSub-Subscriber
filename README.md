# WebSub-Subscriber

## Configuration
Using a `.env` file in the `docker` directory configures the WebSub-Subscriber

* `WEBSOCKET_DOMAINS` is a comma separated list of domain names that are allowed to create a WebSocket
* `WEBSOCKET_URL` is the URL that the `index.html` uses to establish a WebSocket. Important is to use the correct WebSocket protocol like `ws` for `http` and `wss` for `https` service deployments. The URL needs to end with `/ws`.
* `PORT` is the port that the subscriber starts listening. Default: 3000
* `CALLBACK_URL` is the URL base for all callback URLs. It needs to end with `/callback`.
* `LOG_LEVEL` is the log level to use. Default INFO
* `LEASE_SECONDS` is the number of seconds used with the subscribe request to the Hub as parameter `hub.lease_seconds`. **Note:** The actual `lease_seconds` value is received with the validation of intent!
* `LEASE_SKEW_SECONDS` is the number of seconds that the subscriber calls for a period subscription earlier than `hub.lease_seconds` received from the Hub with the validation of intent. For example, if `hub.lease_seconds=300` and `LEASE_SKEW_SECONDS=30`, the periodic re-new of the subscription is done after `270` seconds.
