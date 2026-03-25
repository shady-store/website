// --- GESTION DE L'INTERFACE DE BOUTIQUE (Boutons Acheter/Login) ---
function updateProductsUI() {
  // 1. Sélectionner tous les boutons et messages de la boutique
  const buyButtons = document.querySelectorAll(".buy-btn");
  const loginMessages = document.querySelectorAll(".login-msg");

  // 2. Vérifier si l'utilisateur est connecté via le SDK PocketBase
  const isLoggedIn = pb.authStore.isValid;

  // 3. Parcourir les éléments et ajuster l'affichage
  buyButtons.forEach((btn, index) => {
    if (isLoggedIn) {
      // Utilisateur connecté : afficher le bouton, masquer le message
      btn.style.display = "inline-block";
      loginMessages[index].style.display = "none";
    } else {
      // Utilisateur déconnecté : masquer le bouton, afficher le message
      btn.style.display = "none";
      loginMessages[index].style.display = "block";
    }
  });
}
async function loadProducts() {
  try {
    // On récupère les articles actifs, du plus récent au plus ancien
    const records = await pb.collection("products").getFullList({
      filter: "active = true",
      sort: "-created",
    });

    const container = document.getElementById("view-products");
    container.innerHTML = ""; // On nettoie

    records.forEach((product) => {
      const date = new Date(product.created).toLocaleDateString();

      const imageUrl = product.image
        ? pb.files.getUrl(product, product.image)
        : "placeholder.jpg";
      const stockStatus = product.stock > 0 ? "EN STOCK" : "RUPTURE";
      const stockClass = product.stock > 0 ? "online" : "offline";
      var actionButton = `<button class="btn-buy" disabled>INDISPONIBLE</button>`;

      if (product.stock > 0) {
        actionButton = `
              <button
              onclick="initiateOrder('${product.id}', '${product.name}', '${product.price}')" class="btn-buy buy-btn"
              >
                ACHETER
              </button>
              <p class="login-msg" style="display: none; color: var(--accent)">
                [!] CONNECTEZ-VOUS POUR ACHETER
              </p>
`;
      }
      const productHtml = `
          <article class="product-card">
            <div class="product-header">
              <span class="product-id">ID: NEXUS-${product.id}</span>
              <span class="product-status ${stockClass}">${stockStatus}</span>
            </div>

            <div class="product-title-area">
              <h3>${product.name}</h3>
              <p class="specs">${product.specs}</p>
            </div>

            <div class="product-content">
              <div class="product-visual">
                <img src="${imageUrl}"/>
                <div class="scanline-effect"></div>
              </div>

              <p class="description">${product.description}</p>

              <div class="product-price">
                <span class="amount">${product.price}</span
                ><span class="currency">EUR</span>
              </div>
            </div>

            <div class="product-footer">
              ${actionButton}
            </div>
          </article>
            `;
      container.innerHTML += productHtml;
    });
    updateProductsUI();
  } catch (err) {
    console.error("Erreur chargement news:", err);
  }
}
// --- CONFIGURATION ---
const MY_CRYPTO_ADDRESSES = {
  xmr: "XMR_WALLET",
  btc: "BTC_WALLET",
};

// Variable pour stocker les infos de commande actuelles
let currentOrder = null;

// Variables temporaires pour le produit sélectionné
let selectedProduct = null;

// --- ÉTAPE 1 : Clic sur le produit (initiateOrder) ---
// --- TAUX DE CONVERSION (à actualiser régulièrement) ---
let CRYPTO_PRICES = { xmr: 0, btc: 0 };

// --- Modifie ta fonction initiateOrder ---
async function initiateOrder(productId, productName, priceInEur) {
  if (!pb.authStore.isValid) return;

  try {
    // --- On crée la commande avec le prix EUR et les équivalents crypto ---
    const record = await pb.collection("orders").create({
      product: productId,
      status: "created",
      user: pb.authStore.model.id,
    });

    if (record) {
      const popup = document.getElementById("payment-popup");
      popup.showModal();
      document.getElementById("qrcode").innerHTML = "Génération...";

      // 1. CALCUL DES PRIX EN CRYPTO (Conversion en temps réel)
      await updateExchangeRates();
      const priceXmr = (priceInEur / CRYPTO_PRICES.xmr).toFixed(5);
      const priceBtc = (priceInEur / CRYPTO_PRICES.btc).toFixed(8);

      // On stocke les infos pour selectCrypto, avec les prix convertis
      currentOrder = {
        id: record.id,
        priceXmr: priceXmr, // Utilisé pour le paiement
        priceBtc: priceBtc,
        price_at_purchase: priceXmr,
        currency: "xmr",
        status: "created",
      };

      // On génère le QR Code (Monero par défaut)
      selectCrypto("xmr");

      // UI
      document.getElementById("popup-item-name").textContent = productName;
      document.getElementById("popup-item-price-eur").textContent =
        priceInEur + " €";
      document.getElementById("order-id-display").innerText =
        `ID: #${record.id}`;
    } else {
      alert("Impossible d'initier la commande, réessayez plus tard.");
    }
  } catch (err) {
    document.getElementById("qrcode").innerHTML = "Erreur de création.";
    console.error(err);
    alert(
      "Impossible d'initier la commande, réessayez plus tard. (" + err + ")",
    );
  }
}
// --- ÉTAPE 2 : Action dans la Popup ---

