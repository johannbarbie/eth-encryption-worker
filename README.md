# Webpacking provider-engine


```
npm install
webpack
```

## Wallet Encryption with Web Worker

This section describes how to serialize and deserialize a wallet using a webworker cross domain.

### Serialize Wallet

```javascript
  var Buffer = Lib.buffer.Buffer;
  var fastSha256 = Lib;

  var entropy = '1234567890abcdefgh1234567890ab';
  if (typeof(entropy) !== 'string' || entropy.length !== 30) {
      throw new Error('entropy must be a string of length 30');
  }
  entropy = new Buffer(entropy);
  var seed = new Buffer(fastSha256(entropy));
  var hexSeed = seed.toString('hex');
  console.log(hexSeed);
  var password = 'test9900';

  var path = 'https://s3.eu-central-1.amazonaws.com/keythereum/iframe.html?origin='+encodeURIComponent(location.origin);
  pathArray = path.split( '/' );

  window.addEventListener('message', function(evt) {
    if (evt.origin !== pathArray[0] + '//' + pathArray[2]) {
      //ignoring
      return;
    }
    if (!evt.data || evt.data.action == 'error') {
      console.log('error');
      console.dir(evt.data.error);
      return;
    }
    var data = evt.data;
    if (data.action === 'loaded') {
      console.log('worker loaded, starting export ...');

      iframe.contentWindow.postMessage({
        action: "export",
        hexSeed: hexSeed,
        password: password,
        randomBytes: crypto.getRandomValues(new Uint8Array(64))
      }, '*');
    } else if (data.action === 'progress') {
      console.log(parseInt(data.percent) + '%');
    } else if (data.action === 'exported') {
      console.log('exported');
      console.dir(data.json);
    } else {
      console.log('uknown event' + data.action);
      console.dir(data)
    }
  }, false);

  var iframe = document.createElement('iframe');
  iframe.src = path;
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
```

### Deserialize Wallet

```javascript

  var json = '{"address":"0x0735a7a806ac6fffe26318f83102d50675c95dfa","Crypto":{"cipher":"aes-128-ctr","cipherparams":{"iv":"e944473d5ecd6ef459fed5d4b9eaa947"},"ciphertext":"e933b9e9a7428d6c3562d40d49e7712c37a66156296e45f37b704603671e1404","kdf":"scrypt","kdfparams":{"dklen":32,"n":256,"r":1,"p":8,"salt":"3539d3678a96330c8d91ed6a9cf9b7487a60a72e18751b68f4014973811580e9"},"mac":"75addd112ce529c976d25445a898c8067cb31d57be40de8d5081372196db09c9"},"version":3}';

  var password = 'test9900';

  var path = 'https://s3.eu-central-1.amazonaws.com/keythereum/iframe.html?origin='+encodeURIComponent(location.origin);
  pathArray = path.split( '/' );


  window.addEventListener('message', function(evt) {
    if (evt.origin !== pathArray[0] + '//' + pathArray[2]) {
      //ignoring
      return;
    }
    if (!evt.data || evt.data.action == 'error') {
      console.log('error');
      console.dir(evt.data.error);
      return;
    }
    var data = evt.data;
    if (data.action === 'loaded') {
      console.log('worker loaded, starting import ...');
      iframe.contentWindow.postMessage({
          action: 'import',
          json: json,
          password: password,
      }, '*');
    } else if (data.action === 'progress') {
      console.log(parseInt(data.percent) + '%');
    } else if (data.action === 'imported') {
      if (data.hexSeed === null) {
        console.log('Message Authentication Code mismatch (wrong password)')
      } else {
        console.log('Wallet successfully imported: '+ data.hexSeed);
      }
    }  else {
      console.log('uknown event' + data.action);
      console.dir(data)
    }
  }, false);

  var iframe = document.createElement('iframe');
  iframe.src = path;
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
```
