/**
 * throttleCall(fn, ms, msg)
 * Retourne une fonction wrapper qui n'appelle `fn` qu'une seule fois
 * toutes les `ms` millisecondes. Si un appel est fait trop tôt, affiche
 * un alert avec `msg` et renvoie undefined.
 */
function throttleCall(fn, ms, msg) {
  let lastCall = 0;
  return async (...args) => {
    const now = Date.now();
    if (now - lastCall < ms) {
      if (msg) alert(msg);
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

/**
 * Throttle par collection + action.
 * Usage : throttledPB(collection, action, ms, msg)
 * Ex : throttledPB("messages", "create", 2000, "Un message toutes les 2s svp")
 *
 * Retourne une fonction qui, quand on l'appelle avec le callback réel,
 * applique le throttle de manière globale (partagé entre tous les appels
 * sur la même collection+action).
 */
const _throttleRegistry = {};
function throttledPB(collection, action, ms, msg) {
  const key = `${collection}:${action}`;
  let lastCall = _throttleRegistry[key] || 0;

  return async (callback) => {
    const now = Date.now();
    if (now - lastCall < ms) {
      if (msg) alert(msg);
      return;
    }
    lastCall = now;
    _throttleRegistry[key] = now;
    return callback();
  };
}
