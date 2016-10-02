import {Buffer} from 'buffer';

export default function handshake(stream, opts, cb) {
  // filter used to make a copy so we don't accidently change opts data
  var authMethods;
  if (opts.authMethods)
    authMethods = opts.authMethods;
  else
    authMethods = ['ANONYMOUS'];
  stream.write('\0');
  tryAuth(stream, authMethods.slice(), cb);
};


function hexlify(input) {
  return Buffer(input.toString(), 'ascii').toString('hex');
}

function readLine(stream, cb) {
  let chunks = [];

  stream.on('data', function reader(buf) {
    chunks.push(buf);

    if (buf[buf.length - 2] == 13 &&
        buf[buf.length - 1] == 10) {

      stream.removeListener('data', reader);
      let length = chunks
          .map(chunk => chunk.length)
          .reduce((memo, length) => memo + length, 0);

      let buffer = new ArrayBuffer(length);
      let view = new Uint8Array(buffer);
      let offset = 0;
      for (let chunk of chunks) {
        view.set(chunk, offset);
        offset += chunk.length;
      }

      cb(new Buffer(buffer, 0, length - 2));
    }
  });
}

function tryAuth(stream, methods, cb) {
  if(methods.length === 0) {
    return cb(new Error("No authentication methods left to try"));
  }

  var authMethod = methods.shift();
  console.log(authMethod);
  var id = hexlify(1);

  function beginOrNextAuth() {
    readLine(stream, function(line) {
      var ok = line.toString('ascii').match(/^([A-Za-z]+) (.*)/);
        if (ok && ok[1] === 'OK') {
          stream.write('BEGIN\r\n');
          return cb(null, ok[2]); // ok[2] = guid. Do we need it?
        } else {
          // TODO: parse error!
          if (!methods.empty)
            tryAuth(stream, methods, cb);
          else
            return cb(line);
        }
      });
  }

  switch (authMethod) {
    case 'EXTERNAL':
      stream.write('AUTH EXTERNAL ' + id + '\r\n');
      beginOrNextAuth();
      break;
    case 'ANONYMOUS':
      stream.write('AUTH ANONYMOUS \r\n');
      beginOrNextAuth();
      break;
    default:
      console.error("Unsupported auth method: " + authMethod);
      beginOrNextAuth();
      break;
  }
}
