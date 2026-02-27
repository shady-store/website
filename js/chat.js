async function loadChatHistory() {
  try {
    // On récupère la page 1, avec 50 éléments
    const resultList = await pb.collection("messages").getList(1, 50, {
      sort: "-created", // Les plus récents en premier
      expand: "user", // Indispensable pour avoir l'email/username !
    });

    // Comme on les a récupérés du plus récent au plus ancien,
    // on inverse la liste pour l'affichage (le plus vieux en haut)
    const messages = resultList.items.reverse();

    messages.forEach((msg) => {
      renderMessage(msg);
    });
  } catch (err) {
    console.error("Erreur de chargement du chat :", err);
  }
}
async function subscribeToMessages() {
  // On s'abonne à TOUS les événements sur la collection 'messages'
  pb.collection("messages").subscribe(
    "*",
    function (e) {
      if (e.action === "create") {
        console.log(
          "Nouveau message reçu :",
          e.record.text,
          "utilisateur : ",
          e.record.expand.user.email,
        );
        renderMessage(e.record); // Une fonction pour ajouter le message au HTML
      }
    },
    { expand: "user" },
  );
}
async function renderMessage(record) {
  const chatWindow = document.getElementById("chat-window");
  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = `<span class="user">${record.expand.user.name}</span>:<span class="content">${record.text}</span>`;

  // MAIS on utilise textContent pour les données utilisateur
  div.querySelector(".user").textContent = record.expand.user.name;
  div.querySelector(".content").textContent = record.text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
const input = document.getElementById("user-input");
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});
async function sendMessage() {
  const messageInput = document.getElementById("user-input");
  const content = messageInput.value;

  if (!content) return;

  try {
    // On prépare la donnée avec l'ID de l'utilisateur actuellement connecté
    const data = {
      text: content,
      user: pb.authStore.model.id,
    };

    // On ATTEND que le serveur confirme l'enregistrement
    await pb.collection("messages").create(data);

    // Une fois seulement que c'est fait, on vide l'input
    messageInput.value = "";
  } catch (err) {
    console.error("Erreur d'envoi :", err);
    alert("Impossible d'envoyer le message.");
  }
}
