const API_BASE_URL = process.env.TULIP_API_BASE_URL || 'http://127.0.0.1:3000';

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

async function loginAsManager() {
  const data = await requestJson('/api/admin-auth/login', {
    method: 'POST',
    body: JSON.stringify(MANAGER_CREDENTIALS),
  });

  assert(data?.item?.token, 'Manager login did not return session token');
  assert(data?.item?.user?.role === 'manager', 'Manager login returned wrong role');
  return data.item;
}

async function main() {
  const session = await loginAsManager();
  const auth = { Authorization: `Bearer ${session.token}` };

  const propertiesData = await requestJson('/api/properties', { headers: auth });
  assert(Array.isArray(propertiesData?.items) && propertiesData.items.length > 0, 'Manager has no visible properties');

  const propertyCode = propertiesData.items[0].code;
  assert(propertyCode, 'Visible property has no code');

  const propertyData = await requestJson(`/api/properties/${propertyCode}`, { headers: auth });
  const property = propertyData?.item;
  assert(property?.code === propertyCode, 'Detailed property response is invalid');
  assert(Array.isArray(property?.units) && property.units.length > 0, 'Property has no units in detail response');

  const unit = property.units[0];
  assert(unit?.code, 'Unit code is missing');

  const payload = {
    floor: unit.floor || '',
    area: unit.area || 0,
    layoutType: unit.layoutType || '',
    layoutFeature: unit.layoutFeature || '',
    waterAccountNumber: unit.waterAccountNumber || '',
    electricityAccountNumber: unit.electricityAccountNumber || '',
  };

  const updateData = await requestJson(`/api/units/${unit.code}/profile`, {
    method: 'PUT',
    headers: auth,
    body: JSON.stringify(payload),
  });

  const updatedProperty = updateData?.item;
  assert(updatedProperty?.code === propertyCode, 'Updated property response is invalid');
  const updatedUnit = Array.isArray(updatedProperty?.units)
    ? updatedProperty.units.find((item) => item.code === unit.code)
    : null;
  assert(updatedUnit, 'Updated unit is missing from property response');
  assert(Number(updatedUnit.area || 0) === Number(payload.area || 0), 'Updated unit area mismatch');
  assert((updatedUnit.layoutType || '') === payload.layoutType, 'Updated layout type mismatch');

  console.log('UNIT_PROFILE_SMOKE_OK');
  console.log(JSON.stringify({
    propertyCode,
    unitCode: unit.code,
    manager: session.user?.name || MANAGER_CREDENTIALS.login,
  }, null, 2));
}

main().catch((error) => {
  console.error('UNIT_PROFILE_SMOKE_FAILED');
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
