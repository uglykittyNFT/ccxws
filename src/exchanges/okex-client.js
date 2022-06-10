const zlib = require("../zlib");
const { CandlePeriod } = require("../enums");
const moment = require("moment");
const BasicClient = require("../basic-client");
const Ticker = require("../ticker");
const Trade = require("../trade");
const Candle = require("../candle");
const Level2Point = require("../level2-point");
const Level2Snapshot = require("../level2-snapshot");
const Level2Update = require("../level2-update");
const { throttle } = require("../flowcontrol/throttle");

const pongBuffer = Buffer.from("pong");

class OKExClient extends BasicClient {
  /**
   * Implements OKEx V5 WebSocket API as defined in
   * https://www.okx.com/docs-v5/en/#websocket-api
   *
   * Limits:
   *    1 connection / second
   *    240 subscriptions / hour
   *
   * Connection will disconnect after 30 seconds of silence
   * it is recommended to send a ping message that contains the
   * message "ping".
   *
   * Order book depth includes maintenance of a checksum for the
   * first 25 values in the orderbook. Each update includes a crc32
   * checksum that can be run to validate that your order book
   * matches the server. If the order book does not match you should
   * issue a reconnect.
   *
   * Refer to: https://www.okex.com/docs/en/#spot_ws-checksum
   */
  constructor({ wssPath = "wss://ws.okx.com:8443/ws/v5/public", watcherMs, sendThrottleMs = 20 } = {}) {
    super(wssPath, "OKEx", undefined, watcherMs);
    this.candlePeriod = CandlePeriod._1m;
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = true;
    this.hasLevel2Snapshots = true;
    this.hasLevel2Updates = true;
    this._sendMessage = throttle(this._sendMessage.bind(this), sendThrottleMs);
  }

  _beforeClose() {
    this._sendMessage.cancel();
  }

  _beforeConnect() {
    this._wss.on("connected", this._startPing.bind(this));
    this._wss.on("disconnected", this._stopPing.bind(this));
    this._wss.on("closed", this._stopPing.bind(this));
  }

  _startPing() {
    clearInterval(this._pingInterval);
    this._pingInterval = setInterval(this._sendPing.bind(this), 15000);
  }

  _stopPing() {
    clearInterval(this._pingInterval);
  }

  _sendPing() {
    if (this._wss) {
      this._wss.send("ping");
    }
  }

  /**
   * Constructs a market argument in a backwards compatible manner where
   * the default is a spot market.
   * @param {string} method
   * @param {Market} market
   */
  _marketArg(method, market) {
    let type = (market.type || "spot").toLowerCase();
    return `${type.toLowerCase()}/${method}:${market.id}`;
  }

  /**
   * Gets the exchanges interpretation of the candle period
   * @param {CandlePeriod} period
   */
  _candlePeriod(period) {
    switch (period) {
      case CandlePeriod._1m:
        return "60s";
      case CandlePeriod._3m:
        return "180s";
      case CandlePeriod._5m:
        return "300s";
      case CandlePeriod._15m:
        return "900s";
      case CandlePeriod._30m:
        return "1800s";
      case CandlePeriod._1h:
        return "3600s";
      case CandlePeriod._2h:
        return "7200s";
      case CandlePeriod._4h:
        return "14400s";
      case CandlePeriod._6h:
        return "21600s";
      case CandlePeriod._12h:
        return "43200s";
      case CandlePeriod._1d:
        return "86400s";
      case CandlePeriod._1w:
        return "604800s";
    }
  }

  _sendMessage(msg) {
    this._wss.send(msg);
  }

  _sendSubTicker(remote_id, market) {
    this._sendMessage(
      JSON.stringify({
        "op": "subscribe",
        "args": [
          {
            "channel": "tickers",
            "instId": remote_id
          }
        ]
      })
    );
  }

  _sendUnsubTicker(remote_id, market) {
    this._sendMessage(
      JSON.stringify({
        "op": "unsubscribe",
        "args": [
          {
            "channel": "tickers",
            "instId": remote_id
          }
        ]
      })
    );
  }

