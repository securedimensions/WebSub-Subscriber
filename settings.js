/*
MIT License

Copyright (c) 2024 Secure Dimensions

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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