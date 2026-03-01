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

      console.log(product);
      const imageUrl = product.image
        ? pb.files.getUrl(product, product.image)
        : "placeholder.jpg";
      const stockStatus = product.stock > 0 ? "EN STOCK" : "RUPTURE";
      const stockClass = product.stock > 0 ? "online" : "offline";
      var actionButton = `<button class="btn-buy" disabled>INDISPONIBLE</button>`;

      if (product.stock > 0) {
        actionButton = `
              <button
                class="btn-buy buy-btn"
                onclick="initiateOrder('${product.id}', '${product.price}')"
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

// Adresse de ton wallet Monero
const MY_CRYPTO_ADDRESS = "Votre_Adresse_Monero_Ici";

async function initiateOrder(productId, price) {
  // 1. Afficher un chargement dans la popup avant d'ouvrir
  //document.getElementById("payment-popup").textContent = "Chargement...";
  document.getElementById("qrcode").innerHTML = "";

  // On ouvre la popup vide pour montrer qu'on travaille
  document.getElementById("payment-popup").showModal();

  try {
    // 2. --- CRÉER LA COMMANDE DANS POCKETBASE ---
    const data = {
      product: productId,
      price: price,
      status: "pending",
      // On peut ajouter l'IP ou un cookie pour associer au client
    };

    const record = await pb.collection("orders").create(data);

    // 3. --- UTILISER L'ID DE COMMANDE GÉNÉRÉ ---
    // record.id est l'identifiant unique créé par PocketBase
    openPaymentPopup(productId, price, record.id);
  } catch (err) {
    console.error("Erreur création commande:", err);
    document.getElementById("popup-item-name").textContent =
      "Erreur de connexion";
  }
}
function openPaymentPopup(itemName, itemPrice, orderId) {
  const popup = document.getElementById("payment-popup");

  // 1. Remplir les infos
  document.getElementById("popup-item-name").textContent = itemName;
  document.getElementById("popup-item-price").textContent = itemPrice;
  document.getElementById("popup-address").textContent = MY_CRYPTO_ADDRESS;

  // 2. --- CRÉER L'URL AVEC ID DE COMMANDE DANS LA NOTE ---
  // On encode l'ID de commande pour qu'il passe bien dans une URL
  const encodedOrderId = encodeURIComponent(`RetroNexus-${orderId}`);

  // Format : monero:adresse?tx_amount=X&tx_description=ID
  const paymentUrl = `monero:${MY_CRYPTO_ADDRESS}?tx_amount=${itemPrice}&tx_description=${encodedOrderId}`;

  // 3. Générer le lien du wallet local
  const walletLink = document.getElementById("wallet-link");
  walletLink.href = paymentUrl;

  // 4. Générer le QR Code avec cette URL complète
  const qr = qrcode(0, "M");
  qr.addData(paymentUrl);
  qr.make();
  document.getElementById("qrcode").innerHTML = qr.createImgTag(5);

  // 5. Ouvrir la popup
  popup.showModal();
}
function closePopup() {
  const popup = document.getElementById("payment-popup");
  popup.close();
}
