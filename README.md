Websockify D-Bus Experiment
===========================

This is some experimental code that attempts to allow one to talk to
[D-Bus][4] from a website using [websockify][1].

Scary warning
-------------

This code is only an experiment.  There is absolutely no security at
present on the D-Bus server that gets run.  That means pretty much any
website that you visit in the wild could open a websocket connection
to this service if they know where to look.

If you are running this, please be careful!


Setup
-----

1. Pull the websockify submodule:

   ~~~
   git submodule update --init
   ~~~

2. Run a D-Bus instance:

   ~~~
   bin/example-server
   ~~~
   
   This launches a completely unsecured D-Bus instance on TCP port
   4001, and a websockify instance on port 4000.  See
   `example/session.conf` for the config file.

3. Install dependencies

   ~~~
   npm install
   jspm install
   ~~~

3. Build the code (optional, but recommended on Firefox):

   ~~~
   gulp jspm
   ~~~

4. Run a web server:

   ~~~
   node server.js
   ~~~

5. Open http://localhost:4003/ in your browser

6. Connect something that uses D-Bus to your dummy D-Bus, for example,
   `DBUS_SESSION_BUS_ADDRESS=tcp:host=127.0.0.1,port=4001 pidgin` will
   launch [pidgin][2].

6. Open the console, and you should be able to access the bus via
   `window.bus`.  This project is making extensive use of the
   [dbus-native][3] node module, so see that project for the API to use.
   
An example using the Pidgin API:
   
~~~
bus
  .getService("im.pidgin.purple.PurpleService")
  .getObject("/im/pidgin/purple/PurpleObject", (err,service) => {
    if (err)
      return console.error(err);
    
    let purple = service.as('im.pidgin.purple.PurpleInterface');
    
    purple.PurpleAccountsGetAllActive((err, accounts) => {
      if (err)
        return console.error(err);
      
      console.log("Pidgin accounts:", accounts);
    });
  });
~~~

[1]: https://github.com/kanaka/websockify
[2]: https://developer.pidgin.im/wiki/DbusHowto
[3]: https://github.com/sidorares/node-dbus
[4]: https://dbus.freedesktop.org/
