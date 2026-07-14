# Release signing — Verified CRX Uploads

This item has **Verified CRX Uploads** enabled on the Chrome Web Store, so every update
must be uploaded as a **`.crx` signed with our private key** (a plain `.zip` will be
rejected). This protects the extension: even if the Google/CWS account is compromised, an
attacker cannot ship an update without the private key.

Docs: https://developer.chrome.com/docs/webstore/update#protect-package-updates

## Where the key lives (do NOT commit)

- Private key: `~/Developer/Web/Chrome/cleanor-image-extension-signing/cleanor-image-ext.pem`
  (kept **outside** this public repo; `*.pem` / `*.crx` are also gitignored as a safety net)
- **Back it up** in a password manager / secure offline store. If lost, reverting Verified
  CRX Uploads requires contacting CWS support (~1 week).

Public key (safe to share; this is what was pasted into the dashboard when opting in):

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy5y6WBdQmckoMVjdeJ6k
uiG7UzVrCxrd0sFtnLOwL3zOzATphGN4zxRogTU9rrcfbbJZo2wN9N7v5h1kGQcR
o7sZOaeX6l7loym8SEFIzvthN5fc1AsCfg5BfW0msgJlVu07heXoy2Lh6dK2x/0A
E4U6Gvxhetu/YbndVz0xvleK26XYf/RGjb8EyhvilqtNBgHwo3PUbBq+FmDSUVYa
l/5Xgmd6ATAnPHVs4pWET5l4W3N3ZMWiJ29c35BVX/Wx52okVwHmLtgLTUODAd/O
1UqnghMuoPIo6+WFsWFMhvAE7FGCia/RW8zgD9FgAe+X/kcupsxuGpR+qjzIRli+
EwIDAQAB
-----END PUBLIC KEY-----
```

## Building a release

```
./pack-crx.sh          # builds cleanor-image-extension.zip + a signed .crx for this version
./pack-crx.sh --zip-only
```

Overrides: `CLEANOR_CRX_KEY=/path/key.pem  CHROME_BIN="/path/to/Google Chrome"  ./pack-crx.sh`

The signed CRX is written to the signing dir as `cleanor-image-extension-<version>.crx`.
Upload it via **Dev Dashboard → Package → Upload new package**.

## Generating the key (one-time; already done)

```
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out cleanor-image-ext.pem
openssl rsa -in cleanor-image-ext.pem -pubout      # public key → paste into "Opt In"
```

## Opt-in (one-time; do in the dashboard)

Dev Dashboard → item → **Package → Verified CRX Uploads → Opt In** → paste the public key
above. After that, all updates must be the signed `.crx`.
