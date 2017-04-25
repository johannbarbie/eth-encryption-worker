importScripts('browser/util.bundle.js');

var Buffer = Lib.buffer.Buffer;
var ethUtil = Lib.util;
var scryptsy = Lib.scryptsy;
var aes = Lib.aes;


onmessage = function(event) {

  var hexSeedFromJSONVersion3 = function(password, payload, callback) {
    // Get a value from a dictionary given a path, ignoring case
    var getValue = function(path) {
      var current = payload;

      var parts = path.split('/');
      for (var i = 0; i < parts.length; i++) {
        var search = parts[i].toLowerCase();
        var found = null;
        for (var key in current) {
          if (key.toLowerCase() === search) {
            found = key;
            break;
          }
        }
        if (found === null) {
          return null;
        }
        current = current[found];
      }

      return current;
    }

    var ciphertext = new Buffer(getValue("crypto/ciphertext"), 'hex');

    var key = null;

    // Derive the key
    var kdf = getValue("crypto/kdf");
    if (kdf && kdf.toLowerCase() === "scrypt") {

      // Scrypt parameters
      var salt = new Buffer(getValue('crypto/kdfparams/salt'), 'hex');
      var N = getValue('crypto/kdfparams/n');
      var r = getValue('crypto/kdfparams/r');
      var p = getValue('crypto/kdfparams/p');
      if (!N || !r || !p) {
        throw new Error("Invalid JSON Wallet (bad kdfparams)");
      }

      // We need exactly 32 bytes of derived key
      var dkLen = getValue('crypto/kdfparams/dklen');
      if (dkLen !== 32) {
        throw new Error("Invalid JSON Wallet (dkLen != 32)");
      }
      var lastProgress = 0;

      // Derive the key, calling the callback periodically with progress updates
      var derivedKey = scryptsy(new Buffer(password), salt, N, r, p, dkLen, function(progress) {
        var rounded = Math.round(progress.percent);
        if (lastProgress !== rounded && callback) {
          lastProgress = rounded;
          callback(progress.percent);
        }
      });

      // Check the password is correct
      var mac = ethUtil.sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertext])).toString('hex')
      if (mac.toLowerCase() !== getValue('crypto/mac').toLowerCase()) {
        console.log("Message Authentication Code mismatch (wrong password)");
        return null;
      }
      key = derivedKey.slice(0, 16);

    } else {
      throw new Error("Unsupported key derivation function");
    }


    var seed = null;

    var cipher = getValue('crypto/cipher');
    if (cipher === 'aes-128-ctr') {
        var counter = new Lib.aes.Counter(new Buffer(getValue('crypto/cipherparams/iv'), 'hex'));

        var aes = new Lib.aes.ModeOfOperation.ctr(key, counter);

        seed = aes.decrypt(ciphertext);

    } else {
        throw new Error("Unsupported cipher algorithm");
    }

    return seed.toString('hex');
  };

  var hexSeedFromJSON = function(password, json, callback) {
    var payload = JSON.parse(json);

    var version = parseInt(payload.version);
    if (payload.version && parseInt(payload.version) === 3) {
      // @TODO: Check here that the address in the wallet is equal to the address in the file
      return hexSeedFromJSONVersion3(password, payload, callback);
    }

    throw new Error("Unsupported JSON wallet version");
  }

  var data = event.data;
  if (data.action === 'import') {

    try {
      var hexSeed = hexSeedFromJSON(data.password, data.json, function (percent) {
        postMessage({action: 'progress', percent: percent});
      });

      postMessage({action: 'progress', percent: 100});

      postMessage({action: 'imported', hexSeed: hexSeed});

    } catch (e) {
      console.dir(e);
      postMessage(result = {action: 'error', error: ("" + e)});
    }
  }
};
