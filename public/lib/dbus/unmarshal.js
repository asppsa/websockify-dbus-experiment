import unmarshall from 'dbus-native/lib/unmarshall';
import constants from 'dbus-native/lib/constants';
import DBusBuffer from 'dbus-native/lib/dbuffer';
import {EventEmitter} from 'events';
import {Buffer} from 'buffer';

import headerSignature from 'dbus-native/lib/header-signature.json!json';

export default function unmarshalMessages(stream, onMessage) {
  let inHeader = true,
      chunks = [],
      emitter = new EventEmitter(),
      fieldsAndBodyLength;

  emitter.on('header', function(header) {
    let fieldsLength = header.readUInt32LE(12),
        fieldsLengthPadded = ((fieldsLength + 7) >> 3) << 3,
        bodyLength = header.readUInt32LE(4);

    fieldsAndBodyLength = fieldsLengthPadded + bodyLength;

    emitter.once('body', function(fieldsAndBody) {
      let messageBuffer = new DBusBuffer(fieldsAndBody),
          unmarshalledHeader = messageBuffer.readArray(headerSignature[0].child[0], fieldsLength),
          headerName,
          message = {};

      messageBuffer.align(3);
      message.serial = header.readUInt32LE(8)

      for (var i = 0; i < unmarshalledHeader.length; ++i) {
        headerName = constants.headerTypeName[unmarshalledHeader[i][0]];
        message[headerName] = unmarshalledHeader[i][1][1][0];
      }

      message.type  = header[1];
      message.flags = header[2];

      if (bodyLength > 0 && message.signature) {
        message.body = messageBuffer.read(message.signature);
        // var fullMessage = Buffer.concat([header, fieldsAndBody]);
        // console.log(fullMessage.toString('base64'));
      }

      onMessage(message);
    });
  });

  emitter.on('data', function(chunks) {
    if (inHeader) {
      let header = extract(16, chunks);

      if (header) {
        inHeader = false;
        emitter.emit('header', new Buffer(header));

        if (chunks.length > 0)
          emitter.emit('data', chunks);
      }        
    }
    else {
      let fieldsAndBody = extract(fieldsAndBodyLength, chunks);

      if (fieldsAndBody) {
        inHeader = true;
        emitter.emit('body', new Buffer(fieldsAndBody));

        if (chunks.length > 0)
          emitter.emit('data', chunks);
      }
    }
  });

  stream.on('data', function(data) {
    chunks.push(data);
    emitter.emit('data', chunks);
  });
};

/**
 * Returns a single ArrayBuffer containing length bytes; iff that many
 * bytes are available.
 * 
 * 'chunks' is an array of Uint8Arrays
 */
function extract(length, chunks) {
  let myChunks = [];
  let myLength = 0;

  // Pull off as many chunks as necessary
  while (myLength < length && chunks.length > 0) {
    let chunk = chunks.shift();
    myChunks.push(chunk);
    myLength += chunk.length;    
  }

  // If there's not enough for what we need, return the chunks.
  if (myLength < length) {
    let chunk;
    while (chunk = myChunks.pop()) {
      chunks.unshift(chunk);
    }

    // Return nothing
    return null;
  }

  // Return anything from the last chunk that we don't need.
  if (myLength > length) {
    // The use of Uint8Array here is needed because subarray doesn't
    // work with buffer objects in Firefox
    let lastChunk = new Uint8Array(myChunks.pop()),
        keepLength = length - myLength + lastChunk.length,
        keepChunk = lastChunk.subarray(0, keepLength),
        returnChunk = lastChunk.subarray(keepLength);

    myChunks.push(keepChunk);
    chunks.unshift(returnChunk);
  }

  let buffer = new ArrayBuffer(length);
  let view = new Uint8Array(buffer);
  let offset = 0;
  for (let chunk of myChunks) {
    view.set(chunk, offset);
    offset += chunk.length;
  }

  return buffer;
}

