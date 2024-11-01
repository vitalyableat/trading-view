import * as React from "react";
import styles from "./index.module.css";
import { widget } from "../../public/static/charting_library";
import LocalStorageSaveLoadAdapter from "../../lib/save_load_adapter";

function getLanguageFromURL() {
  const regex = new RegExp("[\\?&]lang=([^&#]*)");
  const results = regex.exec(window.location.search);
  return results === null
    ? null
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

export class TVChartContainer extends React.PureComponent {
  static defaultProps = {
    symbol: "BTCUSDT",
    interval: "D",
    datafeedUrl: "https://demo_feed.tradingview.com",
    libraryPath: "/static/charting_library/",
    chartsStorageApiVersion: "1.1",
    fullscreen: true,
    autosize: true,
    debug: true,
    studiesOverrides: {},
  };

  tvWidget = null;

  constructor(props) {
    super(props);
    this.ref = React.createRef();
    this.timerRef = React.createRef(-1);
  }
  componentDidUpdate(prevProps) {
    if (
      this.props.currentSymbol &&
      this.props.currentSymbol !== prevProps.currentSymbol
    ) {
      this.tvWidget
        ?.activeChart()
        .setSymbol(this.props.currentSymbol ?? "BINANCE:BTCUSDT");
    }
  }

  async componentDidMount() {
    const datafeed = new window.Datafeeds.UDFCompatibleDatafeed("/api");

    const widgetOptions = {
      symbol: "BINANCE:BTCUSDT",
      datafeed,
      // datafeed: new window.Datafeeds.UDFCompatibleDatafeed(
      //   'https://demo_feed.tradingview.com'
      // ),
      interval: this.props.interval,
      container: this.ref.current,
      library_path: this.props.libraryPath,
      locale: getLanguageFromURL() || "en",
      enabled_features: ["study_templates"],
      // charts_storage_url: 'http://3.144.228.235:8003',
      charts_storage_api_version: this.props.chartsStorageApiVersion,
      client_id: this.props.clientId,
      user_id: this.props.userId,
      fullscreen: this.props.fullscreen,
      autosize: this.props.autosize,
      studies_overrides: this.props.studiesOverrides,
      save_load_adapter: new LocalStorageSaveLoadAdapter(),
      client_id: "chainstats.pro",
      user_id: this.props.userId,
      theme: "dark",
      custom_indicators_getter: function (PineJS) {
        return Promise.resolve([
          // Adding Fair Value Gap indicator
          {
            name: "Fair Value Gap",
            metainfo: {
              _metainfoVersion: 53,
              id: "FairValueGap@tv-basicstudies-1",
              description: "Fair Value Gap [LuxAlgo]",
              shortDescription: "FVG",
              format: { type: "price" },
              linkedToSeries: true,
              is_price_study: true,
              plots: [
                { id: "max_bull_plot", type: "line" },
                { id: "min_bull_plot", type: "line" },
                { id: "max_bear_plot", type: "line" },
                { id: "min_bear_plot", type: "line" },
              ],
              defaults: {
                styles: {
                  max_bull_plot: { visible: false },
                  min_bull_plot: { visible: false },
                  max_bear_plot: { visible: false },
                  min_bear_plot: { visible: false },
                },
                inputs: {
                  thresholdPer: 0,
                  auto: false,
                  showLast: 0,
                  mitigationLevels: false,
                  extend: 20,
                  dynamic: false,
                },
              },
              inputs: [
                {
                  id: "thresholdPer",
                  name: "Threshold %",
                  defval: 0,
                  type: "float",
                  min: 0,
                  max: 100,
                },
                {
                  id: "auto",
                  name: "Auto",
                  defval: false,
                  type: "boolean",
                },
                {
                  id: "showLast",
                  name: "Unmitigated Levels",
                  defval: 0,
                  type: "integer",
                  min: 0,
                },
                {
                  id: "mitigationLevels",
                  name: "Mitigation Levels",
                  defval: false,
                  type: "boolean",
                },
                {
                  id: "extend",
                  name: "Extend",
                  defval: 20,
                  type: "integer",
                  min: 0,
                },
                {
                  id: "dynamic",
                  name: "Dynamic",
                  defval: false,
                  type: "boolean",
                },
              ],
            },
            constructor: function () {
              this.main = function (ctx, input) {
                this._context = ctx;
                this._input = input;

                const threshold = input(0) / 100;
                const high = PineJS.Std.high(this._context);
                const low = PineJS.Std.low(this._context);
                const close = PineJS.Std.close(this._context);

                const bull_fvg =
                  low > high[2] &&
                  close[1] > high[2] &&
                  (low - high[2]) / high[2] > threshold;
                const bear_fvg =
                  high < low[2] &&
                  close[1] < low[2] &&
                  (low[2] - high) / high > threshold;

                let max_bull_fvg = bull_fvg ? low : null;
                let min_bull_fvg = bull_fvg ? high[2] : null;
                let max_bear_fvg = bear_fvg ? low[2] : null;
                let min_bear_fvg = bear_fvg ? high : null;

                return [
                  { value: max_bull_fvg },
                  { value: min_bull_fvg },
                  { value: max_bear_fvg },
                  { value: min_bear_fvg },
                ];
              };
            },
          },
          // Indicator object
          {
            name: "Custom Moving Average",
            metainfo: {
              _metainfoVersion: 53,
              id: "Custom Moving Average@tv-basicstudies-1",
              description: "Custom Moving Average",
              shortDescription: "Custom MA",
              format: { type: "inherit" },
              linkedToSeries: true,
              is_price_study: true,
              plots: [
                { id: "plot_0", type: "line" },
                { id: "smoothedMA", type: "line" },
              ],
              defaults: {
                styles: {
                  plot_0: {
                    linestyle: 0,
                    linewidth: 1,
                    plottype: 0,
                    trackPrice: false,
                    transparency: 0,
                    visible: true,
                    color: "#2196F3",
                  },
                  smoothedMA: {
                    linestyle: 0,
                    linewidth: 1,
                    plottype: 0,
                    trackPrice: false,
                    transparency: 0,
                    visible: true,
                    color: "#9621F3",
                  },
                },
                inputs: {
                  length: 9,
                  source: "close",
                  offset: 0,
                  smoothingLine: "SMA",
                  smoothingLength: 9,
                },
              },
              styles: {
                plot_0: { title: "Plot", histogramBase: 0, joinPoints: true },
                smoothedMA: {
                  title: "Smoothed MA",
                  histogramBase: 0,
                  joinPoints: false,
                },
              },
              inputs: [
                {
                  id: "length",
                  name: "Length",
                  defval: 9,
                  type: "integer",
                  min: 1,
                  max: 10000,
                },
                {
                  id: "source",
                  name: "Source",
                  defval: "close",
                  type: "source",
                  options: [
                    "open",
                    "high",
                    "low",
                    "close",
                    "hl2",
                    "hlc3",
                    "ohlc4",
                  ],
                },
                {
                  id: "offset",
                  name: "Offset",
                  defval: 0,
                  type: "integer",
                  min: -10000,
                  max: 10000,
                },
                {
                  id: "smoothingLine",
                  name: "Smoothing Line",
                  defval: "SMA",
                  type: "text",
                  options: ["SMA", "EMA", "WMA"],
                },
                {
                  id: "smoothingLength",
                  name: "Smoothing Length",
                  defval: 9,
                  type: "integer",
                  min: 1,
                  max: 10000,
                },
              ],
            },
            constructor: function () {
              this.main = function (ctx, inputs) {
                this._context = ctx;
                this._input = inputs;

                var length = this._input(0);
                var offset = this._input(2);
                var smoothingLine = this._input(3);
                var smoothingLength = this._input(4);
                var source = PineJS.Std[this._input(1)](this._context);

                this._context.setMinimumAdditionalDepth(
                  length + smoothingLength
                );

                var series = this._context.new_var(source);
                var sma = PineJS.Std.sma(series, length, this._context);
                var sma_series = this._context.new_var(sma);

                var smoothedMA;
                if (smoothingLine === "EMA") {
                  smoothedMA = PineJS.Std.ema(
                    sma_series,
                    smoothingLength,
                    this._context
                  );
                } else if (smoothingLine === "WMA") {
                  smoothedMA = PineJS.Std.wma(
                    sma_series,
                    smoothingLength,
                    this._context
                  );
                } else {
                  // if (smoothingLine === "SMA") {
                  smoothedMA = PineJS.Std.sma(
                    sma_series,
                    smoothingLength,
                    this._context
                  );
                }

                return [
                  { value: sma, offset: offset },
                  { value: smoothedMA, offset: offset },
                ];
              };
            },
          },
        ]);
      },
    };

    const tvWidget = new widget(widgetOptions);
    this.tvWidget = tvWidget;

    tvWidget.headerReady().then(() => {
      tvWidget.onChartReady(() => {
        if (!localStorage.getItem("watchlist")) {
          localStorage.setItem("watchlist", JSON.stringify([]));
        }
        const button = tvWidget.createButton();
        button.setAttribute("title", "Add to watchlist");
        button.classList.add("apply-common-tooltip");
        const tradingViewDOM = document.getElementById("tradingview-container");
        const watchlistDiv = document.createElement("div");
        watchlistDiv.style.position = "absolute";
        watchlistDiv.style.zIndex = -1;
        watchlistDiv.style.left =
          +button.getBoundingClientRect().x +
          +tradingViewDOM.getBoundingClientRect().x +
          "px";
        watchlistDiv.style.top =
          +button.getBoundingClientRect().y +
          +tradingViewDOM.getBoundingClientRect().y +
          "px";
        watchlistDiv.style.width = 130 + "px";
        watchlistDiv.style.height = 20 + "px";
        watchlistDiv.classList.add("watchlist-btn");
        document.body.appendChild(watchlistDiv);
        JSON.parse(localStorage.getItem("watchlist")).length === 0 &&
          this.props.setIsElementReady(true);

        button.addEventListener("click", () => {
          toggleWatchlist(tvWidget.activeChart().symbolExt());
        });

        // Listen for symbol changes and update the watchlist button
        tvWidget
          .activeChart()
          .onSymbolChanged()
          .subscribe(null, (newSymbol) => {
            this.props.updateSymbol({
              exchange: newSymbol.exchange,
              symbol: newSymbol.symbol,
              description: newSymbol.description,
            });
          });

        const updateButtonText = (symbol) => {
          const watchlist = JSON.parse(localStorage.getItem("watchlist"));
          if (watchlist.includes(symbol)) {
            button.innerHTML = "Remove from Watchlist";
            button.setAttribute("title", "Remove from Watchlist");
          } else {
            button.innerHTML = "Add to Watchlist";
            button.setAttribute("title", "Add to Watchlist");
          }
        };

        const toggleWatchlist = (symbol) => {
          var watchlist = JSON.parse(localStorage.getItem("watchlist"));
          if (watchlist.includes(symbol)) {
            watchlist = watchlist.filter((item) => item !== symbol);
            localStorage.setItem("watchlist", JSON.stringify(watchlist));
            alert(symbol + " removed from watchlist!");
          } else {
            watchlist.push(symbol);
            localStorage.setItem("watchlist", JSON.stringify(watchlist));
            alert(symbol + " added to watchlist!");
          }
          updateButtonText(symbol);
          this.props.updateWatchlist(this.props.watchlistUpdated + 1);
        };

        updateButtonText(tvWidget.symbolInterval().symbol);

        this.timerRef.current = setInterval(function () {
          const currentSymbol = tvWidget.symbolInterval().symbol;
          updateButtonText(currentSymbol);
        }, 1000);
        // tvWidget.headerReady().then(() => {});
      });
    });
  }

  componentWillUnmount() {
    if (this.tvWidget !== null) {
      this.tvWidget.remove();
      this.tvWidget = null;
    }

    if (this.timerRef.current !== -1) {
      clearInterval(this.timerRef.current);
    }
  }

  render() {
    return (
      <>
        <div ref={this.ref} className={styles.TVChartContainer} />
      </>
    );
  }
}