  _sendSubTrades(remote_id, market) {
    this._sendMessage(
      JSON.stringify({
        "op": "subscribe",
        "args": [
          {
            "channel": "trades",
            "instId": remote_id
          }
        ]
      })
    );
  }

  _sendUnsubTrades(remote_id, market) {
    this._sendMessage(
      JSON.stringify({
        "op": "unsubscribe",
        "args": [
          {
            "channel": "trades",
            "instId": remote_id
          }
        ]
      })
    );
  }

  _sendSubCandles(remote_id, market) {
    this._sendMessage(
      JSON.stringify({
        op: "subscribe",
        args: [this._marketArg("candle" + this._candlePeriod(this.candlePeriod), market)],
      })
    );
  }

  _sendUnsubCandles(remote_id, market) {
    this._sendMessage(
      JSON.stringify({
        op: "unsubscribe",
        args: [this._marketArg("candle" + this._candlePeriod(this.candlePeriod), market)],
      })
    );
  }

  _sendSubLevel2Snapshots(remote_id, market) {
    this._sendMessage(
      JSON.stringify({
        op: "subscribe",
        args: [this._marketArg("depth5", market)],
      })
    );
  }

  _sendUnsubLevel2Snapshots(remote_id, market) {
    this._sendMessage(
      JSON.stringify({
        op: "unsubscribe",
        args: [this._marketArg("depth5", market)],
      })
    );
  }

  _sendSubLevel2Updates(remote_id, market) {
    this._sendMessage(
      JSON.stringify({
        op: "subscribe",
        args: [this._marketArg("depth_l2_tbt", market)],
      })
    );
  }

  _sendUnsubLevel2Updates(remote_id, market) {
    this._sendMessage(
      JSON.stringify({
        op: "unsubscribe",
        args: [this._marketArg("depth_l2_tbt", market)],
      })
    );
  }

  _onMessage(message) {
    if(message == 'pong') {
      this.emit("ping");
    } else {
      let msg = JSON.parse(message);
      this._processsMessage(msg);
    }
  }

  _processsMessage(msg) {
    // console.log(msg);
    // clear semaphore on subscription event reply
    if (msg.event === "subscribe") {
      return;
    }

    // ignore unsubscribe
    if (msg.event === "unsubscribe") {
      return;
    }

    // prevent failed messages from
    if (!msg.data) {
      // eslint-disable-next-line no-console
      console.warn("warn: failure response", JSON.stringify(msg));
      return;
    }

    // tickers
    if (msg.arg.channel == 'tickers') {
      this._processTicker(msg);
      return;
    }

    // trades
    if (msg.arg.channel == 'trades') {
      this._processTrades(msg);
      return;
    }
  }

  /**
   * Process ticker messages in the format
    { arg: { channel: 'tickers', instId: 'BTC-USDT' },
  data:
   [ { instType: 'SPOT',
       instId: 'BTC-USDT',
       last: '40000',
       lastSz: '0.00003401',
       askPx: '39986.9',
       askSz: '0.0001',
       bidPx: '39986.8',
       bidSz: '1.04651415',
       open24h: '39313.8',
       high24h: '41738.1',
       low24h: '38820',
       sodUtc0: '39288.7',
       sodUtc8: '40617.9',
       volCcy24h: '894494161.80911719',
       vol24h: '22300.84552052',
       ts: '1647456456777' } ] }
   */
  _processTicker(msg) {
    for (let datum of msg.data) {
      // ensure market
      let remoteId = datum.instId;
      let market = this._tickerSubs.get(remoteId);
      if (!market) continue;

      // construct and emit ticker
      let ticker = this._constructTicker(datum, market);
      this.emit("ticker", ticker, market);
    }
  }

