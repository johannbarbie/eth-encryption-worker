const crypto = require('fast-sha256')
crypto.buffer = require('buffer')

crypto.util = require('ethereumjs-util')
crypto.scryptsy = require("scryptsy")
crypto.aes = require("aes-js")

module.exports = crypto;
