 const BasicClient = require("../basic-client");
const Trade = require("../trade");
const Ticker = require("../ticker");
const zlib = require("zlib");
const moment = require('moment-timezone');

class ByBitClient extends BasicClient {
  /**
    Documentation:
    https://bybit-exchange.github.io/docs/spot/#t-websocketv2trade
   */
  constructor({ wssPath = "wss://stream.bybit.com/spot/quote/ws/v2", watcherMs } = {}) {
    super(wssPath, "ByBit", undefined, watcherMs);
    this.hasTickers = false;
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
        ping: Date.now()
      })
    );
  }

  _sendSubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
	    topic: "trade",
	    params: {
	        symbol: remote_id,
	        binary: false
	    },
	    event: "sub"
      })
    );
  }

  _sendUnsubTrades(remote_id) {
    this._wss.send(
      JSON.stringify({
	    topic: "trade",
	    params: {
	        symbol: remote_id,
	        binary: false
	    },
	    event: "cancel"
      })
    );
  }

  _sendSubTicker(remote_id) {
  }

  _sendUnsubTicker(remote_id) {
  }

  _onMessage(msg) {
    let message = JSON.parse(msg);

    if(message.pong) {
    	this.emit('ping');
    } else if(message.topic == 'trade') {
    	let market = this._tradeSubs.get(message.params.symbol);
		if(market && message.data) {
			let trade = this._constructTrades(message.data, market);
			this.emit("trade", trade, market);
		}
    }
  }

  _constructTrades(datum, market) {
    let { v, t, p, q, m } = datum;
    return new Trade({
      exchange: "ByBit",
      base: market.base,
      quote: market.quote,
      id: market.id,
      tradeId: v,
      unix: t,
      side: m ? 'buy' : 'sell',
      price: p,
      amount: q
    });
  }

}

module.exports = ByBitClient;