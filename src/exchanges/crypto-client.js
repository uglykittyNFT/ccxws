const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class CryptoClient extends BasicClient {
  /**
    Documentation:
    https://exchange-docs.crypto.com/spot/index.html
   */
  constructor({ wssPath = "wss://stream.crypto.com/v2/market", watcherMs } = {}) {
    super(wssPath, "Crypto", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    this.debouceTimeoutHandles = new Map();
    this.debounceWait = 200;
  }

  _sendPong(id) {
    this._wss.send(
      JSON.stringify({
        id: id,
        method: "public/respond-heartbeat"
      })
    );
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
            id: id,
            method: 'subscribe',
            params: {
              channels: symbols.map( (s) => `${debounceKey}.${s}` )
            },
            nonce: Date.now()
          } : { 
            method: 'unsubscribe',
            params: {
              channels: [debounceKey]
            }
          }
        )
      );
    });
  }

  _sendSubTrades(remote_id) {
    setTimeout(function() {
      this._debounceSend('trade', this._tradeSubs, true);
    }.bind(this), 1500);
  }

  _sendUnsubTrades(remote_id) {
    this._debounceSend('trade', this._tradeSubs, false);
  }

  _sendSubTicker(remote_id) {
    setTimeout(function() {
      this._debounceSend('ticker', this._tickerSubs, true);
    }.bind(this), 2500);
  }

  _sendUnsubTicker(remote_id) {
    this._debounceSend('ticker', this._tickerSubs, false);
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.code > 0) {
      this.emit('error', message.message);
    }

    if(message.method == 'public/heartbeat') {
      this._sendPong(message.id);
      return;
    } else if(message.method == 'subscribe' && message.result) {
      if(message.result.channel == 'trade') {
        let market = this._tradeSubs.get(message.result.instrument_name);
        if(market) {
          for(let datum of message.result.data) {
            let trade = this._constructTrades(datum, market);
            this.emit("trade", trade, market);
          }
        }
        return;
      } else if(message.result.channel == 'ticker') {
        let market = this._tickerSubs.get(message.result.instrument_name);
        if(market) {
          for(let datum of message.result.data) {
            let ticker = this._constructTicker(datum, market);
            this.emit("ticker", ticker, market);          
          }
        }
        return;
      }
    }
  }

  _constructTrades(datum, market) {
    let { p, q, s, d, t, dataTime } = datum;
    return new Trade({
      exchange: "Crypto",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: d.toString(),
      unix: t,
      side: s,
      price: p,
      amount: q
    });
  }

  _constructTicker(datum, market) {
    let { h, v, a, l, b, k, c, t } = datum;

    return new Ticker({
      exchange: "Crypto",
      base: market.base,
      quote: market.quote,
      id: market.id,
      timestamp: t,
      last: a,
      high: h,
      volume: v,
      low: l,
      bid: b,
      ask: k,
      change: c
    });
  }
}

module.exports = CryptoClient;
