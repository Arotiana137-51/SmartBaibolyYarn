// In-repo shim for `inflight@1.0.6`.
//
// Addresses SNYK-JS-INFLIGHT-6095116 (CWE-772, memory leak in `reqs`).
//
// The original package wraps the resolver in `once()`, which means that when
// a callback queues more work for the same key, the upstream code's
// `process.nextTick(function () { RES.apply(null, args) })` is a no-op (RES
// has already been "consumed" by once), and the key is never deleted from
// the `reqs` map. Over a long-running process with high key turnover this
// leaks memory.
//
// This shim is byte-for-byte similar to upstream but:
//   1. Drops the `once()` wrapping. The resolver is still effectively
//      one-shot for the *primary* callback list because the key is deleted
//      before any re-entry, but the re-scheduled tail call is allowed.
//   2. Drops the `wrappy()` wrap, which only existed to make the once()
//      function look like the original.
//   3. Removes the `once` and `wrappy` dependencies entirely.
//
// Build-time only — see SECURITY.md.

'use strict';

const reqs = Object.create(null);

function inflight(key, cb) {
  if (reqs[key]) {
    reqs[key].push(cb);
    return null;
  } else {
    reqs[key] = [cb];
    return makeres(key);
  }
}

function makeres(key) {
  let fired = false;
  return function RES() {
    if (fired) return;
    fired = true;

    const cbs = reqs[key];
    if (!cbs) return;
    const len = cbs.length;
    const args = slice(arguments);

    try {
      for (let i = 0; i < len; i++) {
        cbs[i].apply(null, args);
      }
    } finally {
      if (cbs.length > len) {
        cbs.splice(0, len);
        // Re-arm the resolver for the newly enqueued callbacks. Crucially,
        // the next resolver gets its own `fired` flag and will delete the
        // key when it runs, closing the leak the upstream package has.
        const next = makeres(key);
        process.nextTick(function () {
          next.apply(null, args);
        });
      } else {
        delete reqs[key];
      }
    }
  };
}

function slice(args) {
  const length = args.length;
  const array = new Array(length);
  for (let i = 0; i < length; i++) array[i] = args[i];
  return array;
}

module.exports = inflight;
