function showView(viewId) {
  setTimeout(() => {
    // 1. On cache toutes les vues
    document.querySelectorAll(".page-view").forEach((view) => {
      view.style.display = "none";
    });

    // 2. On affiche celle demandée
    document.getElementById(viewId).style.display = "block";

    // 3. Petit effet "Terminal" : on scroll en haut de la zone de contenu
    window.scrollTo(0, 0);
  }, 300);
}
// Liaison avec tes liens de navigation
document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault(); // Empêche le saut de page
    const overlay = document.getElementById("terminal-overlay");

    // 1. Déclenche l'effet visuel
    overlay.classList.remove("glitch-active");
    void overlay.offsetWidth; // Force le redémarrage de l'animation
    overlay.classList.add("glitch-active");
    const target = link.getAttribute("href").replace("#", "");

    if (target === "news") showView("view-news");
    if (target === "articles");
    if (target === "builds") showView("view-builds");
    if (target === "about") showView("view-about");
  });
});
async function loadNews() {
  try {
    // On récupère les articles actifs, du plus récent au plus ancien
    const records = await pb.collection("news").getFullList({
      filter: "active = true",
      sort: "-created",
    });

    const container = document.getElementById("view-news");
    //container.innerHTML = ""; // On nettoie l'accueil

    records.forEach((news) => {
      const date = new Date(news.created).toLocaleDateString();

      console.log(news);
      // On crée le HTML façon "Terminal"
      const article = `
          <section id="news1" class="news">
            <h3>${news.title}</h3>
            <div class="news-meta">postée le : ${date} | Cat : ${news.category}</div>
            <p>
              ${news.content2}
            </p>
          </section>
            `;
      container.innerHTML += article;
      hljs.highlightAll();
    });
  } catch (err) {
    console.error("Erreur chargement news:", err);
  }
} // --- FONCTION POUR PEUPLER LE SOUS-MENU DES ARTICLES ---
function createLink(post) {
  const link = document.createElement("a");
  link.href = "#"; // On gère le clic en JS
  link.textContent = `>_ ${post.title}`;

  // 5. Associer l'action de clic pour charger l'article dans la page
  link.onclick = (e) => {
    e.preventDefault();
    // On appelle ta fonction existante pour afficher l'article complet
    showFullArticle(post.id);
  };
  return link;
}
async function populateArticleSubmenu() {
  const submenu = document.getElementById("article-submenu");

  if (!submenu) {
    console.error("Élément 'article-submenu' introuvable dans le HTML.");
    return;
  }

  try {
    // 1. Récupérer la liste des articles depuis PocketBase
    // On ne demande que les champs nécessaires pour alléger la requête
    const records = await pb.collection("posts").getFullList({
      filter: "active = true", // Optionnel: pour n'afficher que les articles publiés
      sort: "-created", // Du plus récent au plus ancien
      fields: "id,title", // Optimisation: on ne télécharge pas le contenu complet
    });

    // 2. Vider le menu actuel
    submenu.innerHTML = "";

    // 3. Cas où il n'y a pas d'articles
    if (records.length === 0) {
      submenu.innerHTML = "<a>> Aucun article</a>";
      return;
    }

    const viewarticles = document.getElementById("view-articles");
    // 4. Générer les liens dynamiquement
    records.forEach((post) => {
      //viewarticles.appendChild(createLink(post));
      submenu.appendChild(createLink(post));
    });
  } catch (err) {
    console.error("Erreur lors du chargement du sous-menu :", err);
    submenu.innerHTML = "<a>> Erreur chargement</a>";
  }
}
// --- FONCTION POUR AFFICHER L'ARTICLE COMPLET ---
async function showFullArticle(postId) {
  const container = document.getElementById("view-articles");

  if (!container) return;

  // 1. Afficher un indicateur de chargement
  container.innerHTML = "<div class='loading'>LOADING_ENTRY...</div>";

  try {
    // 2. Récupérer l'article complet depuis PocketBase
    const post = await pb.collection("posts").getOne(postId);

    // 3. Générer le HTML de l'article
    // On gère l'image s'il y en a une, sinon on l'ignore
    const imageUrl = post.image ? pb.files.getUrl(post, post.image) : null;

    container.innerHTML = `
            <article class="full-post">
                <h2>>_ ${post.title}</h2>
                <p class="date">${new Date(post.created).toLocaleDateString()}</p>
                <hr>
                
                ${imageUrl ? `<img src="${imageUrl}" alt="${post.title}" style="max-width:100%; height:auto; margin-bottom:20px;">` : ""}
                
                <div class="content">
                    ${post.content} 
                </div>
            </article>
        `;

    // 4. --- COLORATION SYNTAXIQUE (Highlight.js) ---
    // Cette fonction scanne le HTML injecté et colore le code
    hljs.highlightAll();

    showView("view-articles");
    // 5. Scroll vers le haut pour une meilleure expérience utilisateur
    window.scrollTo(0, 0);
  } catch (err) {
    console.error("Erreur chargement article:", err);
    container.innerHTML = `
            <div class='error'>
                <h2>ERREUR_FATALE</h2>
                <p>Impossible de charger l'article spécifié.</p>
                <button onclick="loadMainArticles()" class="btn-retro"><< BACK_TO_FEED</button>
            </div>
        `;
  }
}
