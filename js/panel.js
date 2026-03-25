async function getCryptoPrices() {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,monero&vs_currencies=eur&include_24hr_change=true",
    );
    const data = await response.json();

    const btcPrice = data.bitcoin.eur.toLocaleString("fr-FR");
    const btcChange = data.bitcoin.eur_24h_change.toFixed(2);
    const xmrPrice = data.monero.eur.toLocaleString("fr-FR");
    const xmrChange = data.monero.eur_24h_change.toFixed(2);

    const btcArrow = btcChange >= 0 ? "▲" : "▼";
    const xmrArrow = xmrChange >= 0 ? "▲" : "▼";

    return `BTC: ${btcPrice}€ [${btcArrow}${btcChange}%] --- XMR: ${xmrPrice}€ [${xmrArrow}${xmrChange}%]`;
  } catch (error) {
    console.error("Erreur Crypto:", error);
    return "CRYPTO DATA OFFLINE";
  }
}
async function updateHackerNews() {
  // On utilise Hacker News via le proxy rss2json
  const rssUrl = encodeURIComponent("https://news.ycombinator.com/rss");
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    const crypto = await getCryptoPrices();

    if (data.status === "ok") {
      // On récupère les titres des 5 derniers articles et on les joint
      const newsItems = data.items
        .slice(0, 29)
        .map((item) => item.title.toUpperCase());
      //const scrollingText = ` [BREAKING] ${newsItems.join(" --- [NEXT] ")} --- `;
      let scrollingText = ` ${crypto} --- ${newsItems.join(" --- ")} --- `;

      // Mise à jour du DOM
      const spans = document.querySelectorAll(".scrolling-text span");
      spans.forEach((span) => {
        span.innerText = scrollingText;
      });

      console.log(
        "Flux News mis à jour à : " + new Date().toLocaleTimeString(),
      );
    }
  } catch (error) {
    console.error("Erreur News:", error);
    const errorMsg =
      " >>> ERROR: DATA FEED OFFLINE... ATTEMPTING RECONNECT... ";
    document
      .querySelectorAll(".scrolling-text span")
      .forEach((s) => (s.innerText = errorMsg));
  }
}

// Initialisation et rafraîchissement toutes les 10 minutes
updateHackerNews();
setInterval(updateHackerNews, 600000);
