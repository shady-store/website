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
// Mise à jour de l'interface selon l'état de connexion
function updateAuthUI() {
  const isLogged = pb.authStore.isValid;
  const loggedOutBox = document.getElementById("auth-logged-out");
  const loggedInBox = document.getElementById("auth-logged-in");
  const userDisplay = document.getElementById("user-display");

  if (isLogged) {
    loggedOutBox.style.display = "none";
    loggedInBox.style.display = "block";
    // Affiche l'username ou l'email si l'username est vide
    userDisplay.innerText = `USER: ${pb.authStore.model.name || pb.authStore.model.email}`;
    loadChatHistory();
    subscribeToMessages();
  } else {
    loggedOutBox.style.display = "block";
    loggedInBox.style.display = "none";
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
    updateAuthUI();
    updateProductsUI();
    console.log("Login réussi");
  } catch (err) {
    alert("ERREUR D'ACCÈS: Vérifiez vos identifiants.");
  }
}
// Fonction de Déconnexion
function logout() {
  // 1. On coupe l'abonnement Realtime
  pb.collection("messages").unsubscribe();

  // 2. On vide le store (suppression du token)
  pb.authStore.clear();

  // 3. On met à jour l'interface
  updateAuthUI();

  // Optionnel : vider la fenêtre de chat pour que le prochain
  // utilisateur ne voie pas l'historique du précédent
  document.getElementById("chat-window").innerHTML = "";
}
