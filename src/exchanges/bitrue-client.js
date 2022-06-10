const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require("moment");

class BitrueClient extends BasicClient {
  /**
    Documentation:
    https://github.com/Bitrue-exchange/bitrue-official-api-docs/blob/master/websocket-api.zh-CN.md
   */
  constructor({ wssPath = "wss://ws.bitrue.com/kline-api/ws", watcherMs } = {}) {
    super(wssPath, "Bitrue", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    setInterval(this._sendPong.bind(this), 9*60*1000);
  }

  _sendPong() {
    this._wss.send(
      JSON.stringify({
        pong: new Date().getTime()
      })
    );
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "sub",
        params: {
          cb_id: remote_id,
          channel: "market_"+remote_id+"_trade_ticker"
        },
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "unsub",
        params: {
          cb_id: remote_id,
          channel: "market_"+remote_id+"_trade_ticker"
        },
      })
    );
  }

  _sendSubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "sub",
        params: {
          cb_id: remote_id,
          channel: "market_"+remote_id+"_ticker"
        },
      })
    );
  }

  _sendUnsubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        event: "unsub",
        params: {
          cb_id: remote_id,
          channel: "market_"+remote_id+"_ticker"
        },
      })
    );
  }

  _onMessage(msgs) {
    let buffer = zlib.gunzipSync(Buffer.from(msgs, "base64"));
    let message = JSON.parse(buffer);
    if(message.ping) {
      this.emit("ping");
      return;
    }

    if(message.event_rep || !message.channel) {
      return;
    }

    let tmp = message.channel.split("_");

    if(tmp.length == 4 && tmp[2] == 'trade') {
      let remote_id = tmp[1];
      let market = this._tradeSubs.get(remote_id);
      if(market) {
        for(let datum of message.tick.data) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);          
        }
      }
      return;
    } else if(tmp.length == 3 && tmp[2] == 'ticker') {
      let remote_id = tmp[1];
      let market = this._tickerSubs.get(remote_id);
      if(market) {
        let ticker = this._constructTicker(message.tick, market);
        this.emit("ticker", ticker, market);
      }
    }
  }

  _constructTrades(datum, market) {
    let { id, price, amount, side, vol, ts, ds } = datum;
    return new Trade({
      exchange: "Bitrue",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: id,
      unix: ts,
      side: side.toLowerCase(),
      price,
      amount
    });
  }

  // TODO: not all data is returned!
  _constructTicker(datum, market) {
    let { amount, rose, close, vol, high, low, open } = datum;
    return new Ticker({
      exchange: "Bitrue",
      base: market.base,
      quote: market.quote,
      timestamp: new Date().getTime(),
      open: open,
      high: high,
      low: low,
      volume: vol,
      change: rose
    });
  }
}

module.exports = BitrueClient;







