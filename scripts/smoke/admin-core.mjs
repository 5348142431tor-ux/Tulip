const API_BASE_URL = process.env.TULIP_API_BASE_URL || 'http://127.0.0.1:3000';

const CREDENTIALS = {
  owner: { login: 'owner', password: 'TulipOwner2026!' },
  companyAdmin: { login: 'ST-00', password: 'TulipAdmin2026!' },
  manager: { login: 'ST-01', password: 'TulipManager2026!' },
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(path, options = {}) {
  const { headers = {}, ...restOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${response.statusText} ${text}`);
  }

  return data;
}

async function loginAs(key) {
  const credentials = CREDENTIALS[key];
  const data = await requestJson('/api/admin-auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  assert(data?.item?.token, `${key}: login did not return session token`);
  assert(data?.item?.user?.role, `${key}: login did not return user role`);
  return data.item;
}

async function main() {
  const health = await requestJson('/health');
  assert(health?.status === 'ok', 'Health endpoint did not return ok');

  const ownerSession = await loginAs('owner');
  const companyAdminSession = await loginAs('companyAdmin');
  const managerSession = await loginAs('manager');

  const ownerAuth = { Authorization: `Bearer ${ownerSession.token}` };
  const companyAdminAuth = { Authorization: `Bearer ${companyAdminSession.token}` };
  const managerAuth = { Authorization: `Bearer ${managerSession.token}` };

  const ownerSessionInfo = await requestJson('/api/admin-auth/session', { headers: ownerAuth });
  assert(ownerSessionInfo?.item?.user?.role === 'project_owner', 'Owner session role mismatch');

  const targets = await requestJson('/api/admin-auth/targets', { headers: ownerAuth });
  assert(Array.isArray(targets?.items) && targets.items.length > 0, 'Owner impersonation targets are empty');

  const ownerProperties = await requestJson('/api/properties', { headers: ownerAuth });
  assert(Array.isArray(ownerProperties?.items) && ownerProperties.items.length > 0, 'Owner properties list is empty');

  const companyProfile = await requestJson('/api/company-profile', { headers: companyAdminAuth });
  assert(companyProfile?.item?.companyId || companyProfile?.item?.title, 'Company admin profile is missing');

  const companyManagers = await requestJson('/api/managers', { headers: companyAdminAuth });
  assert(Array.isArray(companyManagers?.items), 'Company managers response is not an array');

  const companyRequests = await requestJson('/api/requests', { headers: companyAdminAuth });
  assert(Array.isArray(companyRequests?.items), 'Company requests response is not an array');

  const managerProperties = await requestJson('/api/properties', { headers: managerAuth });
  assert(Array.isArray(managerProperties?.items), 'Manager properties response is not an array');
  assert(managerProperties.items.length > 0, 'Manager properties list is empty');

  const managerRequests = await requestJson('/api/requests', { headers: managerAuth });
  assert(Array.isArray(managerRequests?.items), 'Manager requests response is not an array');

  console.log('SMOKE_OK');
  console.log(JSON.stringify({
    ownerProperties: ownerProperties.items.length,
    companyManagers: companyManagers.items.length,
    companyRequests: companyRequests.items.length,
    managerProperties: managerProperties.items.length,
    managerRequests: managerRequests.items.length,
  }, null, 2));
}

main().catch((error) => {
  console.error('SMOKE_FAILED');
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