// A) Bouton Valider -> Passe en "pending"
async function finalizeOrder() {
  if (!currentOrder) return;

  let confirmation = confirm(
    "En cliquant sur ok vous confirmez avoir payé la commande. Sinon veuillez annuler.",
  );

  if (confirmation) {
    currentOrder.status = "pending";
    try {
      await pb.collection("orders").update(currentOrder.id, currentOrder);

      // On peut fermer la popup ou afficher un message "En attente de paiement"
      closePaymentPopup();
      alert(
        "Commande validée en attente de réception des fonds. Nous vous informerons de leurs bonne réception.",
      );
      updateAuthUI(); // Pour mettre à jour le statut dans la sidebar
      loadProducts();
    } catch (err) {
      alert("Erreur de validation.");
    }
  }
}

// B) Bouton Annuler -> Supprime la commande (si "created" ou "pending")
async function cancelOrderInPopup() {
  if (!currentOrder) return;
  try {
    await pb.collection("orders").delete(currentOrder.id);
    closePaymentPopup();
    loadProducts();
    updateAuthUI();
  } catch (err) {
    alert("Erreur lors de l'annulation.");
  }
}
// ÉTAPE 2 : L'utilisateur clique sur "Valider" dans la popup
function openPaymentPopup(itemName, itemPrice, orderId) {
  document.getElementById("popup-item-name").textContent = itemName;
  document.getElementById("popup-message").innerHTML = "";
  document.getElementById("payment-details").style.display = "block";

  // Sélectionner XMR par défaut
  setTimeout(() => {
    selectCrypto("xmr");
  }, 100);
}

function selectCrypto(type) {
  if (!currentOrder) return;

  const address = MY_CRYPTO_ADDRESSES[type];
  const qrContainer = document.getElementById("qrcode");
  qrContainer.innerHTML = "";

  // Utiliser le bon prix selon la crypto choisie
  let amountToPay =
    type === "xmr" ? currentOrder.priceXmr : currentOrder.priceBtc;
  currentOrder.currency = type;
  currentOrder.price_at_purchase = amountToPay;
  let paymentUrl = "";

  if (type === "btc") {
    paymentUrl = `bitcoin:${address}?amount=${amountToPay}`;
  } else {
    paymentUrl = `monero:${address}?tx_amount=${amountToPay}&tx_description=RetroNexus-${currentOrder.id}`;
  }

  // --- MISE À JOUR UI ---
  document.getElementById("crypto-type").textContent = type.toUpperCase();
  document.getElementById("popup-address").textContent = address;
  document.getElementById("popup-amount-crypto").textContent =
    amountToPay + " " + type.toUpperCase();

  // --- GÉNÉRATION QR CODE (ancienne méthode) ---
  const qr = qrcode(0, "M");
  qr.addData(paymentUrl);
  qr.make();
  const img = document.createElement("img");
  img.src = qr.createDataURL(6, 10);
  qrContainer.appendChild(img);
}
function closePaymentPopup() {
  document.getElementById("payment-popup").close();
}
// 2. Mise à jour via l'API (Logique simplifiée)
async function updateExchangeRates() {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,monero&vs_currencies=eur",
    );
    const data = await response.json();

    // On teste les deux formats possibles pour être tranquille
    const btcPrice = data.bitcoin ? data.bitcoin.eur : data.btc;
    const xmrPrice = data.monero ? data.monero.eur : data.xmr;

    if (btcPrice && xmrPrice) {
      CRYPTO_PRICES.btc = btcPrice;
      CRYPTO_PRICES.xmr = xmrPrice;
    } else {
      console.error("Format de réponse inconnu :", data);
    }
  } catch (error) {
    console.error("❌ Erreur de récupération des taux :", error);
  }
}
