/* global migrate */

const ADMIN_RULE = '@request.auth.collectionName = "admins"';

const DICTIONARY_COLLECTIONS = [
  "sale_project_styles",
  "sale_project_foundation_types",
  "sale_project_wall_materials",
  "sale_project_roof_materials",
  "sale_project_facade_materials",
];

const DEFAULT_RATE_LIMITS = [
  // Login attempts originate from guests; five attempts per minute permits
  // normal correction of a password typo while slowing credential stuffing.
  { label: "*:auth", audience: "@guest", duration: 60, maxRequests: 5 },
  // There are currently no guest write APIs. This guard keeps future public
  // create routes from becoming an unbounded abuse vector.
  { label: "*:create", audience: "@guest", duration: 60, maxRequests: 20 },
  // The CSV importer creates records sequentially, so authenticated admins
  // receive a higher ceiling that does not interrupt a normal import.
  { label: "*:create", audience: "@auth", duration: 60, maxRequests: 600 },
  { label: "/api/batch", audience: "", duration: 1, maxRequests: 3 },
  { label: "/api/", audience: "", duration: 10, maxRequests: 300 },
];

migrate((app) => {
  // The frontend authenticates only against `admins`. `users` was an unused,
  // publicly creatable auth collection and enabled privilege escalation into
  // the dictionaries below.
  const users = app.findCollectionByNameOrId("users");
  users.listRule = null;
  users.viewRule = null;
  users.createRule = null;
  users.updateRule = null;
  users.deleteRule = null;
  users.passwordAuth.enabled = false;
  users.otp.enabled = false;
  users.oauth2.enabled = false;
  app.save(users);

  for (const name of DICTIONARY_COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(name);
    collection.createRule = ADMIN_RULE;
    collection.updateRule = ADMIN_RULE;
    collection.deleteRule = ADMIN_RULE;
    app.save(collection);
  }

  const settings = app.settings();
  // Nginx overwrites X-Real-IP and PocketBase is bound to loopback only, so
  // the builtin limiter can safely distinguish actual visitor addresses.
  settings.trustedProxy.headers = ["X-Real-IP"];
  settings.trustedProxy.useLeftmostIP = false;
  settings.rateLimits.enabled = true;
  settings.rateLimits.rules = DEFAULT_RATE_LIMITS;
  app.save(settings);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.createRule = "";
  users.updateRule = "id = @request.auth.id";
  users.deleteRule = "id = @request.auth.id";
  users.passwordAuth.enabled = true;
  users.otp.enabled = false;
  users.oauth2.enabled = false;
  app.save(users);

  for (const name of DICTIONARY_COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(name);
    collection.createRule = "@request.auth.id != ''";
    collection.updateRule = "@request.auth.id != ''";
    collection.deleteRule = "@request.auth.id != ''";
    app.save(collection);
  }

  const settings = app.settings();
  settings.trustedProxy.headers = [];
  settings.trustedProxy.useLeftmostIP = false;
  settings.rateLimits.enabled = false;
  settings.rateLimits.rules = [
    { label: "*:auth", audience: "", duration: 3, maxRequests: 2 },
    { label: "*:create", audience: "", duration: 5, maxRequests: 20 },
    { label: "/api/batch", audience: "", duration: 1, maxRequests: 3 },
    { label: "/api/", audience: "", duration: 10, maxRequests: 300 },
  ];
  app.save(settings);
});
