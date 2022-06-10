const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class BitforexClient extends BasicClient {
  /**
    Documentation:
    wss://www.bitforex.com/mkapi/coinGroup1/ws
   */
  constructor({ wssPath = "wss://www.bitforex.com/mkapi/coinGroup1/ws", watcherMs } = {}) {
    super(wssPath, "BitForex", undefined, watcherMs);
    this.hasTickers = false;
    this.hasTrades = true;
    this.hasCandles = false;
    this.hasLevel2Updates = false;
    this.constructL2Price = false;
    this.id = 0;
    setInterval(this._sendPing.bind(this), 15*1000);
  }

  _sendPing() {
    this._wss.send("ping_p");
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
      JSON.stringify(
        [
          {
            "type":"subHq",
            "event":"trade",
            "param":{
              "businessType":remote_id, 
              "size":1
            }
          }
        ])
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify(
        [
          {
            "type":"subHq_cancel",
            "event":"trade",
            "param":{
              "businessType":remote_id
            }
          }
        ])
    );
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msg) {
    if(msg == 'pong_p') {
      this.emit('ping');
      return;
    }

    let message = JSON.parse(msg);

    if(message.event == 'trade' && message.data) {
      let market = this._tradeSubs.get(message.param.businessType);
      if(market) {
        for(let datum of message.data) {
          let trade = this._constructTrades(datum, market);
          this.emit("trade", trade, market);
        }
      }
    }
  }


  _constructTrades(datum, market) {
    let { price, amount, direction, time } = datum;
    return new Trade({
      exchange: "BitForex",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: time,
      unix: time,
      side: direction == 1 ? 'buy' : 'sell',
      price,
      amount
    });
  }

}

module.exports = BitforexClient;