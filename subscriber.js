/*
 * Copyright (C) 2023-2024 Secure Dimensions GmbH, D-81377
 * Munich, Germany.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

var express = require('express');
const path = require('path');
const parseHttpHeader = require('parse-http-header');
const crypto = require('crypto');
const favicon = require('serve-favicon');
const { request } = require('urllib');
const querystring = require("querystring");
const url = require("url");
const bodyParser = require('body-parser');

const { config, log } = require('./settings');

// Create an express app with websocket support
var app = require('express-ws-routes')();

// Global storag for subscriptions
var subscriptions = {};

var options = {
    inflate: true,
    limit: '100kb',
    type: 'application/octet-stream'
};

app.use(bodyParser.raw(options));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.engine('html', require('ejs').renderFile);

// middleware to check the data POSTed to a callback endpoint
app.use('/callback/:topic', function (req, res, next) {
    if (['PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'].includes(req.method)) {
        return res.status(405).contentType('text').send('method not implemented');
    }

    if (req.method === 'POST') {
        if (!req.header('content-type') === undefined) {
            log.error("request has no content-type header");
            return res.status(415).contentType('text').send('content type header missing');
        }

        let content_type = parseHttpHeader(req.headers['content-type'])[0];
        log.debug(`content-type: ${content_type}`);

        if (content_type !== 'application/json') {
            log.error("request has wrong content-type: " + content_type);
            return res.status(415).contentType('text').send('content type must be `application/json`');
        }
    }
    next();
})

app.get("/", function (req, res, next) {
    log.debug("/index.html");
    
    res.render(__dirname + "/views/index.html", { wsUrl: config.root_url.replace('http', 'ws') + '/ws' });
}
);

app.use(express.static(path.join(__dirname, 'public')));

// Connction via WebSocket means a subscription
app.websocket('/ws', function (info, cb, next) {
    log.info(
        'WebSocket connect request for topic: %s using origin %s',
        info.req.query['topic'],
        info.origin
    );

    const domain = url.parse(info.origin).hostname;
    if (!config.websocket_domains.includes(domain)) {
        log.error('origin not allowed: ', domain);
        next();
    }

    if (info.req.query['topic'] === undefined) {
        log.error('no topic defined');
        next();
    }

    // Accept connections by passing a function to cb that will handle the connected websocket
    // And subscribe to the configured Hub
    cb(function (socket) {
        const hub = info.req.query['hub'];
        const topic = info.req.query['topic'];
        const lease_seconds = info.req.query['lease_seconds'] || config.lease_seconds;
        const callback = crypto.randomUUID();
        const secret = crypto.randomBytes(16).toString('hex');
        // Assing the metadata for the subscription to socket
        socket.userInfo = { 'topic': topic, 'callback': callback };

        const subscription = {
            'hub': hub,
            'topic': topic,
            'callback': callback,
            'secret': secret,
            'lease_seconds': lease_seconds,
            'socket': socket,
            'state': 'new'
        };
        // Save the subscription
        subscriptions[callback] = subscription;


        // Initiate subscribe to the configured Hub
        request(hub, {
            method: 'POST',
            followRedirect: false,
            data: {
                'hub.mode': 'subscribe',
                'hub.topic': querystring.escape(topic),
                'hub.callback': config.root_url + '/callback/' + callback,
                'hub.secret': secret,
                'hub.lease_seconds': lease_seconds
            }
        }).then(res => {
            log.debug('status: %s, body: %s, headers: %j', res.statusCode, res.data, res.headers);

            if (res.statusCode >= 300) {
                log.error('subscribe request returned status code: ', res.statusCode);
                socket.send(`subscribe request returned error: ${res.data}`);
                return;
            }
            log.info(`subscription to topic ${topic} via callback ${callback} requested`);

        }).catch(error => {
            if (error.errors !== undefined){
                error.errors.forEach(e => {
                    log.error(e);
                });
            } 
            log.error(error);
        });
    });
});

// Validation of intent
app.get('/callback/:id', function (req, res, net) {
    const callback = req.params.id;
    log.debug('callback: ', callback)

    let mode = req.query['hub.mode'] || null;
    if (mode === null) {
        return res.status(400).contentType('text').send('parameter `hub.mode` required');
    }
    mode = mode.toString("utf8").trim();
    log.info("requested mode: " + mode);

    if (!['subscribe', 'unsubscribe'].find(m => m === mode)) {
        return res.status(501).contentType('text').send('`hub.mode` not allowed: ' + mode);
    }

    let topic = req.query['hub.topic'] || null;
    if (topic === null) {
        return res.status(400).contentType('text').send('parameter hub.topic required');
    }
    topic = querystring.unescape(topic.toString("utf8").trim());
    log.debug("topic: " + topic);


    let challenge = req.query['hub.challenge'] || null;
    if (challenge !== null) {
        challenge = challenge.toString("utf8").trim();

        if (challenge.length > 200) {
            log.error("`hub.challenge` exceeds limit of 200 bytes");
            return res.status(400).contentType('text').send('parameter `hub.challenge` exceeds limit of 200 bytes');
        }
    }
    log.debug("challenge: ", challenge);

    if (mode === 'subscribe') {
        const subscription = subscriptions[callback];
        if (subscription === undefined) {
            log.error('callback does not exist: ', callback);
            return res.status(404).contentType('text').send('subscription not found for callback: ' + callback);
        }
        log.debug('info: ', subscription.topic);

        // process lease_seconds
        let lease_seconds = req.query['hub.lease_seconds'] || null;
        log.debug(`lease_seconds: ${lease_seconds}`);
        if (lease_seconds === null) {
            return res.status(400).contentType('text').send('parameter `hub.lease_seconds` required');
        }

        lease_seconds = lease_seconds.toString("utf8").trim();
        if (isFinite(lease_seconds) && Number(lease_seconds) % 1 == 0) {
            lease_seconds = Number(lease_seconds);
        } else {
            return res.status(400).contentType('text').send('parameter `hub.lease_seconds` must be a number');
        }

        if (lease_seconds < 60) {
            return res.status(400).contentType('text').send('parameter `hub.lease_seconds` must be greater than 60');
        }
        // In case the Hub has changed the lease_seconds according to own policy
        log.info('setting lease_seconds to: ', lease_seconds);

        let secret = req.query['hub.secret'] || null;
        log.debug(`secret: ${secret}`);

        if (secret !== null) {
            // update the secret
            subscription.secret = secret;
        }

        // Subscription is accepted
        log.info('subscription set to active: ', subscription.topic);
        subscription.state = 'active';
        const date = new Date();
        log.info(`starting subscription update at: ${date.toISOString()} for topic ${subscription.topic}`);
        if (subscription.cron === undefined) {
            subscription.cron = setInterval(function () {
                const date = new Date();
                log.info('cron executes at: ', date.toISOString());
                log.debug('updating subscription: ', subscription.topic);

                // Initiate subscribe to the configured Hub
                request(subscription.hub, {
                    method: 'POST',
                    followRedirect: false,
                    data: {
                        'hub.mode': 'subscribe',
                        'hub.topic': querystring.escape(subscription.topic),
                        'hub.callback': config.root_url + '/callback/' + subscription.callback,
                        'hub.secret': crypto.randomBytes(16).toString('hex'),
                        'hub.lease_seconds': lease_seconds
                    }
                }).then(res => {
                    log.debug('status: %s, body: %s, headers: %j', res.statusCode, res.data, res.headers);

                    if (res.statusCode >= 300) {
                        log.error('subscribe update request returned status code: ', res.statusCode);
                        return;
                    }

                }).catch(error => {
                    log.error(error);
                });
            }, (lease_seconds - config.lease_skew_seconds) * 1000 /*ms*/);
        }
    } else {
        const subscription = subscriptions[callback];
        log.debug('unsubscribe for subscription: ', subscription.topic);
        if ((subscription === undefined) || (subscription.state !== 'unsubscribe')) {
            log.error('callback not marked for unsubscribe: ', callback);
            return res.status(403).contentType('text').send('unsubscribe not allowed');
        }
        // Stop cron
        log.debug('stopping cron');
        clearInterval(subscription.cron);
        // Remove the subscription from the list
        delete subscriptions[callback];
    }

    res.status(200).contentType('text').send(challenge);
});

