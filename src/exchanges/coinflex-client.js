const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");

class CoinflexClient extends BasicClient {
  /**
    Documentation:
    
   */
  constructor({ wssPath = "wss://v2api.coinflex.com/v2/websocket", watcherMs } = {}) {
    super(wssPath, "CoinFlex", undefined, watcherMs);
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
      let symbols = Array.from( subMap.keys() ).map( (p) => `${debounceKey}:${p}`);
      let id = ++this.id;
      this._wss.send(
        JSON.stringify({
          op: subscribe ? "subscribe" : "unsubscribe",
          args: subscribe ? symbols : [`${debounceKey}:all`]
        })
      );
    });
  }

  _sendSubTrades() {
    this._debounceSend("trade", this._tradeSubs, true);
  }

  _sendUnsubTrades() {
    this._debounceSend("trade", this._tradeSubs, false);
  }

  _sendSubTicker() {
    this._debounceSend("ticker", this._tickerSubs, true);
  }

  _sendUnsubTicker() {
    this._debounceSend("ticker", this._tickerSubs, false);
  }


  _onMessage(msgs) {
  let message = JSON.parse(msgs);

    if(message.error) {
      this.emit("error", message.error);
      return;
    }

    if(message.table == 'trade') {
      for(let datum of message.data) {
        let remote_id = datum.marketCode;
        let market = this._tradeSubs.get(remote_id);
        if(market) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
      return;
    } else if(message.table == 'ticker') {
      for(let datum of message.data) {
        let remote_id = datum.marketCode;
        let market = this._tradeSubs.get(remote_id);
        if(market) {
          let ticker = this._constructTicker(datum, market);
          this.emit("ticker", ticker, market);
        }
      }
      return;
    }
  }

  _constructTrades(datum, market) {
    let { side, tradeId, price, quantity, marketCode, timestamp } = datum;
    return new Trade({
      exchange: "CoinFlex",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId,
      unix: timestamp,
      side,
      price,
      amount: quantity
    });
  }

  _constructTicker(datum, market) {
    let { last, open24h, high24h, low24h, volume24h, currencyVolume24h, openInterest, marketCode, timestamp, lastQty, markPrice, lastMarkPrice } = datum;
    return new Ticker({
      exchange: "CoinFlex",
      base: market.base,
      quote: market.quote,
      id: market.id,
      high: high24h,
      open: open24h,
      low: low24h,
      volume: lastQty,
      timestamp
    });
  }
}

module.exports = CoinflexClient;

