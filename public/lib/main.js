import handshake from './dbus/handshake';
import unmarshalMessages from './dbus/unmarshal';
import {marshall} from 'dbus-native/lib/message';
import websocket from 'websocket-stream/stream';
import bus from 'dbus-native/lib/bus';
import {EventEmitter} from 'events';
import stampit from 'stampit';

let conn = stampit()
    .compose(stampit.convertConstructor(EventEmitter))
    .props({state: 'connected'})
    .init(function () {
      this.stream.on('error', function(err) {
        console.error(err);
        // forward network and stream errors
        this.emit('error', err);
      });

      this.stream.on('close', function() {
        this.emit('end');
      });

      /*
      this.stream.on('end', function() {
        this.emit('end');
      });*/

      unmarshalMessages(this.stream, message => {
        this.emit('message', message);
      });
    })
    .methods({
      end() {
        this.stream.end();
        return this;
      },

      message(msg) {
        this.stream.write(marshall(msg));
      }
    });

function connectDbus() {
  return new Promise((res, rej) => {
    let ws = websocket('ws://127.0.0.1:4000', 'binary');

    // Used while authenticating only.  Once authenticated, the conn
    // object handles events instead.
    function closed() {
      rej('connection closed')
    }

    ws.on('close', closed);

    handshake(ws, {}, (error, guid) => {
      ws.removeListener('close', closed);

      if (error)
        return rej(error);

      res(conn({stream: ws, guid}));
    });
  });
}

connectDbus()
  .then(conn => new bus(conn, {direct: true}))
  .then(bus => new Promise((res, rej) => {
    console.log(bus);
    bus.invokeDbus({ member: 'Hello' }, function(err, name) {
      if (err)
        return rej(err);

      bus.name = name;
      res(bus);
    })
  }))
  .then(bus => {
    window.bus = bus;
  })
  .catch(e => console.error(e));
