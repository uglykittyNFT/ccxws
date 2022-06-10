const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class AaxClient extends BasicClient {
  /**
    Documentation:
    https://www.aax.com/apidoc/index.html#rate-limits-websocket
   */
  constructor({ wssPath = "wss://realtime.aax.com/marketdata/v2/", watcherMs } = {}) {
    super(wssPath, "AAX", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    // setInterval(this._sendPing.bind(this), 15*1000);
  }

  _sendPing() {
    this._wss.send(
      JSON.stringify({
        op: 'ping'
      })
    );
  }

  _sendPong() {
    this._wss.send(
      JSON.stringify({
        op: 'pong'
      })
    );
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        e: "subscribe",
        stream: `${remote_id}@trade`
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        e: "unsubscribe",
        stream: `${remote_id}@trade`
      })
    );
  }

  _sendSubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        e: "subscribe",
        stream: "tickers"
      })
    );
  }

  _sendUnsubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        e: "unsubscribe",
        stream: "tickers"
      })
    );
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);


    if(message.e.endsWith('@trade')) {
      let market = this._tradeSubs.get(message.e.substring(0, message.e.indexOf('@')));
      if(market) {
        let trade = this._constructTrades(message, market);
        this.emit("trade", trade, market);
      }
    } else if(message.e == 'tickers') {
      for(let datum of message.tickers) {      
        let market = this._tradeSubs.get(datum.s);
        if(market) {
          let ticker = this._constructTicker(datum, market);
          this.emit("ticker", ticker, market);
        }
      }
    }
  }


  _constructTrades(datum, market) {
    let { e, i, p, q, s, t } = datum;
    return new Trade({
      exchange: "AAX",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: i,
      unix: t,
      side: s,
      price: Math.abs(p),
      amount: q
    });
  }

  _constructTicker(datum, market) {
    let { c, h, l, o, s, v } = datum;
    return new Ticker({
      exchange: "AAX",
      base: market.base,
      quote: market.quote,
      timestamp: Date.now(),
      last: l,
      open: o,
      high: h,
      low: l,
      volume: v
    });
  }

}

module.exports = AaxClient;