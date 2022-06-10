const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class LBankClient extends BasicClient {
  /**
    Documentation:
    https://github.com/LBank-exchange/lbank-official-api-docs/blob/master/API-For-Spot-EN/WebSocket%20API%20(Market%20Data).md
   */
  constructor({ wssPath = "wss://www.lbkex.net/ws/V2/", watcherMs } = {}) {
    super(wssPath, "LBank", undefined, watcherMs);
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    setInterval(this._sendPing.bind(this), 30*1000);
  }

  _sendPing() {
    this._wss.send(
      JSON.stringify({
        action: 'ping',
        ping: new Date().getTime().toString()
      })
    );
  }

  _sendPong(msg) {
    this._wss.send(
      JSON.stringify({
        action: 'pong',
        pong: msg
      })
    );
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
    		action: "subscribe",
    		subscribe: "trade",
        pair: remote_id
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
        action: "unsubscribe",
        subscribe: "trade",
        pair: remote_id
      })
    );
  }

  _sendSubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        action: "subscribe",
        subscribe: "tick",
        pair: remote_id
      })
    );
  }

  _sendUnsubTicker(remote_id) {
    this._wss.send(
      JSON.stringify({
        action: "unsubscribe",
        subscribe: "tick",
        pair: remote_id
      })
    );
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.action == 'ping') {
      this._sendPong(message.ping);
      return;
    } else if(message.type == 'trade' && message.trade) {
      let market = this._tradeSubs.get(message.pair);
      if(market) {
        let trade = this._constructTrades(message.trade, market);
        this.emit("trade", trade, market);          
      }
      return;
    } else if(message.type == 'tick' && message.tick) {
      let market = this._tickerSubs.get(message.pair);
      if(market) {
        let ticker = this._constructTicker(message.tick, market);
        this.emit("ticker", ticker, market);
      }
      return;
    }
  }

  _constructTrades(datum, market) {
    let { volume, amount, price, direction, TS } = datum;
    let t = moment.tz(TS, "Asia/Shanghai").valueOf();
    return new Trade({
      exchange: "LBank",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: t,
      unix: t,
      side: direction.toLowerCase(),
      price,
      amount
    });
  }

    // "tick":{
    //     "to_cny":76643.5,
    //     "high":0.02719761,
    //     "vol":497529.7686,
    //     "low":0.02603071,
    //     "change":2.54,
    //     "usd":299.12,
    //     "to_usd":11083.66,
    //     "dir":"sell",
    //     "turnover":13224.0186,
    //     "latest":0.02698749,
    //     "cny":2068.41
    // }

  _constructTicker(datum, market) {
    let { to_cny, high, vol, low, change, usd, to_usd, dir, turnover, latest, cny } = datum;

    // TODO

    return new Ticker({
      exchange: "LBank",
      base: market.base,
      quote: market.quote,
      id: market.id
    });
  }
}

module.exports = LBankClient;