// Send the message for topic to all registered Websockets
app.post('/callback/:id', function (req, res, next) {
    const callback = req.params.id;
    log.info('message received for callback: ', callback);

    const subscription = subscriptions[callback];
    if (subscription === undefined) {
        log.debug("subscription not found. Returning 410 to Hub");
        return res.status(410).contentType('text').send();
    }

    if (subscription.secret === undefined) {
        // We can simply stream the data to the WebSocket
        log.debug('start streaming POSTed data to WebSocket');
        req.on('data', async (data) => {
            log.debug(data);
            subscription.socket.send(data);
        });
        req.on('end', async () => {
            log.debug('finished streaming POSTed data to WebSocket');
        });
    } else {
        const x_hub_signature = req.header('x-hub-signature');
        let blob = [];
        if (x_hub_signature === undefined) {
            log.error("ignoring message because X-Hub-Signature header is missing");
            return res.status(200).contentType('text').send('OK');
        }
        const [algorithm, x_hub_value] = x_hub_signature.split('=');
        let hmac = crypto.createHmac(algorithm, subscription.secret);
        log.debug('start collecting POSTed data and calculate hmac');
        req.on('data', async (data) => {
            hmac.update(data);
            blob.push(data);
        });
        req.on('end', async () => {
            const hash = hmac.digest("hex");
            log.debug('finished collecting POSTed data');
            if (hash === x_hub_value) {
                subscription.socket.send(blob[0]);
            } else {
                log.error("ignoring message because X-Hub-Signature is wrong");
            }
        });
    }

    res.status(200).contentType('text').send('OK');
});

// Using app.listen will also create a WebSocketServer
var server = app.listen(config.port, function () {
    log.info(`Subscriber listening on port ${config.port}...`);
});

// The WebSocket server instance is available as a property of the HTTP server
server.wsServer.on('connection', function (socket) {
    log.debug('sec-websocket-key: ', socket.upgradeReq.headers['sec-websocket-key']);
    log.info('connection to %s', socket.upgradeReq.url);
    socket.on("pong", function () {
        log.debug('Web socket pong');
    });
    socket.on("close", function () {
        const callback = socket.userInfo.callback;
        log.debug(`Web socket closed for topic ${callback}`);

        const subscription = subscriptions[callback];
        if (subscription === undefined) {
            return;
        }

        // Stop renewing subscriptions
        clearInterval(subscription.cron);
        // Mark subscription to be cancelled
        subscription.state = 'unsubscribe';

        // Inform the Hub to unsubscribe the callback
        request(subscription.hub,
            {
                method: 'POST',
                followRedirect: false,
                data: {
                    'hub.mode': 'unsubscribe',
                    'hub.topic': querystring.escape(socket.userInfo.topic),
                    'hub.callback': config.root_url + '/callback/' + callback
                }
            }
        ).then(res => {
            log.debug('unsubscribe response status: ', res.statusCode);

        }).catch(error => {
            log.error(error);
        });

    });
});

