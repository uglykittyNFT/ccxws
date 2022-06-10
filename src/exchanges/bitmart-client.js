const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require("moment");

class BitmartClient extends BasicClient {
  /**
    Documentation:
    https://developer-pro.bitmart.com/en/spot/#websocket-subscription
   */
  constructor({ wssPath = "wss://ws-manager-compress.bitmart.com/api?protocol=1.1", watcherMs } = {}) {
    super(wssPath, "BitMart", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.debounceWait = 100;
    this._debounceHandles = new Map();
    setInterval(this._sendPing.bind(this), 15*1000);
  }

  _sendPing() {
    this._wss.send("ping");
  }

  _debounce(type, fn) {
    clearTimeout(this._debounceHandles.get(type));
    this._debounceHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  _sendSubTrades(remote_id) {
    this._debounce("spot/trade", () => {
      let args = Array.from(this._tradeSubs.keys()).map(m => `spot/trade:${m}`);
      this._wss.send(
        JSON.stringify({
          op: "subscribe",
          args: args
        })
      );
    });
  }

  _sendUnsubTrades(remote_id) {
    this._debounce("spot/trade", () => {
      let args = Array.from(this._tradeSubs.keys()).map(m => `spot/trade:${m}`);
      this._wss.send(
        JSON.stringify({
          op: "unsubscribe",
          args: args
        })
      );
    });
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msgs) {
    if(msgs == 'pong') {
      this.emit('ping');
      return;
    }
    let message = JSON.parse(msgs);

    if(message.table == 'spot/trade') {
      for(let datum of message.data) {
        let market = this._tradeSubs.get(datum.symbol);
        if(market) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);    
        }
      }
      return;
    }
  }


  _constructTrades(datum, market) {
    let { symbol, price, side, size, s_t } = datum;
    return new Trade({
      exchange: "BitMart",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: s_t,
      unix: s_t*1000,
      side,
      price,
      amount: size
    });
  }

}

module.exports = BitmartClient;

