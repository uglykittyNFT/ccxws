const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require("moment");

class MexcClient extends BasicClient {
  /**
    Documentation:
    https://github.com/mxcdevelop/APIDoc/blob/master/websocket/spot/websocket-api.md
   */
  constructor({ wssPath = "wss://wbs.mexc.com/raw/ws", watcherMs } = {}) {
    super(wssPath, "Mexc", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    setInterval(this._sendPing.bind(this), 5000);
  }

  _sendPing() {
    this._wss.send("ping");
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        op: "sub.deal",
        symbol: remote_id
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        op: "unsub.deal",
        symbol: remote_id
      })
    );
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msgs) {
    if(msgs == 'pong') {
      this.emit("ping");
      return;
    }

    let message = JSON.parse(msgs);

    if(message.channel == 'push.deal') {
      let market = this._tradeSubs.get(message.symbol);
      if(market) {
        for(let datum of message.data.deals) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);          
        }
      }
      return;
    }
  }


  _constructTrades(datum, market) {
    let { t, p, q, T, M } = datum;
    return new Trade({
      exchange: "MEXc",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: t,
      unix: t,
      side: T == 1 ? 'buy' : 'sell',
      price: p,
      amount: q
    });
  }

  _constructTicker(datum, market) {}
}

module.exports = MexcClient;

