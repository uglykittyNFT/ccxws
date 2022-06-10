const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class AscendexClient extends BasicClient {
  /**
    Documentation:
    https://ascendex.github.io/ascendex-pro-api/#channel-market-trades
   */
  constructor({ wssPath = "wss://ascendex.com/1/api/pro/v1/stream", watcherMs } = {}) {
    super(wssPath, "Ascendex", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    setInterval(this._sendPing.bind(this), 15*1000);
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
        op: "sub", 
        ch: `trades:${remote_id}`,
        id: ++this.id
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        op: "unsub", 
        ch: `trades:${remote_id}`
      })
    );
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.m == 'ping') {
      this._sendPong();
      this.emit("ping");
    } else if(message.m == 'pong') {
      this.emit("ping");
    } else if(message.m == 'trades') {
      let market = this._tradeSubs.get(message.symbol);
      if(market) {
        for(let datum of message.data) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    }
  }

  _constructTrades(datum, market) {
    let { p, q, ts, bm, seqnum } = datum;
    return new Trade({
      exchange: "Ascendex",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: seqnum.toString(),
      unix: ts,
      side: (bm ? 'buy' : 'sell'),
      price: p,
      amount: q
    });
  }

}

module.exports = AscendexClient;