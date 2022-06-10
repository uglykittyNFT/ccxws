const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require("moment");

class ZtClient extends BasicClient {
  /**
    Documentation:
    
   */
  constructor({ wssPath = "wss://www.ztb.im/ws", watcherMs } = {}) {
    super(wssPath, "ZT", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    this.debouceTimeoutHandles = new Map();
    this.debounceWait = 200;
  }

  /**
    Debounce is used to throttle a function that is repeatedly called. This
    is applicable when many calls to subscribe or unsubscribe are executed
    in quick succession by the calling application.
   */
  _debounce(type, fn) {
    clearTimeout(this.debouceTimeoutHandles.get(type));
    this.debouceTimeoutHandles.set(type, setTimeout(fn, this.debounceWait));
  }

  /**
    This method is called by each of the _send* methods.  It uses
    a debounce function on a given key so we can batch send the request
    with the active symbols. We also need to convert the rest symbols
    provided by the caller into websocket symbols used by the Kraken
    ws server.

    @param {string} debounceKey unique key for the caller so each call
    is debounced with related calls
    @param {Map} subMap subscription map storing the current subs
    for the type, such as _tickerSubs, _tradeSubs, etc.
    @param {boolean} subscribe true for subscribe, false for unsubscribe
    @param {string} subName the subscription name passed to the
    JSON-RPC call
   */
  _debounceSend(debounceKey, subMap, subscribe) {
    this._debounce(debounceKey, () => {
      if (!this._wss) return;
      let symbols = Array.from( subMap.keys() );
      let id = ++this.id;
      this._wss.send(
        JSON.stringify(
          subscribe ? {
            method: debounceKey,
            id: id,
            params: symbols
          } : { method: debounceKey }
        )
      );
    });
  }

  _sendSubTrades() {
    this._debounceSend("deals.subscribe", this._tradeSubs, true);
  }

  _sendUnsubTrades() {
    this._debounceSend("deals.unsubscribe", this._tradeSubs, false);
  }

  _sendSubTicker() {
    this._debounceSend("state.subscribe", this._tickerSubs, true);
  }

  _sendUnsubTicker() {
    this._debounceSend("state.unsubscribe", this._tickerSubs, false);
  }

  _onMessage(msgs) {
    let message = JSON.parse(msgs);

    if(message.error) {
      this.emit("error", message.error);
      return;
    }

    if(message.method == 'deals.update') {
      let remote_id = message.params[0];
      let market = this._tradeSubs.get(remote_id);
      if(market) {
        for(let datum of message.params[1]) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
      return;
    } else if(message.method == 'state.update') {
      let remote_id = message.params[0];
      let market = this._tickerSubs.get(remote_id);
      if(market) {
        let ticker = this._constructTicker(message.params[1], market);
        this.emit("ticker", ticker, market);
      }
      return;
    }
  }

  _constructTrades(datum, market) {
    let { id, time, price, amount, type } = datum;
    return new Trade({
      exchange: "ZT",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: id,
      unix: Math.round(time*1000),
      side: type.toLowerCase(),
      price,
      amount
    });
  }

  _constructTicker(datum, market) {
    let { last, volume, deal, period, high, open, low, close } = datum;
    return new Ticker({
      exchange: "ZT",
      base: market.base,
      quote: market.quote,
      id: market.id,
      high,
      open,
      low,
      volume
    });
  }
}

module.exports = ZtClient;

