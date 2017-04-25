importScripts('browser/util.bundle.js');

var Buffer = Lib.buffer.Buffer;
var ethUtil = Lib.util;
var scryptsy = Lib.scryptsy;
var aes = Lib.aes;

onmessage = function(event) {

  var exportJSON = function(secret, password, callback, randomBytes) {
    if (password === undefined || password === null) {
      throw new Error('no password');
    }

    if (!randomBytes) {
      randomBytes = new Buffer(crypto.getRandomValues(new Uint8Array(32 + 16 + 16)))
    } else {
      randomBytes = new Buffer(randomBytes);
    }

    var nextRandomIndex = 0;
    var getRandomValues = function(count) {
      var result = randomBytes.slice(nextRandomIndex, nextRandomIndex + count);
      nextRandomIndex += count;
      if (result.length != count) {
        throw new Error('not enough random data');
      }
      return result;
    }

    var salt = getRandomValues(32);
    var iv = getRandomValues(16);
    var n = 65536;
    var lastProgress = 0;

    var derivedKey = scryptsy(new Buffer(password), salt, n, 1, 8, 32, function(progress) {
      var rounded = Math.round(progress.percent);
      if (lastProgress !== rounded && callback) {
        lastProgress = rounded;
        callback(progress.percent);
      }
    });

    var counter = new Lib.aes.Counter(iv);

    var aes = new Lib.aes.ModeOfOperation.ctr(derivedKey.slice(0, 16), counter);

    var ciphertext = aes.encrypt(secret);

    var result = {
      address: '0x' + ethUtil.privateToAddress(secret).toString('hex'),
      Crypto: {
        cipher: "aes-128-ctr",
        cipherparams: {
          iv: iv.toString('hex'),
        },
        ciphertext: ciphertext.toString('hex'),
        kdf: "scrypt",
        kdfparams: {
          dklen: 32,
          n: n,
          r: 1,
          p: 8,
          salt: salt.toString('hex'),
        },
        mac: ethUtil.sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertext])).toString('hex'),
      },
      version: 3,
    }

    return result;
  }

  var data = event.data;
  console.dir(data);
  if (data.action === 'export') {

    var json = exportJSON(new Buffer(data.hexSeed, 'hex'), data.password, function(percent) {
      postMessage({action: 'progress', percent: percent});
    }, data.randomBytes);

    postMessage({action: 'progress', percent: 100});

    postMessage({action: 'exported', json: json});
  }
};
