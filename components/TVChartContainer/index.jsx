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
          {
            name: "USDT Signal v.1.2",
            metainfo: {
              _metainfoVersion: 1.2,
              id: "USDT Signal@tv-basicstudies-1",
              description: "USDT Signal v.1.2",
              shortDescription: "USDT Signal",
              format: { type: "inherit" },
              linkedToSeries: true,
              is_price_study: true,
              plots: [
                { id: "plot_triangle_down", type: "shapes" },
                { id: "plot_triangle_up", type: "shapes" },
              ],
              defaults: {
                styles: {
                  plot_triangle_down: {
                    location: 'AboveBar',
                    plottype: 'shape_triangle_down',
                    color: "#FF5252",
                    size: "size_small",
                    editable: false,
                  },
                  plot_triangle_up: {
                    location: 'BelowBar',
                    plottype: 'shape_triangle_up',
                    color: "#4CAF50",
                    size: "size_small",
                    editable: false,
                  },
                },
                inputs: {
                  is_BKXCall_Enable: true,
                },
              },
              styles: {
                plot_triangle_down: { title: "Plot", histogramBase: 0, joinPoints: true },
                plot_triangle_up: { title: "Plot", histogramBase: 0, joinPoints: true },
              },
              inputs: [
                {
                  id: "is_BKXCall_Enable",
                  name: "BKX Call",
                  defval: true,
                  type: "bool",
                  tooltip: "Enable BKX call with a Red triangle above (Short) or below (Long)\n\nAggiunge indicatore per il BKX, un triangolo rosso sopra (Short) o sotto (Long)",
                  group: "EXTRA CALLS"
                },
              ],
            },
            constructor: function () {
              this.main = function (ctx, inputs) {
                const is_BKXCall_Enable = inputs(0);

                let is_BKXCall_Long = Number(is_BKXCall_Enable && Math.floor(Math.random() * 2));
                let is_BKXCall_Short = Number(is_BKXCall_Enable && Math.floor(Math.random() * 2));

                return [
                  {value: is_BKXCall_Long},
                  {value: is_BKXCall_Short},
                ];
              };
            }
          }
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
