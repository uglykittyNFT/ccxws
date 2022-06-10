const aax = require("./exchanges/aax-client");
const ascendex = require("./exchanges/ascendex-client");
const bequant = require("./exchanges/bequant-client");
const bibox = require("./exchanges/bibox-client");
const binance = require("./exchanges/binance-client");
const binanceje = require("./exchanges/binanceje-client");
const binanceus = require("./exchanges/binanceus-client");
const bitfinex = require("./exchanges/bitfinex-client");
const bitflyer = require("./exchanges/bitflyer-client");
const bitforex = require("./exchanges/bitforex-client");
const bitmart = require("./exchanges/bitmart-client");
const bitmex = require("./exchanges/bitmex-client");
const bitrue = require("./exchanges/bitrue-client");
const bitstamp = require("./exchanges/bitstamp-client");
const bittrex = require("./exchanges/bittrex-client");
const bybit = require("./exchanges/bybit-client");
const cex = require("./exchanges/cex-client");
const coinbasepro = require("./exchanges/coinbasepro-client");
const coinex = require("./exchanges/coinex-client");
const coinflex = require("./exchanges/coinflex-client");
const crypto = require("./exchanges/crypto-client");
const ethfinex = require("./exchanges/ethfinex-client");
const fmfw = require("./exchanges/fmfw-client");
const ftx = require("./exchanges/ftx-client");
const ftxus = require("./exchanges/ftx-us-client");
const gateio = require("./exchanges/gateio-client");
const gemini = require("./exchanges/gemini-client");
const hitbtc = require("./exchanges/hitbtc-client");
const huobi = require("./exchanges/huobi-client");
const kucoin = require("./exchanges/kucoin-client");
const kraken = require("./exchanges/kraken-client");
const lbank = require("./exchanges/lbank-client");
const liquid = require("./exchanges/liquid-client");
const mexc = require("./exchanges/mexc-client");
const zt = require("./exchanges/zt-client");
const okex = require("./exchanges/okex-client");
const poloniex = require("./exchanges/poloniex-client");
const upbit = require("./exchanges/upbit-client");
const zb = require("./exchanges/zb-client");
const digifinex = require("./exchanges/digifinex-client");

module.exports = {
  // export all legacy exchange names
  aax,
  ascendex,
  bequant,
  bibox,
  binance,
  binanceje,
  binanceus,
  bitfinex,
  bitflyer,
  bitforex,
  bitmart,
  bitmex,
  bitrue,
  bitstamp,
  bittrex,
  bybit,
  cex,
  coinbasepro,
  coinex,
  coinflex,
  crypto,
  ethfinex,
  digifinex,
  ftx,
  ftxus,
  fmfw,
  gateio,
  gemini,
  hitbtc,
  hitbtc2: hitbtc,
  huobi,
  huobipro: huobi,
  kucoin,
  kraken,
  lbank,
  liquid,
  mexc,
  zt,
  okex,
  okex3: okex,
  poloniex,
  upbit,
  zb,

  // export all exchanges
  Ascendex: ascendex,
  Bibox: bibox,
  Binance: binance,
  BinanceFuturesCoinM: require("./exchanges/binance-futures-coinm-client"),
  BinanceFuturesUsdtM: require("./exchanges/binance-futures-usdtm-client"),
  BinanceJe: binanceje,
  BinanceUs: binanceus,
  Bitfinex: bitfinex,
  Bitflyer: bitflyer,
  Bithumb: require("./exchanges/bithumb-client"),
  BitMEX: bitmex,
  Bitrue: bitrue,
  Bitstamp: bitstamp,
  Bittrex: bittrex,
  ByBit: bybit,
  Cex: cex,
  CoinbasePro: coinbasepro,
  Coinex: coinex,
  CoinFlex: coinflex,
  Crypto: crypto,
  Deribit: require("./exchanges/deribit-client"),
  Digifinex: require("./exchanges/digifinex-client"),
  Ethfinex: ethfinex,
  ErisX: require("./exchanges/erisx-client"),
  Fmfw: fmfw,
  Ftx: ftx,
  FtxUs: ftxus,
  Gateio: gateio,
  Gemini: gemini,
  HitBTC: hitbtc,
  Huobi: huobi,
  HuobiFutures: require("./exchanges/huobi-futures-client"),
  HuobiSwaps: require("./exchanges/huobi-swaps-client"),
  HuobiJapan: require("./exchanges/huobi-japan-client"),
  HuobiKorea: require("./exchanges/huobi-korea-client"),
  HuobiRussia: require("./exchanges/huobi-russia-client"),
  Kucoin: kucoin,
  Kraken: kraken,
  LedgerX: require("./exchanges/ledgerx-client"),
  LBank: lbank,
  Liquid: liquid,
  Zt: zt,
  OKEx: okex,
  Poloniex: poloniex,
  Upbit: upbit,
  Zb: zb,

  // export all types
  Auction: require("./auction"),
  BasicClient: require("./basic-client"),
  BlockTrade: require("./block-trade"),
  Candle: require("./candle"),
  CandlePeriod: require("./enums").CandlePeriod,
  Level2Point: require("./level2-point"),
  Level2Snapshot: require("./level2-snapshot"),
  Level2Update: require("./level2-update"),
  Level3Point: require("./level3-point"),
  Level3Snapshot: require("./level3-snapshot"),
  Level3Update: require("./level3-update"),
  SmartWss: require("./smart-wss"),
  Ticker: require("./ticker"),
  Trade: require("./trade"),
  Watcher: require("./watcher"),
};
