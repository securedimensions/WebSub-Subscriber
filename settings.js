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

require("dotenv").config();

const log = require('loglevel');
log.setLevel(process.env.SUBSCRIBER_LOG_LEVEL || log.levels.INFO);

module.exports = {
    "config": {
        "port": process.env.SUBSCRIBER_PORT || 3000,
        "root_url": process.env.SUBSCRIBER_ROOT_URL || 'http://192.168.1.121:3000/callback/', // must have / at the end!
        "hub_url": process.env.HUB_URL || 'http://localhost:4000/api/subscriptions',
        "lease_seconds": process.env.LEASE_SECONDS || 300,
        "lease_skew_seconds": process.env.LEASE_SKEW_SECONDS || 10,
        "websocket_domains": process.env.WEBSOCKET_DOMAINS.split(',') || ['localhost']
    },
    log
}