  /**
   * Processes trade messages in the format
    { arg: { channel: 'trades', instId: 'BTC-USDT' },
  data:
   [ { instId: 'BTC-USDT',
       tradeId: '320147586',
       px: '39484.3',
       sz: '0.00169604',
       side: 'buy',
       ts: '1647455745438' } ] }
   */
  _processTrades(msg) {
    for (let datum of msg.data) {
      // ensure market
      let remoteId = datum.instId;
      let market = this._tradeSubs.get(remoteId);
      if (!market) continue;

      // construct and emit trade
      let trade = this._constructTrade(datum, market);
      this.emit("trade", trade, market);
    }
  }

  /**
   * Processes a candle message
    {
      "table": "spot/candle60s",
      "data": [
        {
          "candle": [
            "2020-08-10T20:42:00.000Z",
            "0.03332",
            "0.03332",
            "0.03331",
            "0.03332",
            "44.058532"
          ],
          "instrument_id": "ETH-BTC"
        }
      ]
    }
   */
  _processCandles(msg) {
    for (let datum of msg.data) {
      // ensure market
      let remoteId = datum.instrument_id;
      let market = this._candleSubs.get(remoteId);
      if (!market) continue;

      // construct and emit candle
      let candle = this._constructCandle(datum, market);
      this.emit("candle", candle, market);
    }
  }

  /**
   * Processes a level 2 snapshot message in the format:
      { table: 'spot/depth5',
        data: [{
            asks: [ ['0.02192', '1.204054', '3' ] ],
            bids: [ ['0.02191', '15.117671', '3' ] ],
            instrument_id: 'ETH-BTC',
            timestamp: '2019-07-15T16:54:42.301Z' } ] }
   */
  _processLevel2Snapshot(msg) {
    for (let datum of msg.data) {
      // ensure market
      let remote_id = datum.instrument_id;
      let market = this._level2SnapshotSubs.get(remote_id);
      if (!market) return;

      // construct snapshot
      let snapshot = this._constructLevel2Snapshot(datum, market);
      this.emit("l2snapshot", snapshot, market);
    }
  }

  /**
   * Processes a level 2 update message in one of two formats.
   * The first message received is the "partial" orderbook and contains
   * 200 records in it.
   *
    { table: 'spot/depth',
          action: 'partial',
          data:
            [ { instrument_id: 'ETH-BTC',
                asks: [Array],
                bids: [Array],
                timestamp: '2019-07-15T17:18:31.737Z',
                checksum: 723501244 } ] }
   *
   * Subsequent calls will include the updates stream for changes to
   * the order book:
   *
      { table: 'spot/depth',
      action: 'update',
      data:
        [ { instrument_id: 'ETH-BTC',
            asks: [Array],
            bids: [Array],
            timestamp: '2019-07-15T17:18:32.289Z',
            checksum: 680530848 } ] }
   */
  _processLevel2Update(msg) {
    let action = msg.action;
    for (let datum of msg.data) {
      // ensure market
      let remote_id = datum.instrument_id;
      let market = this._level2UpdateSubs.get(remote_id);
      if (!market) continue;

      // handle updates
      if (action === "partial") {
        let snapshot = this._constructLevel2Snapshot(datum, market);
        this.emit("l2snapshot", snapshot, market);
      } else if (action === "update") {
        let update = this._constructLevel2Update(datum, market);
        this.emit("l2update", update, market);
      } else {
        // eslint-disable-next-line no-console
        console.error("Unknown action type", msg);
      }
    }
  }

