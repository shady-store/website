// Fermer si on clique à côté
window.onclick = function (event) {
  let modal = document.getElementById("register-modal");
  if (event.target == modal) closeRegister();
};
const passwordInput = document.getElementById("password");
passwordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    login();
  }
});
// Fonctions pour la Modale
function register() {
  document.getElementById("register-modal").style.display = "block";
}

function closeRegister() {
  document.getElementById("register-modal").style.display = "none";
}
// Logique d'inscription
async function executeRegister() {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const passwordConfirm = document.getElementById("reg-password-confirm").value;
  const errorBox = document.getElementById("reg-error");

  errorBox.innerText = "";

  try {
    const data = {
      name: "user_" + Math.random().toString(36).substring(7), // Génère un pseudo temporaire
      emailVisibility: true,
      email: email,
      password: password,
      passwordConfirm: passwordConfirm,
    };

    await pb.collection("users").create(data);

    // Optionnel : Envoyer le mail de vérification automatiquement
    await pb.collection("users").requestVerification(email);

    alert("INSCRIPTION RÉUSSIE. Vérifie tes mails pour valider ton accès.");
    closeRegister();
  } catch (err) {
    errorBox.innerText = "ERREUR: " + err.message;
  }
}
// --- FONCTION POUR CHARGER LES COMMANDES ---
async function loadUserOrders(container) {
  container.innerHTML =
    "<p style='font-size:0.8rem; color:#666;'>Chargement commandes...</p>";

  try {
    // Récupérer les commandes de l'utilisateur
    const records = await pb.collection("orders").getFullList({
      filter: `user = "${pb.authStore.model.id}"`,
      sort: "-created",
      expand: "product", // Pour avoir les infos du produit
    });

    if (records.length === 0) {
      container.innerHTML =
        "<p style='font-size:0.8rem; color:#666;'>Aucune commande.</p>";
      return;
    }

    let html =
      "<h4 style='color:var(--accent); font-size:0.9rem; margin-top:10px;'>[ COMMANDES ]</h4>";
    html +=
      "<div style='max-height:150px; overflow-y:auto; font-size:0.8rem;'>";

    records.forEach((order) => {
      const productName = order.expand?.product?.name || "Produit supprimé";
      const isPending = order.status === "pending";
      const date = new Date(order.updated);
      const dateMaj = date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      let statusClass = null;
      if (order.status === "pending") {
        statusClass = "offline";
      } else if (order.status === "paid") {
        statusClass = "comingup";
      } else if (order.status === "shipped") {
        statusClass = "online";
      } else {
        statusClass = "offline";
      }
      // On n'affiche le bouton supprimer [X] que si c'est en attente
      const deleteBtn = isPending
        ? `<span onclick="deleteOrder('${order.id}')" style="cursor:pointer; color:var(--accent); float:right;">[X]</span>`
        : "";

      html += `
        <div style="border-bottom: 1px solid #222; padding: 5px 0; overflow: hidden;">
            ${deleteBtn}
            <div style="color:#aaa;">${productName} (${dateMaj})</div>
            <div class="${statusClass}" style="font-size:0.7rem;">STATUS: ${order.status.toUpperCase()}</div>
        </div>
    `;
    });

    html += "</div>";
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = "<p class='offline'>Erreur chargement</p>";
  }
}
async function deleteOrder(orderId) {
  if (!confirm("Annuler cette commande ?")) return;

  try {
    const order = await pb.collection("orders").getOne(orderId);
    if (order.status === "created") {
      await pb.collection("orders").delete(orderId);
    } else {
      await pb.collection("orders").update(orderId, { status: "canceled" });
    }

    // On rafraîchit l'affichage immédiatement
    const orderHistoryContainer = document.getElementById("order-history");
    if (orderHistoryContainer) {
      loadUserOrders(orderHistoryContainer);
    }
    loadProducts();
  } catch (err) {
    console.error("Erreur suppression :", err);
    alert("Impossible de supprimer la commande.");
  }
}
// Mise à jour de l'interface selon l'état de connexion
function updateAuthUI() {
  const isLogged = pb.authStore.isValid;
  const loggedOutBox = document.getElementById("auth-logged-out");
  const loggedInBox = document.getElementById("auth-logged-in");
  const userDisplay = document.getElementById("user-display");

  // Conteneur pour l'historique dans la sidebar
  let orderHistoryContainer = document.getElementById("order-history");
  if (!orderHistoryContainer) {
    // Créer le conteneur s'il n'existe pas encore
    orderHistoryContainer = document.createElement("div");
    orderHistoryContainer.id = "order-history";
    loggedInBox.appendChild(orderHistoryContainer);
  }
  if (isLogged) {
    loggedOutBox.style.display = "none";
    loggedInBox.style.display = "block";
    // Affiche l'username ou l'email si l'username est vide
    userDisplay.innerText = `USER: ${pb.authStore.model.name || pb.authStore.model.email}`;
    loadChatHistory();
    subscribeToMessages();
    // --- CHARGEMENT DES COMMANDES ---
    loadUserOrders(orderHistoryContainer);
  } else {
    loggedOutBox.style.display = "block";
    loggedInBox.style.display = "none";
    orderHistoryContainer.innerHTML = "";
  }
}
// Fonction de Connexion
async function login() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;

  try {
    const authData = await pb.collection("users").authWithPassword(email, pass);
    // On vérifie si l'utilisateur est vérifié
    if (!authData.record.verified) {
      alert("COMPTE NON VÉRIFIÉ. Veuillez consulter vos emails (spam inclus).");
      pb.authStore.clear(); // On le déconnecte immédiatement
      updateAuthUI();
      return;
    }
    cleanOldOrders();
    updateAuthUI();
    updateProductsUI();
  } catch (err) {
    alert("ERREUR D'ACCÈS: Vérifiez vos identifiants.");
  }
}
// Fonction de Déconnexion
function logout() {
  cleanOldOrders();
  // 1. On coupe l'abonnement Realtime
  pb.collection("messages").unsubscribe();
  subscribed = false;

  // 2. On vide le store (suppression du token)
  pb.authStore.clear();

  // 3. On met à jour l'interface
  updateAuthUI();

  // Optionnel : vider la fenêtre de chat pour que le prochain
  // utilisateur ne voie pas l'historique du précédent
  document.getElementById("chat-window").innerHTML = "";
}
// --- Nouvelle fonction pour supprimer les commandes "created" ---
async function cleanOldOrders() {
  try {
    const userId = pb.authStore.model.id;

    // 1. Trouver les commandes
    const oldOrders = await pb.collection("orders").getList(1, 50, {
      filter: `user = "${userId}" && status = "created"`,
      // On désactive l'auto-cancellation pour cette requête
      $autoCancel: false,
    });

    // 2. Les supprimer une par une
    for (const order of oldOrders.items) {
      await pb.collection("orders").delete(order.id, {
        // Et aussi pour chaque suppression
        $autoCancel: false,
      });
    }
  } catch (err) {
    console.error("❌ Erreur lors du nettoyage :", err);
  }
}
