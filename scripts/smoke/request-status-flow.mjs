const API_BASE_URL = process.env.TULIP_API_BASE_URL || 'http://127.0.0.1:3000';

const OWNER_CREDENTIALS = {
  login: 'owner',
  password: 'TulipOwner2026!',
};

const MANAGER_CREDENTIALS = {
  login: 'ST-01',
  password: 'TulipManager2026!',
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

async function login(credentials) {
  const data = await requestJson('/api/admin-auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  assert(data?.item?.token, `Login failed for ${credentials.login}`);
  return data.item;
}

async function impersonate(ownerToken, targetId) {
  const data = await requestJson('/api/admin-auth/impersonate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ targetId }),
  });

  assert(data?.item?.token, `Impersonation failed for ${targetId}`);
  return data.item;
}

async function main() {
  const ownerSession = await login(OWNER_CREDENTIALS);
  const managerSession = await login(MANAGER_CREDENTIALS);
  const ownerAuth = { Authorization: `Bearer ${ownerSession.token}` };
  const managerAuth = { Authorization: `Bearer ${managerSession.token}` };

  const managerPropertiesData = await requestJson('/api/properties', { headers: managerAuth });
  assert(Array.isArray(managerPropertiesData?.items) && managerPropertiesData.items.length > 0, 'Manager has no properties for request flow');

  const propertyCode = managerPropertiesData.items[0].code;
  const propertyDetailData = await requestJson(`/api/properties/${propertyCode}`, { headers: managerAuth });
  const property = propertyDetailData?.item;
  assert(property?.managerId === managerSession.user.id, 'Selected property is not assigned to the smoke-test manager');

  const targetUnit = Array.isArray(property?.units)
    ? property.units.find((unit) => Array.isArray(unit.owners) && unit.owners.some((owner) => owner.code))
    : null;
  assert(targetUnit?.code, 'No unit with owner found on manager property');

  const targetOwner = targetUnit.owners.find((owner) => owner.name);
  assert(targetOwner?.name, 'Owned unit has no client name');

  const targetsData = await requestJson('/api/admin-auth/targets', { headers: ownerAuth });
  const clientTarget = Array.isArray(targetsData?.items)
    ? targetsData.items.find((item) => item.role === 'client' && item.name === targetOwner.name)
    : null;
  assert(clientTarget?.id, 'Could not resolve client impersonation target for request flow');

  const clientSession = await impersonate(ownerSession.token, clientTarget.id);
  const clientAuth = { Authorization: `Bearer ${clientSession.token}` };

  const description = `Smoke request ${new Date().toISOString()} for ${targetUnit.code}`;
  const createData = await requestJson('/api/requests', {
    method: 'POST',
    headers: clientAuth,
    body: JSON.stringify({
      unitCode: targetUnit.code,
      description,
    }),
  });

  const createdRequest = createData?.item;
  assert(createdRequest?.code, 'Created request has no code');
  assert(createdRequest.status === 'new', 'Created request did not start in new status');
  assert(createdRequest.assigneeId === managerSession.user.id, 'Created request was not assigned to the expected manager');

  const inProgressData = await requestJson(`/api/requests/${createdRequest.code}/status`, {
    method: 'PATCH',
    headers: managerAuth,
    body: JSON.stringify({ status: 'in_progress' }),
  });
  assert(inProgressData?.item?.status === 'in_progress', 'Manager failed to move request to in_progress');

  const doneData = await requestJson(`/api/requests/${createdRequest.code}/status`, {
    method: 'PATCH',
    headers: managerAuth,
    body: JSON.stringify({ status: 'done' }),
  });
  assert(doneData?.item?.status === 'done', 'Manager failed to move request to done');
  assert(doneData?.item?.clientDecisionPending === true, 'Done request is not waiting for client decision');

  const acceptedData = await requestJson(`/api/requests/${createdRequest.code}/client-review`, {
    method: 'PATCH',
    headers: clientAuth,
    body: JSON.stringify({ action: 'accept' }),
  });
  assert(acceptedData?.item?.status === 'done', 'Client acceptance did not keep request in done status');
  assert(acceptedData?.item?.clientDecisionPending === false, 'Client acceptance did not clear pending decision');

  const managerRequestsData = await requestJson('/api/requests', { headers: managerAuth });
  const finalRequest = Array.isArray(managerRequestsData?.items)
    ? managerRequestsData.items.find((item) => item.code === createdRequest.code)
    : null;
  assert(finalRequest, 'Final request is missing from manager request list');
  assert(finalRequest.status === 'done', 'Final request status is not done');
  assert(Array.isArray(finalRequest.statusHistory) && finalRequest.statusHistory.length >= 4, 'Final request history is incomplete');

  console.log('REQUEST_STATUS_FLOW_SMOKE_OK');
  console.log(JSON.stringify({
    propertyCode,
    unitCode: targetUnit.code,
    clientCode: clientSession.user?.clientId || clientTarget.id,
    requestCode: createdRequest.code,
    requestNumber: createdRequest.requestNumber,
  }, null, 2));
}

main().catch((error) => {
  console.error('REQUEST_STATUS_FLOW_SMOKE_FAILED');
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