  /**
   * Constructs a ticker from the datum in the format:
      {instType: 'SPOT',
       instId: 'BTC-USDT',
       last: '40000',
       lastSz: '0.00003401',
       askPx: '39986.9',
       askSz: '0.0001',
       bidPx: '39986.8',
       bidSz: '1.04651415',
       open24h: '39313.8',
       high24h: '41738.1',
       low24h: '38820',
       sodUtc0: '39288.7',
       sodUtc8: '40617.9',
       volCcy24h: '894494161.80911719',
       vol24h: '22300.84552052',
       ts: '1647456456777' }
   */
  _constructTicker(data, market) {
    let {
      instType,
      instId,
      last,
      lastSz,
      askPx,
      askSz,
      bidPx,
      bidSz,
      open24h,
      high24h,
      low24h,
      sodUtc0,
      sodUtc8,
      volCcy24h,
      vol24h,
      ts
    } = data;

    let change = parseFloat(last) - parseFloat(open24h);
    let changePercent = change / parseFloat(open24h);
    return new Ticker({
      exchange: "OKEx",
      base: market.base,
      quote: market.quote,
      timestamp: ts,
      last,
      open: open24h,
      high: high24h,
      low: low24h,
      volume: vol24h,
      change: change.toFixed(8),
      changePercent: changePercent.toFixed(2),
      bid: bidPx || "0",
      bidVolume: bidSz || "0",
      ask: askPx || "0",
      askVolume: askSz || "0",
    });
  }

  /**
   * Constructs a trade from the message datum in format:
    { instId: 'BTC-USDT',
       tradeId: '320147586',
       px: '39484.3',
       sz: '0.00169604',
       side: 'buy',
       ts: '1647455745438' }
    */
  _constructTrade(datum, market) {
    let { instId, tradeId, px, sz, side, ts } = datum;

    return new Trade({
      exchange: "OKEx",
      base: market.base,
      quote: market.quote,
      tradeId,
      side,
      unix: ts,
      price: px,
      amount: sz,
    });
  }

  /**
   * Constructs a candle for the market
      {
        "candle": [
          "2020-08-10T20:42:00.000Z",
          "0.03332",
          "0.03332",
          "0.03331",
          "0.03332",
          "44.058532"
        ],
        "instrument_id": "ETH-BTC"
      }
   * @param {*} datum
   */
  _constructCandle(datum) {
    let [datetime, open, high, low, close, volume] = datum.candle;
    let ts = moment.utc(datetime).valueOf();
    return new Candle(ts, open, high, low, close, volume);
  }

  /**
   * Constructs a snapshot message from the datum in a
   * snapshot message data property. Datum in the format:
   *
      { instrument_id: 'ETH-BTC',
        asks: [ ['0.02192', '1.204054', '3' ] ],
        bids: [ ['0.02191', '15.117671', '3' ] ],
        timestamp: '2019-07-15T16:54:42.301Z' }
   *
   * The snapshot may also come from an update, in which case we need
   * to include the checksum
   *
      { instrument_id: 'ETH-BTC',
        asks: [ ['0.02192', '1.204054', '3' ] ],
        bids: [ ['0.02191', '15.117671', '3' ] ],
        timestamp: '2019-07-15T17:18:31.737Z',
        checksum: 723501244 }

   */
  _constructLevel2Snapshot(datum, market) {
    let asks = datum.asks.map(p => new Level2Point(p[0], p[1], p[2]));
    let bids = datum.bids.map(p => new Level2Point(p[0], p[1], p[2]));
    let ts = moment.utc(datum.timestamp).valueOf();
    let checksum = datum.checksum;
    return new Level2Snapshot({
      exchange: "OKEx",
      base: market.base,
      quote: market.quote,
      timestampMs: ts,
      asks,
      bids,
      checksum,
    });
  }

  /**
   * Constructs an update message from the datum in the update
   * stream. Datum is in the format:
    { instrument_id: 'ETH-BTC',
      asks: [ ['0.02192', '1.204054', '3' ] ],
      bids: [ ['0.02191', '15.117671', '3' ] ],
      timestamp: '2019-07-15T17:18:32.289Z',
      checksum: 680530848 }
   */
  _constructLevel2Update(datum, market) {
    let asks = datum.asks.map(p => new Level2Point(p[0], p[1], p[3]));
    let bids = datum.bids.map(p => new Level2Point(p[0], p[1], p[3]));
    let ts = moment.utc(datum.timestamp).valueOf();
    let checksum = datum.checksum;
    return new Level2Update({
      exchange: "OKEx",
      base: market.base,
      quote: market.quote,
      timestampMs: ts,
      asks,
      bids,
      checksum,
    });
  }
}

module.exports = OKExClient;
