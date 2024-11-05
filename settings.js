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
log.setLevel(process.env.LOG_LEVEL || log.levels.INFO);

module.exports = {
    "config": {
        "port": process.env.PORT || 3000,
        "root_url": process.env.URL.endsWith('/') ? process.env.URL.substring(0,process.env.URL.length-1) : process.env.URL || 'http://192.168.1.121:3000',
        "lease_seconds": process.env.LEASE_SECONDS || 300,
        "lease_skew_seconds": process.env.LEASE_SKEW_SECONDS || 10,
        "websocket_domains": process.env.WEBSOCKET_DOMAINS.split(',') || ['localhost']
    },
    log
}