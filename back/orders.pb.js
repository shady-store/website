onRecordAfterUpdateSuccess((e) => {
  // --- ON DÉCLARE LA FONCTION ICI ---
  const sendOrderEmail = (app, usr, prd, record, isOutOfStock) => {
    const userEmail = usr.get("email");
    const userName = usr.get("name") || "Client";
    const productName = prd.get("name");
    const newStatus = record.get("status");
    const idCmd = record.id;

    let subject = `Mise à jour de votre commande : ${productName}`;
    let body = isOutOfStock
      ? `Bonjour ${userName}, votre commande n°<b>${idCmd}</b> a été annulée (Rupture de stock).`
      : `Bonjour ${userName}, le statut de votre commande n°<b>${idCmd}</b> est : <b>${newStatus}</b>.`;

    const message = new MailerMessage({
      from: {
        address: app.settings().meta.senderAddress,
        name: app.settings().meta.senderName,
      },
      to: [{ address: userEmail }],
      subject: subject,
      html: body,
    });
    app.newMailClient().send(message);
  };

  try {
    const record = e.record;
    const newStatus = record.get("status");

    e.app.expandRecord(record, ["user", "product"], null);
    const usr = record.expandedOne("user");
    const prd = record.expandedOne("product");

    if (!usr || !prd) return e.next();

    let isOutOfStock = false;
    const currentStock = prd.get("stock") || 0;

    if (newStatus === "pending") {
      if (currentStock > 0) {
        prd.set("stock", currentStock - 1);
        e.app.save(prd);
      } else {
        isOutOfStock = true;
        e.app
          .db()
          .newQuery("UPDATE orders SET status = 'canceled' WHERE id = {:id}")
          .bind({ id: record.id })
          .execute();
        record.set("status", "canceled");
      }
    } else if (newStatus === "canceled") {
      prd.set("stock", currentStock + 1);
      e.app.save(prd);
    }

    // Appel de la fonction définie juste au-dessus
    sendOrderEmail(e.app, usr, prd, record, isOutOfStock);
  } catch (err) {
    console.log("### ERREUR HOOK ### " + err);
  }
  e.next();
}, "orders");
