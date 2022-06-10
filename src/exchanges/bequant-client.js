const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class BequantClient extends BasicClient {
  /**
    Documentation:
    https://api.bequant.io/#about-companyname-api
   */
  constructor({ wssPath = "wss://api.bequant.io/api/3/ws/public", watcherMs } = {}) {
    super(wssPath, "Bequant", undefined, watcherMs);
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
        "method": "subscribe",
        "ch": "trades",
        "params": {
          "symbols": [remote_id]
        }
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        "method": "unsubscribe",
        "ch": "trades",
        "params": {
          "symbols": [remote_id]
        }
      })
    );
  }

  _sendSubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
          "method": "subscribe",
          "ch": "ticker/3s",
          "params": {
              "symbols": [remote_id]
          }
      })
    );
  }

  _sendUnsubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
          "method": "unsubscribe",
          "ch": "ticker/3s",
          "params": {
              "symbols": [remote_id]
          }
      })
    );
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.ch) {    
      if(message.ch == 'trades') {
        for(let symbol in message.update) {
          let market = this._tradeSubs.get(symbol);
          if(market) {
            for(let datum of message.update[symbol]) {
              let trade = this._constructTrades(datum, market);
              this.emit("trade", trade, market);
            }
          }
        }
      } else if(message.ch.startsWith('ticker')) {
        for(let symbol in message.data) {      
          let market = this._tradeSubs.get(symbol);
          if(market) {
            let ticker = this._constructTicker(message.data[symbol], market);
            this.emit("ticker", ticker, market);
          }
        }
      }
    }

  }


  _constructTrades(datum, market) {
    let { t, i, p, q, s } = datum;
    return new Trade({
      exchange: "Bequant",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: i,
      unix: t,
      side: s,
      price: p,
      amount: q
    });
  }

  _constructTicker(datum, market) {
    let { t, a, A, b, B, c, o, h, l, v, q, p, P, L } = datum;
    return new Ticker({
      exchange: "Bequant",
      base: market.base,
      quote: market.quote,
      timestamp: t,
      last: l,
      open: o,
      high: h,
      low: l,
      volume: v
    });
  }

}

module.exports = BequantClient;