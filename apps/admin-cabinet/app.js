import { resolveApiBaseUrl } from "./src/config.js";
import {
  generateTemporaryCompanyPassword,
  normalizeCompanyRecord,
  removeCompanyState,
  renderAdminPanelView,
  renderCompanyClientsView,
  upsertCompanyState,
} from "./src/companies.js";
import {
  canAccessView as canRoleAccessView,
  canAddProperties as canRoleAddProperties,
  canCreateRequests as canRoleCreateRequests,
  canManageProperty as canRoleManageProperty,
  getDefaultView,
  getRoleLabel,
} from "./src/accessModel.js";

const STORAGE_KEY = "tulip-admin-cabinet-data";
const STORAGE_VERSION = 1;
const AUTH_STORAGE_KEY = "tulip-admin-cabinet-auth";
const NAVIGATION_STORAGE_KEY = "tulip-admin-cabinet-navigation";

const API_BASE_URL = resolveApiBaseUrl();

const AUTH_USERS = [
  { id: "OWNER-01", name: "Aidima", role: "project_owner", label: getRoleLabel("project_owner") },
  { id: "ST-00", name: "Tulip Antalya Admin", role: "company_admin", label: getRoleLabel("company_admin") },
  { id: "ST-01", name: "Kemal Yilmaz", role: "manager", label: getRoleLabel("manager") },
  { id: "CLIENT-088", clientId: "CL-088", name: "Elena Petrova", role: "client", label: getRoleLabel("client") },
  { id: "CLIENT-031", clientId: "CL-031", name: "Ahmet Kaya", role: "client", label: getRoleLabel("client") },
  { id: "CLIENT-102", clientId: "CL-102", name: "Svetlana Mironova", role: "client", label: getRoleLabel("client") },
];

function getUserLabel(user) {
  if (!user) return "Гость";
  return user.label || getRoleLabel(user.role);
}

const DEFAULT_DATA_STORE = {
  companies: [],
  staff: [
    { id: "ST-00", name: "Tulip Antalya Admin", role: "company_admin", openRequests: 2 },
    { id: "ST-01", name: "Kemal Yilmaz", role: "manager", openRequests: 7 },
  ],
  clients: [
    {
      id: "CL-088",
      name: "Elena Petrova",
      role: "owner",
      phone: "+90 555 301 12 12",
      telegram: "@elenap",
      properties: ["Sunset Residence A-12", "Olive Garden Villa 4"],
      status: "active",
    },
    {
      id: "CL-031",
      name: "Ahmet Kaya",
      role: "tenant",
      phone: "+90 555 411 09 18",
      telegram: "@ahmetk",
      properties: ["Blue Coast B-8"],
      status: "active",
    },
    {
      id: "CL-102",
      name: "Svetlana Mironova",
      role: "owner",
      phone: "+90 555 901 44 02",
      telegram: "@svetlanam",
      properties: ["Marina Park C-3"],
      status: "inactive",
    },
  ],
  properties: [
    {
      id: "PR-019",
      code: "OBJ-001",
      title: "Sunset Residence A-12",
      city: "Antalya",
      district: "Konyaalti",
      type: "residential building",
      manager: "Kemal Yilmaz",
      status: "active",
      unitCount: 4,
      units: [
        {
          id: "PR-019-U1",
          number: "1",
          area: 120,
          floor: "1",
          debt: 0,
          residents: 3,
          status: "occupied",
          owners: [
            {
              clientId: "CL-088",
              name: "Elena Petrova",
              share: "100%",
              phone: "+90 555 301 12 12",
            },
          ],
        },
        {
          id: "PR-019-U2",
          number: "2",
          area: 110,
          floor: "1",
          debt: 14500,
          residents: 2,
          status: "occupied",
          owners: [
            {
              clientId: "CL-031",
              name: "Ahmet Kaya",
              share: "50%",
              phone: "+90 555 411 09 18",
            },
            {
              clientId: "CL-201",
              name: "Leyla Kaya",
              share: "50%",
              phone: "+90 555 411 09 19",
            },
          ],
        },
        {
          id: "PR-019-U3",
          number: "3",
          area: 115,
          floor: "2",
          debt: 3200,
          residents: 1,
          status: "occupied",
          owners: [
            {
              clientId: "CL-202",
              name: "Maksim Orlov",
              share: "100%",
              phone: "+90 555 818 24 10",
            },
          ],
        },
        {
          id: "PR-019-U4",
          number: "4",
          area: 130,
          floor: "2",
          debt: 0,
          residents: 0,
          status: "vacant",
          owners: [
            {
              clientId: "CL-203",
              name: "Deniz Aydin",
              share: "100%",
              phone: "+90 555 644 50 80",
            },
          ],
        },
      ],
    },
    {
      id: "PR-022",
      code: "OBJ-002",
      title: "Olive Garden Villa 4",
      city: "Bodrum",
      district: "Yalikavak",
      type: "villa complex",
      manager: "Kemal Yilmaz",
      status: "active",
      unitCount: 3,
      units: [
        {
          id: "PR-022-U1",
          number: "A",
          area: 210,
          floor: "Ground",
          debt: 10200,
          residents: 5,
          status: "occupied",
          owners: [
            {
              clientId: "CL-204",
              name: "Olga Sidorova",
              share: "70%",
              phone: "+90 555 710 40 30",
            },
            {
              clientId: "CL-205",
              name: "Pavel Sidorov",
              share: "30%",
              phone: "+90 555 710 40 31",
            },
          ],
        },
        {
          id: "PR-022-U2",
          number: "B",
          area: 190,
          floor: "Ground",
          debt: 0,
          residents: 4,
          status: "occupied",
          owners: [
            {
              clientId: "CL-206",
              name: "Mina Korkmaz",
              share: "100%",
              phone: "+90 555 722 51 99",
            },
          ],
        },
        {
          id: "PR-022-U3",
          number: "C",
          area: 200,
          floor: "First",
          debt: 7600,
          residents: 0,
          status: "maintenance watch",
          owners: [
            {
              clientId: "CL-207",
              name: "Roman Belov",
              share: "100%",
              phone: "+90 555 390 20 55",
            },
          ],
        },
      ],
    },
    {
      id: "PR-004",
      code: "OBJ-003",
      title: "Blue Coast B-8",
      city: "Antalya",
      district: "Lara",
      type: "residential building",
      manager: "Kemal Yilmaz",
      status: "maintenance watch",
      unitCount: 2,
      units: [
        {
          id: "PR-004-U1",
          number: "101",
          area: 98,
          floor: "1",
          debt: 5100,
          residents: 2,
          status: "occupied",
          owners: [
            {
              clientId: "CL-102",
              name: "Svetlana Mironova",
              share: "100%",
              phone: "+90 555 901 44 02",
            },
          ],
        },
        {
          id: "PR-004-U2",
          number: "102",
          area: 101,
          floor: "1",
          debt: 0,
          residents: 1,
          status: "occupied",
          owners: [
            {
              clientId: "CL-208",
              name: "Emre Kaplan",
              share: "50%",
              phone: "+90 555 998 66 10",
            },
            {
              clientId: "CL-209",
              name: "Zeynep Kaplan",
              share: "50%",
              phone: "+90 555 998 66 11",
            },
          ],
        },
      ],
    },
  ],
  requests: [
    {
      id: "REQ-1042",
      clientId: "CL-088",
      client: "Elena Petrova",
      property: "Olive Garden Villa 4",
      category: "repair",
      priority: "urgent",
      status: "in_progress",
      assignee: "Kemal Yilmaz",
      source: "telegram",
      createdAt: "2026-04-10 09:15",
      title: "Протечка в ванной",
    },
    {
      id: "REQ-1043",
      clientId: "CL-031",
      client: "Ahmet Kaya",
      property: "Blue Coast B-8",
      category: "document",
      priority: "medium",
      status: "waiting",
      assignee: "Kemal Yilmaz",
      source: "web",
      createdAt: "2026-04-10 08:20",
      title: "Продление договора аренды",
    },
    {
      id: "REQ-1044",
      clientId: "CL-102",
      client: "Svetlana Mironova",
      property: "Marina Park C-3",
      category: "payment",
      priority: "low",
      status: "done",
      assignee: "Tulip Antalya Admin",
      source: "admin",
      createdAt: "2026-04-09 17:40",
      title: "Подтверждение входящего платежа",
    },
    {
      id: "REQ-1045",
      clientId: "CL-088",
      client: "Elena Petrova",
      property: "Sunset Residence A-12",
      category: "service",
      priority: "high",
      status: "new",
      assignee: "Unassigned",
      source: "telegram",
      createdAt: "2026-04-10 10:05",
      title: "Проверка кондиционера",
    },
  ],
  payments: [
    {
      id: "PAY-8001",
      clientId: "CL-088",
      client: "Elena Petrova",
      property: "Sunset Residence A-12",
      amountDue: 8200,
      amountPaid: 8200,
      currency: "TRY",
      dueDate: "2026-04-15",
      status: "paid",
    },
    {
      id: "PAY-8002",
      clientId: "CL-088",
      client: "Elena Petrova",
      property: "Olive Garden Villa 4",
      amountDue: 10200,
      amountPaid: 5000,
      currency: "TRY",
      dueDate: "2026-04-15",
      status: "partial",
    },
    {
      id: "PAY-8003",
      clientId: "CL-031",
      client: "Ahmet Kaya",
      property: "Blue Coast B-8",
      amountDue: 5100,
      amountPaid: 0,
      currency: "TRY",
      dueDate: "2026-04-05",
      status: "overdue",
    },
  ],
  documents: [
    {
      id: "DOC-501",
      clientId: "CL-088",
      title: "Договор управления",
      client: "Elena Petrova",
      property: "Sunset Residence A-12",
      type: "contract",
      visibility: "client",
    },
    {
      id: "DOC-502",
      clientId: "CL-031",
      title: "Квитанция за март",
      client: "Ahmet Kaya",
      property: "Blue Coast B-8",
      type: "invoice",
      visibility: "client",
    },
    {
      id: "DOC-503",
      clientId: "CL-088",
      title: "Акт выполненных работ",
      client: "Elena Petrova",
      property: "Olive Garden Villa 4",
      type: "act",
      visibility: "internal + client",
    },
  ],
};

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeById(defaultItems = [], storedItems = [], idKey = "id") {
  const storedMap = new Map(
    storedItems
      .filter((item) => item && item[idKey])
      .map((item) => [item[idKey], item])
  );

  const merged = defaultItems.map((defaultItem) => {
    const storedItem = storedMap.get(defaultItem[idKey]);
    if (!storedItem) return defaultItem;
    return { ...defaultItem, ...storedItem };
  });

  storedItems.forEach((storedItem) => {
    if (!storedItem || !storedItem[idKey]) return;
    const exists = merged.some((item) => item[idKey] === storedItem[idKey]);
    if (!exists) {
      merged.push(storedItem);
    }
  });

  return merged;
}

function normalizeOwnerRecord(owner = {}, index = 0) {
  return {
    clientId: owner.clientId || `OWN-${index + 1}`,
    name: owner.name || "",
    share: owner.share || "",
    phone: owner.phone || "",
    telegramId: owner.telegramId || "",
  };
}

function normalizeBalanceEntries(entries = [], fallbackDebt = 0) {
  const normalized = Array.isArray(entries)
    ? entries
        .map((entry) => ({
          currency: entry?.currency || "TRY",
          amount: Number(entry?.amount || 0),
        }))
        .filter((entry) => entry.amount > 0)
    : [];

  if (!normalized.length && Number(fallbackDebt || 0) > 0) {
    normalized.push({
      currency: "TRY",
      amount: Number(fallbackDebt || 0),
    });
  }

  return normalized;
}

function normalizeChargeLogEntries(chargeLogs = [], fallbackType = "charge") {
  return (Array.isArray(chargeLogs) ? chargeLogs : []).map((charge, index) => {
    const period = charge?.period || toMonthInputValue(charge?.chargeDate || "") || "";
    const inferredType =
      charge?.chargeType ||
      (fallbackType === "aidat"
        ? "aidat"
        : String(charge?.note || charge?.chargeName || "").toLowerCase().includes("aidat")
          ? "aidat"
          : "charge");

    return {
      id: charge?.id || `charge-log-${fallbackType}-${index + 1}`,
      period,
      chargeDate: charge?.chargeDate || (period ? `${period}-01` : ""),
      chargeType: inferredType,
      chargeName:
        charge?.chargeName ||
        charge?.note ||
        (inferredType === "aidat" ? "Айдат" : "Начисление"),
      amountDue: Number(charge?.amountDue || 0),
      amountPaid: Number(charge?.amountPaid || 0),
      currency: charge?.currency || "TRY",
      status: charge?.status || "unpaid",
      note: charge?.note || "",
    };
  });
}

function normalizeAidatPaymentLogs(entries = []) {
  return (Array.isArray(entries) ? entries : []).map((entry, index) => ({
    id: entry?.id || `aidat-payment-${index + 1}`,
    amount: Number(entry?.amount || 0),
    appliedAmount: Number(entry?.appliedAmount || entry?.amount || 0),
    currency: entry?.currency || "TRY",
    receivedDate: entry?.receivedDate || "",
    recordedAt: entry?.recordedAt || "",
    note: entry?.note || "Оплата айдата",
  }));
}

function normalizeUnitRecord(unit = {}, propertyId = "PR-000", index = 0) {
  const unitNumber = String(unit.number || index + 1);
  return {
    id: unit.id || `${propertyId}-U${unitNumber}`,
    code: unit.code || `${propertyId}-U${unitNumber}`,
    number: unitNumber,
    area: Number(unit.area) || 0,
    floor: unit.floor || "-",
    layoutType: unit.layoutType || "",
    layoutFeature: unit.layoutFeature || "",
    waterAccountNumber: unit.waterAccountNumber || "",
    electricityAccountNumber: unit.electricityAccountNumber || "",
    debt: Number(unit.debt) || 0,
    balances: normalizeBalanceEntries(unit.balances, unit.debt),
    residents: Number(unit.residents) || 0,
    status: unit.status || "new",
    chargeLogs: Array.isArray(unit.chargeLogs)
      ? normalizeChargeLogEntries(unit.chargeLogs)
      : Array.isArray(unit.aidatCharges)
        ? normalizeChargeLogEntries(unit.aidatCharges, "aidat")
        : [],
    aidatPaymentLogs: normalizeAidatPaymentLogs(unit.aidatPaymentLogs),
    owners: Array.isArray(unit.owners)
      ? unit.owners.map((owner, ownerIndex) => normalizeOwnerRecord(owner, ownerIndex))
      : [],
  };
}

function normalizePropertyRecord(property = {}, index = 0) {
  const propertyId = property.id || `PR-${String(index + 1).padStart(3, "0")}`;
  const units = Array.isArray(property.units)
    ? property.units.map((unit, unitIndex) => normalizeUnitRecord(unit, propertyId, unitIndex))
    : Array.from({ length: Math.max(1, Number(property.unitCount) || 1) }, (_, unitIndex) =>
        normalizeUnitRecord({}, propertyId, unitIndex)
      );

  return {
    id: propertyId,
    code: property.code || `OBJ-${String(index + 1).padStart(3, "0")}`,
    companyId: property.companyId || "",
    companyName: property.companyName || "",
    title: property.title || "Новый объект",
    city: property.city || "",
    district: property.district || "",
    type: property.type || "residential building",
    manager: property.manager || "",
    aidatCalculationMode: property.aidatCalculationMode || "equal_for_all",
    aidatStartDate: property.aidatStartDate || "",
    aidatFixedAmount:
      property.aidatFixedAmount === undefined || property.aidatFixedAmount === null
        ? ""
        : Number(property.aidatFixedAmount),
    aidatCurrencyCode: property.aidatCurrencyCode || "TRY",
    status: property.status || "active",
    unitCount: units.length,
    totalBalances: normalizeBalanceEntries(property.totalBalances),
    financeLogs: Array.isArray(property.financeLogs) ? property.financeLogs : [],
    units,
  };
}

function normalizeClientRecord(client = {}) {
  return {
    id: client.id || "",
    name: client.name || "",
    role: client.role || "owner",
    phone: client.phone || "",
    telegram: client.telegram || "",
    telegramId: client.telegramId || "",
    properties: Array.isArray(client.properties) ? client.properties : [],
    status: client.status || "active",
  };
}

function upsertClientRecordFromOwner(owner = {}, propertyTitle = "") {
  if (!owner.name) return;

  const clientId = owner.clientId || `OWNER-${owner.name}`;
  const existingClientIndex = dataStore.clients.findIndex(
    (client) => client.id === clientId
  );

  const nextClient = normalizeClientRecord({
    id: clientId,
    name: owner.name,
    role: "owner",
    phone: owner.phone || "",
    telegram: "",
    telegramId: owner.telegramId || "",
    properties: propertyTitle ? [propertyTitle] : [],
    status: "active",
  });

  if (existingClientIndex >= 0) {
    const existingClient = dataStore.clients[existingClientIndex];
    const propertySet = new Set([
      ...(existingClient.properties || []),
      ...(nextClient.properties || []),
    ]);

    dataStore.clients[existingClientIndex] = normalizeClientRecord({
      ...existingClient,
      name: existingClient.name || nextClient.name,
      phone: existingClient.phone || nextClient.phone,
      telegramId: owner.telegramId || existingClient.telegramId || "",
      properties: Array.from(propertySet),
      status: existingClient.status || nextClient.status,
    });
    return;
  }

  dataStore.clients.push(nextClient);
}

function normalizeRequestRecord(request = {}) {
  return {
    id: request.id || "",
    clientId: request.clientId || "",
    client: request.client || "",
    property: request.property || "",
    category: request.category || "other",
    priority: request.priority || "low",
    status: request.status || "new",
    assignee: request.assignee || "Unassigned",
    source: request.source || "admin",
    createdAt: request.createdAt || "",
    title: request.title || "",
  };
}

function normalizePaymentRecord(payment = {}) {
  return {
    id: payment.id || "",
    clientId: payment.clientId || "",
    client: payment.client || "",
    property: payment.property || "",
    amountDue: Number(payment.amountDue) || 0,
    amountPaid: Number(payment.amountPaid) || 0,
    currency: payment.currency || "TRY",
    dueDate: payment.dueDate || "",
    status: payment.status || "unpaid",
  };
}

function normalizeDocumentRecord(documentItem = {}) {
  return {
    id: documentItem.id || "",
    clientId: documentItem.clientId || "",
    title: documentItem.title || "",
    client: documentItem.client || "",
    property: documentItem.property || "",
    type: documentItem.type || "document",
    visibility: documentItem.visibility || "internal",
  };
}

function normalizeStaffRecord(staff = {}) {
  return {
    id: staff.id || staff.managerId || "",
    managerId: staff.managerId || staff.id || "",
    login: staff.login || staff.managerId || staff.id || "",
    name: staff.name || "",
    role: staff.role || "manager",
    phone: staff.phone || "",
    email: staff.email || "",
    status: staff.status || "active",
    openRequests: Number(staff.openRequests) || 0,
    mustChangePassword: Boolean(staff.mustChangePassword),
    tempPassword: staff.tempPassword || "",
    companyId: staff.companyId || "",
    companyName: staff.companyName || "",
  };
}

function normalizeDataStore(rawData = {}) {
  const merged = {
    companies: mergeById(DEFAULT_DATA_STORE.companies, rawData.companies || []),
    staff: mergeById(DEFAULT_DATA_STORE.staff, rawData.staff || []),
    clients: mergeById(DEFAULT_DATA_STORE.clients, rawData.clients || []),
    properties: mergeById(DEFAULT_DATA_STORE.properties, rawData.properties || []),
    requests: mergeById(DEFAULT_DATA_STORE.requests, rawData.requests || []),
    payments: mergeById(DEFAULT_DATA_STORE.payments, rawData.payments || []),
    documents: mergeById(DEFAULT_DATA_STORE.documents, rawData.documents || []),
  };

  return {
    companies: merged.companies.map((company, index) =>
      normalizeCompanyRecord(company, index)
    ),
    staff: merged.staff.map((staff) => normalizeStaffRecord(staff)),
    clients: merged.clients.map((client) => normalizeClientRecord(client)),
    properties: merged.properties.map((property, index) =>
      normalizePropertyRecord(property, index)
    ),
    requests: merged.requests.map((request) => normalizeRequestRecord(request)),
    payments: merged.payments.map((payment) => normalizePaymentRecord(payment)),
    documents: merged.documents.map((documentItem) => normalizeDocumentRecord(documentItem)),
  };
}

function loadDataStore() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return normalizeDataStore(cloneData(DEFAULT_DATA_STORE));
    }

    const parsed = JSON.parse(storedValue);
    const storedData = parsed?.data || parsed || {};
    return normalizeDataStore(storedData);
  } catch (error) {
    return normalizeDataStore(cloneData(DEFAULT_DATA_STORE));
  }
}

function persistDataStore() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        savedAt: new Date().toISOString(),
        data: dataStore,
      })
    );
  } catch (error) {
    console.warn("Failed to persist admin cabinet data", error);
  }
}

let dataStore = loadDataStore();

function upsertCompany(company, index = 0) {
  dataStore.companies = upsertCompanyState(dataStore.companies, company, index);
  const normalized = dataStore.companies.find((item) => item.companyId === normalizeCompanyRecord(company, index).companyId) || normalizeCompanyRecord(company, index);
  persistDataStore();
  return normalized;
}

function buildClientAuthUsers() {
  const authUsers = [];
  const knownClientIds = new Set();

  dataStore.clients
    .filter((client) => client.name)
    .forEach((client) => {
      const clientId = client.id || `CLIENT-NAME-${client.name}`;
      if (knownClientIds.has(clientId)) return;
      authUsers.push({
        id: `CLIENT-${clientId}`,
        clientId,
        name: client.name,
        role: "client",
        label: "Клиент",
      });
      knownClientIds.add(clientId);
    });

  dataStore.properties.forEach((property) => {
    (property.units || []).forEach((unit) => {
      (unit.owners || []).forEach((owner, index) => {
        if (!owner?.name) return;
        const clientId =
          owner.clientId || `OWNER-${property.id}-${unit.id}-${index + 1}`;
        if (knownClientIds.has(clientId)) return;
        authUsers.push({
          id: `CLIENT-${clientId}`,
          clientId,
          name: owner.name,
          role: "client",
          label: "Клиент",
        });
        knownClientIds.add(clientId);
      });
    });
  });

  return authUsers;
}

function getAuthUsers() {
  const merged = [...AUTH_USERS];
  const knownIds = new Set(merged.map((user) => user.id));

  buildClientAuthUsers().forEach((user) => {
    if (!knownIds.has(user.id)) {
      merged.push(user);
      knownIds.add(user.id);
    }
  });

  return merged;
}

function loadAuthState() {
  try {
    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedValue) return null;
    const parsed = JSON.parse(storedValue);
    if (!parsed?.token || !parsed?.user?.id) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function persistAuthState(session) {
  if (!session?.token || !session?.user?.id) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token: session.token,
      user: session.user,
      impersonator: session.impersonator || null,
      issuedAt: session.issuedAt || null,
      expiresAt: session.expiresAt || null,
      savedAt: new Date().toISOString(),
    })
  );
}

const views = {
  dashboard: {
    title: "Главное",
    description:
      "Общий обзор текущей операционной нагрузки: заявки, платежи, загрузка менеджеров и ключевые риски.",
    readiness: "ready",
    note: "Экран уже собран как рабочий обзор на sample-данных.",
    items: [
      { label: "Макет и навигация", status: "ready" },
      { label: "KPI и карточки", status: "ready" },
      { label: "Живые данные из API", status: "todo" },
    ],
  },
  managers: {
    title: "Менеджеры",
    description:
      "Команда компании: руководитель, менеджеры, поддержка и бухгалтерия с текущей нагрузкой и ролями.",
    readiness: "progress",
    note: "Пока это обзор команды на текущих данных без редактирования и приглашений.",
    items: [
      { label: "Список команды", status: "ready" },
      { label: "Роли сотрудников", status: "ready" },
      { label: "Нагрузка по заявкам", status: "ready" },
      { label: "Управление сотрудниками", status: "todo" },
    ],
  },
  "admin-panel": {
    title: "Архив домов",
    description:
      "Раздел создателя платформы для архива домов и системных записей.",
    readiness: "progress",
    note: "Сейчас здесь можно держать архив домов и связанные служебные записи.",
    items: [
      { label: "Отдельная навигация", status: "ready" },
      { label: "Доступ только создателю", status: "ready" },
      { label: "Раздел компаний", status: "progress" },
      { label: "Форма создания компании", status: "todo" },
    ],
  },
  "company-clients": {
    title: "Клиенты (Компании)",
    description:
      "Раздел управляющих компаний, которых создатель платформы подключает вручную и привязывает к Telegram.",
    readiness: "progress",
    note: "Пока это пустой контур под будущий реестр компаний и их управляющих.",
    items: [
      { label: "Отдельная страница компаний", status: "ready" },
      { label: "Переход из админ панели", status: "ready" },
      { label: "Список компаний", status: "todo" },
      { label: "Создание компании", status: "todo" },
    ],
  },
  requests: {
    title: "Заявки",
    description:
      "Очередь обращений из Telegram, клиентского кабинета и внутренних процессов с фильтрацией по статусу и приоритету.",
    readiness: "progress",
    note: "Просмотр и фильтры есть, но редактирование и API пока не подключены.",
    items: [
      { label: "Таблица заявок", status: "ready" },
      { label: "Фильтры и поиск", status: "ready" },
      { label: "Изменение статуса", status: "todo" },
      { label: "Загрузка из backend", status: "todo" },
    ],
  },
  clients: {
    title: "Клиенты",
    description:
      "Карточки собственников и арендаторов. Позже здесь будет переход в полную CRM-карточку клиента.",
    readiness: "progress",
    note: "Список уже визуализирован, но без карточки клиента и без связки с API.",
    items: [
      { label: "Список клиентов", status: "ready" },
      { label: "Поиск по клиентам", status: "ready" },
      { label: "Детальная карточка клиента", status: "todo" },
      { label: "Редактирование данных", status: "todo" },
    ],
  },
  properties: {
    title: "Объекты",
    description:
      "Дом выступает как основной объект, а внутри него ведется структура помещений, собственников и задолженностей.",
    readiness: "progress",
    note: "Теперь раздел уже показывает логику дом -> помещение -> карточка помещения. Следующий шаг это запись в backend и полноценные карточки клиентов.",
    items: [
      { label: "Список объектов", status: "ready" },
      { label: "Помещения внутри объекта", status: "ready" },
      { label: "Добавление объекта", status: "progress" },
      { label: "Карточка помещения", status: "progress" },
      { label: "Запись в backend и PostgreSQL", status: "todo" },
    ],
  },
  payments: {
    title: "Платежи",
    description:
      "Контроль начислений, статусов оплат и просрочек. На этом экране удобно строить дальнейшую интеграцию с бухгалтерией.",
    readiness: "progress",
    note: "Таблица готова для просмотра, но подтверждение оплат и бухгалтерская логика еще впереди.",
    items: [
      { label: "Таблица оплат", status: "ready" },
      { label: "Статусы оплат", status: "ready" },
      { label: "Подтверждение платежа", status: "todo" },
      { label: "Интеграция с backend", status: "todo" },
    ],
  },
  documents: {
    title: "Документы",
    description:
      "Реестр договоров, квитанций и актов со ссылками на Google Drive и настройками видимости для клиента.",
    readiness: "progress",
    note: "Список документов уже можно использовать как каркас, но загрузка и права доступа еще не реализованы.",
    items: [
      { label: "Реестр документов", status: "ready" },
      { label: "Видимость для клиента", status: "progress" },
      { label: "Загрузка файлов", status: "todo" },
      { label: "Связка с Google Drive API", status: "todo" },
    ],
  },
};

const sideNav = document.querySelector(".side-nav");
const sideLinks = document.querySelectorAll(".side-link");
const panels = document.querySelectorAll(".view-panel");
const summaryStrip = document.getElementById("summary-strip");
const viewTitle = document.getElementById("view-title");
const viewDescription = document.getElementById("view-description");
const requestFilters = document.getElementById("request-filters");
const searchInput = document.getElementById("global-search");
const storageStatusBadge = document.getElementById("storage-status-badge");
const currentUserBadge = document.getElementById("current-user-badge");
const refreshButton = document.getElementById("refresh-button");
const newRequestButton = document.getElementById("new-request-button");
const switchUserButton = document.getElementById("switch-user-button");
const viewReadiness = document.getElementById("view-readiness");
const adminPanelGrid = document.getElementById("admin-panel-grid");
const companyClientsGrid = document.getElementById("company-clients-grid");
const managersGrid = document.getElementById("managers-grid");
const propertiesBreadcrumbs = document.getElementById("properties-breadcrumbs");
const propertiesOverview = document.getElementById("properties-overview");
const propertiesGrid = document.getElementById("properties-grid");
const addPropertyButton = document.getElementById("add-property-button");
const authModal = document.getElementById("auth-modal");
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authLoginField = document.getElementById("auth-login-field");
const authLoginInput = document.getElementById("auth-login-input");
const authPasswordField = document.getElementById("auth-password-field");
const authPasswordInput = document.getElementById("auth-password-input");
const authImpersonationField = document.getElementById("auth-impersonation-field");
const authUserSelect = document.getElementById("auth-user-select");
const authSubmitButton = document.getElementById("auth-submit-button");
const authRestoreButton = document.getElementById("auth-restore-button");
const authMessage = document.getElementById("auth-message");
const propertyModal = document.getElementById("property-modal");
const closePropertyModalButton = document.getElementById("close-property-modal");
const cancelPropertyModalButton = document.getElementById("cancel-property-modal");
const propertyForm = document.getElementById("property-form");
const propertyFormMessage = document.getElementById("property-form-message");
const propertyUnitCountInput = document.getElementById("property-unit-count");
const archiveConfirmModal = document.getElementById("archive-confirm-modal");
const cancelArchiveConfirmButton = document.getElementById("cancel-archive-confirm");
const confirmArchiveButton = document.getElementById("confirm-archive-button");
const aidatPaymentModal = document.getElementById("aidat-payment-modal");
const closeAidatPaymentModalButton = document.getElementById("close-aidat-payment-modal");
const cancelAidatPaymentModalButton = document.getElementById("cancel-aidat-payment-modal");
const aidatPaymentForm = document.getElementById("aidat-payment-form");
const aidatPaymentUnitLabel = document.getElementById("aidat-payment-unit-label");
const aidatPaymentCurrencySelect = document.getElementById("aidat-payment-currency");
const aidatPaymentRecordedAtInput = document.getElementById("aidat-payment-recorded-at");
const aidatPaymentMessage = document.getElementById("aidat-payment-message");

const readinessLabels = {
  ready: "Настроено",
  progress: "Частично готово",
  todo: "Не сделано",
};

let currentView = "dashboard";
let requestStatusFilter = "all";
let searchTerm = "";
let editingCompanyId = null;
let editingManagerId = null;
let managerFormFeedback = "";
let selectedPropertyId = null;
let selectedUnitId = null;
let selectedPropertyReportYear = new Date().getFullYear();
let isPropertyReportVisible = false;
let apiStatus = "unknown";
let pendingArchivePropertyId = null;
let archiveRestoreTargets = {};
let pendingAidatPaymentUnitId = null;
const ownerEditorDrafts = {};
const restoredAuthState = loadAuthState();
let adminSessionToken = restoredAuthState?.token || "";
let currentUser = restoredAuthState?.user || null;
let currentImpersonator = restoredAuthState?.impersonator || null;
let authMode = "login";
let impersonationTargets = [];

function renderStorageStatus() {
  if (!storageStatusBadge) return;

  storageStatusBadge.classList.remove(
    "storage-status-db",
    "storage-status-local",
    "storage-status-unknown"
  );

  if (apiStatus === "connected") {
    storageStatusBadge.textContent = "Сохранено в БД";
    storageStatusBadge.classList.add("storage-status-db");
    return;
  }

  if (apiStatus === "offline") {
    storageStatusBadge.textContent = "Сохранено только локально";
    storageStatusBadge.classList.add("storage-status-local");
    return;
  }

  storageStatusBadge.textContent = "Статус сохранения неизвестен";
  storageStatusBadge.classList.add("storage-status-unknown");
}

function setApiStatus(status) {
  apiStatus = status;
  renderStorageStatus();
}

function nextPropertyId() {
  const maxValue = dataStore.properties.reduce((max, property) => {
    const numeric = Number(property.id.replace("PR-", ""));
    return Number.isNaN(numeric) ? max : Math.max(max, numeric);
  }, 0);

  return `PR-${String(maxValue + 1).padStart(3, "0")}`;
}

function nextPropertyCode() {
  const maxValue = dataStore.properties.reduce((max, property) => {
    const numeric = Number(String(property.code || "").replace("OBJ-", ""));
    return Number.isNaN(numeric) ? max : Math.max(max, numeric);
  }, 0);

  return `OBJ-${String(maxValue + 1).padStart(3, "0")}`;
}

function getPropertyById(propertyId) {
  return dataStore.properties.find((property) => property.id === propertyId) || null;
}

function getPropertyByCode(propertyCode) {
  return dataStore.properties.find((property) => property.code === propertyCode) || null;
}

function getUnitById(property, unitId) {
  if (!property) return null;
  return property.units.find((unit) => unit.id === unitId) || null;
}

function getUnitByCode(property, unitCode) {
  if (!property) return null;
  return property.units.find((unit) => unit.code === unitCode) || null;
}

function buildNavigationHash() {
  const parts = [currentView];
  const selectedProperty = getPropertyById(selectedPropertyId);
  const selectedUnit = getUnitById(selectedProperty, selectedUnitId);

  if (currentView === "properties" && selectedProperty?.code) {
    parts.push(selectedProperty.code);
  }

  if (currentView === "properties" && selectedUnit?.code) {
    parts.push(selectedUnit.code);
  }

  return `#${parts.join("/")}`;
}

function persistNavigationState() {
  const payload = {
    view: currentView,
    propertyCode: getPropertyById(selectedPropertyId)?.code || "",
    unitCode:
      getUnitById(getPropertyById(selectedPropertyId), selectedUnitId)?.code || "",
    savedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to persist navigation state", error);
  }

  const nextHash = buildNavigationHash();
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

function readNavigationState() {
  const hash = String(window.location.hash || "").replace(/^#/, "").trim();
  if (hash) {
    const [view = "", propertyCode = "", unitCode = ""] = hash.split("/");
    return { view, propertyCode, unitCode };
  }

  try {
    const storedValue = window.localStorage.getItem(NAVIGATION_STORAGE_KEY);
    if (!storedValue) return null;
    const parsed = JSON.parse(storedValue);
    return {
      view: parsed?.view || "",
      propertyCode: parsed?.propertyCode || "",
      unitCode: parsed?.unitCode || "",
    };
  } catch (error) {
    return null;
  }
}

async function restoreNavigationState() {
  const navigationState = readNavigationState();
  if (!navigationState) return;

  if (navigationState.view && canAccessView(navigationState.view)) {
    currentView = navigationState.view;
  }

  if (currentView === "properties" && navigationState.propertyCode) {
    let property = getPropertyByCode(navigationState.propertyCode);
    if (!property) {
      property = await loadPropertyDetailFromApi(navigationState.propertyCode);
    }

    if (property && propertyBelongsToCurrentClient(property)) {
      selectedPropertyId = property.id;

      if (navigationState.unitCode) {
        const unit = getUnitByCode(property, navigationState.unitCode);
        if (unit && unitBelongsToCurrentClient(unit)) {
          selectedUnitId = unit.id;
        }
      }
    }
  }
}

function isClientRole() {
  return currentUser?.role === "client";
}

function getCurrentClientId() {
  return currentUser?.clientId || null;
}

function getCurrentClientRecord() {
  const clientId = getCurrentClientId();
  if (!clientId) return null;
  return dataStore.clients.find((client) => client.id === clientId) || null;
}

function unitBelongsToCurrentClient(unit) {
  if (!isClientRole()) return true;
  const clientId = getCurrentClientId();
  return Boolean(
    unit?.owners?.some((owner) => owner.clientId === clientId)
  );
}

function propertyBelongsToCurrentClient(property) {
  if (!isClientRole()) return true;
  return Boolean(property?.units?.some((unit) => unitBelongsToCurrentClient(unit)));
}

function getVisibleProperties() {
  if (!isClientRole()) return dataStore.properties;
  return dataStore.properties.filter((property) => propertyBelongsToCurrentClient(property));
}

function getVisibleUnits(property) {
  if (!property) return [];
  const units = isClientRole()
    ? (property.units || []).filter((unit) => unitBelongsToCurrentClient(unit))
    : property.units || [];

  return [...units].sort(compareUnitNumbers);
}

function compareUnitNumbers(leftUnit, rightUnit) {
  return String(leftUnit?.number || "").localeCompare(String(rightUnit?.number || ""), "ru", {
    numeric: true,
    sensitivity: "base",
  });
}

function getScopedRequests() {
  if (!isClientRole()) return dataStore.requests;
  const clientId = getCurrentClientId();
  return dataStore.requests.filter((request) => request.clientId === clientId);
}

function getScopedPayments() {
  if (!isClientRole()) return dataStore.payments;
  const clientId = getCurrentClientId();
  const clientName = currentUser?.name || "";
  return dataStore.payments.filter(
    (payment) => payment.clientId === clientId || payment.client === clientName
  );
}

function getScopedDocuments() {
  if (!isClientRole()) return dataStore.documents;
  const clientId = getCurrentClientId();
  const clientName = currentUser?.name || "";
  return dataStore.documents.filter(
    (documentItem) =>
      documentItem.clientId === clientId || documentItem.client === clientName
  );
}

function getPaymentVisibleProperties() {
  if (isClientRole()) return getVisibleProperties();
  if (currentUser?.role === "manager") {
    return dataStore.properties.filter((property) => property.manager === currentUser.name);
  }
  return dataStore.properties;
}

function buildIncomingPaymentRows() {
  return getPaymentVisibleProperties()
    .flatMap((property) =>
      (property.units || []).flatMap((unit) =>
        (Array.isArray(unit.aidatPaymentLogs) ? unit.aidatPaymentLogs : []).map((payment, index) => ({
          id: payment.id || `${property.code}-${unit.code}-payment-${index + 1}`,
          propertyTitle: property.title,
          propertyCode: property.code,
          unitNumber: unit.number,
          clientName: unitOwnerSummary(unit),
          paymentDate: payment.receivedDate || payment.recordedAt || "",
          recordedAt: payment.recordedAt || payment.receivedDate || "",
          amount: Number(payment.amount || 0),
          appliedAmount: Number(payment.appliedAmount || payment.amount || 0),
          currency: payment.currency || property.aidatCurrencyCode || "TRY",
        }))
      )
    )
    .sort((left, right) =>
      String(right.recordedAt || right.paymentDate).localeCompare(
        String(left.recordedAt || left.paymentDate)
      )
    );
}

function getClientPrimaryUnit() {
  if (!isClientRole()) return null;
  for (const property of getVisibleProperties()) {
    const unit = getVisibleUnits(property)[0];
    if (unit) {
      return { property, unit };
    }
  }
  return null;
}

function unitOwnerSummary(unit) {
  const ownerNames = (unit?.owners || [])
    .map((owner) => owner.name)
    .filter(Boolean);

  if (!ownerNames.length) return "Собственник не назначен";
  if (ownerNames.length === 1) return ownerNames[0];
  return `${ownerNames[0]} +${ownerNames.length - 1}`;
}

function normalizeOwner(owner, index) {
  return {
    clientId: owner?.clientId || `NEW-${index + 1}`,
    name: owner?.name || "",
    share: owner?.share || "",
    phone: owner?.phone || "",
    telegramId: owner?.telegramId || "",
  };
}

function normalizeApiOwner(owner, index) {
  return {
    clientId: owner?.code || owner?.clientId || `API-OWN-${index + 1}`,
    name: owner?.name || "",
    share:
      owner?.share === undefined || owner?.share === null
        ? ""
        : `${owner.share}%`,
    phone: owner?.phone || "",
    telegramId: owner?.telegramId || "",
  };
}

function normalizeApiUnit(unit, propertyId, index) {
  return {
    id: unit?.id || `${propertyId}-U${index + 1}`,
    code: unit?.code || `${propertyId}-U${index + 1}`,
    number: String(unit?.number || index + 1),
    area: Number(unit?.area || 0),
    floor: unit?.floor || "-",
    layoutType: unit?.layoutType || "",
    layoutFeature: unit?.layoutFeature || "",
    waterAccountNumber: unit?.waterAccountNumber || "",
    electricityAccountNumber: unit?.electricityAccountNumber || "",
    debt: Number(unit?.debt || 0),
    balances: normalizeBalanceEntries(unit?.balances, unit?.debt),
    residents: Number(unit?.residents || 0),
    status: unit?.status || "new",
    chargeLogs: Array.isArray(unit?.chargeLogs)
      ? normalizeChargeLogEntries(unit.chargeLogs)
      : Array.isArray(unit?.aidatCharges)
        ? normalizeChargeLogEntries(unit.aidatCharges, "aidat")
        : [],
    aidatPaymentLogs: normalizeAidatPaymentLogs(unit?.aidatPaymentLogs),
    owners: Array.isArray(unit?.owners)
      ? unit.owners.map((owner, ownerIndex) => normalizeApiOwner(owner, ownerIndex))
      : [],
  };
}

function normalizeApiProperty(property, index = 0) {
  const id = property?.id || `API-PROPERTY-${index + 1}`;
  const units = Array.isArray(property?.units)
    ? property.units.map((unit, unitIndex) => normalizeApiUnit(unit, id, unitIndex))
    : [];

  return {
    id,
    code: property?.code || `OBJ-${String(index + 1).padStart(3, "0")}`,
    companyId: property?.companyId || "",
    companyName: property?.companyName || "",
    title: property?.title || "Новый объект",
    city: property?.city || "",
    district: property?.district || "",
    type: property?.type || "residential_building",
    manager: property?.manager || "",
    aidatCalculationMode: property?.aidatCalculationMode || "equal_for_all",
    aidatStartDate: property?.aidatStartDate || "",
    aidatFixedAmount:
      property?.aidatFixedAmount === undefined || property?.aidatFixedAmount === null
        ? ""
        : Number(property.aidatFixedAmount),
    aidatCurrencyCode: property?.aidatCurrencyCode || "TRY",
    status: property?.status || "active",
    unitCount: Number(property?.unitCount || units.length || 0),
    totalBalances: normalizeBalanceEntries(property?.totalBalances),
    financeLogs: Array.isArray(property?.financeLogs) ? property.financeLogs : [],
    units,
  };
}

function upsertProperty(property) {
  const normalized = normalizeApiProperty(property);
  const existingIndex = dataStore.properties.findIndex(
    (item) => item.code === normalized.code || item.id === normalized.id
  );

  if (existingIndex >= 0) {
    dataStore.properties[existingIndex] = {
      ...dataStore.properties[existingIndex],
      ...normalized,
    };
  } else {
    dataStore.properties.unshift(normalized);
  }

  persistDataStore();
  return normalized;
}

function clearAuthState() {
  adminSessionToken = "";
  currentUser = null;
  currentImpersonator = null;
  persistAuthState(null);
}

async function fetchJson(path, options = {}) {
  const hasBody = options.body !== undefined && options.body !== null;
  const authHeaders = adminSessionToken
    ? {
        Authorization: `Bearer ${adminSessionToken}`,
      }
    : {};
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...authHeaders,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthState();
    }
    const error = new Error(payload.message || "API request failed");
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

function applyAdminSession(session) {
  adminSessionToken = session?.token || "";
  currentUser = session?.user || null;
  currentImpersonator = session?.impersonator || null;
  persistAuthState(session);
}

async function loginAdminSessionViaApi(login, password) {
  const payload = await fetchJson("/api/admin-auth/login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });

  if (!payload.item?.token || !payload.item?.user) {
    throw new Error("Admin session was not returned by API");
  }

  return payload.item;
}

async function validateAdminSessionViaApi() {
  if (!adminSessionToken) return null;

  const payload = await fetchJson("/api/admin-auth/session");

  if (!payload.item?.token || !payload.item?.user) {
    throw new Error("Admin session is invalid");
  }

  return payload.item;
}

async function fetchImpersonationTargetsViaApi() {
  const payload = await fetchJson("/api/admin-auth/targets");
  return Array.isArray(payload.items) ? payload.items : [];
}

async function impersonateAdminSessionViaApi(targetId) {
  const payload = await fetchJson("/api/admin-auth/impersonate", {
    method: "POST",
    body: JSON.stringify({ targetId }),
  });

  if (!payload.item?.token || !payload.item?.user) {
    throw new Error("Impersonation session was not returned by API");
  }

  return payload.item;
}

async function restoreAdminSessionViaApi() {
  const payload = await fetchJson("/api/admin-auth/restore", {
    method: "POST",
  });

  if (!payload.item?.token || !payload.item?.user) {
    throw new Error("Creator session was not returned by API");
  }

  return payload.item;
}

async function syncCompaniesFromApi() {
  try {
    const payload = await fetchJson("/api/companies");
    if (Array.isArray(payload.items)) {
      dataStore.companies = payload.items.map((company, index) =>
        normalizeCompanyRecord(company, index)
      );
      persistDataStore();
    }
    setApiStatus("connected");
  } catch (error) {
    setApiStatus("offline");
  }
}

async function createCompanyViaApi(companyInput) {
  const payload = await fetchJson("/api/companies", {
    method: "POST",
    body: JSON.stringify(companyInput),
  });

  if (!payload.item) {
    throw new Error("Company was not returned by API");
  }

  setApiStatus("connected");
  return upsertCompany(payload.item);
}

async function updateCompanyViaApi(companyId, companyInput) {
  const payload = await fetchJson(`/api/companies/${companyId}`, {
    method: "PUT",
    body: JSON.stringify(companyInput),
  });

  if (!payload.item) {
    throw new Error("Company was not returned by API");
  }

  setApiStatus("connected");
  return upsertCompany(payload.item);
}

async function deleteCompanyViaApi(companyId) {
  const payload = await fetchJson(`/api/companies/${companyId}`, {
    method: "DELETE",
  });

  if (!payload.item?.companyId) {
    throw new Error("Deleted company was not returned by API");
  }

  setApiStatus("connected");
  dataStore.companies = removeCompanyState(dataStore.companies, payload.item.companyId);
  persistDataStore();
  return payload.item;
}

async function syncManagersFromApi() {
  if (!canAccessView("managers")) return;

  try {
    const payload = await fetchJson("/api/managers");
    if (Array.isArray(payload.items)) {
      const nonManagers = dataStore.staff.filter((member) => member.role !== "manager");
      dataStore.staff = [
        ...nonManagers,
        ...payload.items.map((item) => normalizeStaffRecord(item)),
      ];
      persistDataStore();
    }
    setApiStatus("connected");
  } catch (error) {
    setApiStatus("offline");
  }
}

async function createManagerViaApi(managerInput) {
  const payload = await fetchJson("/api/managers", {
    method: "POST",
    body: JSON.stringify(managerInput),
  });

  if (!payload.item) {
    throw new Error("Manager was not returned by API");
  }

  setApiStatus("connected");
  return normalizeStaffRecord(payload.item);
}

async function updateManagerViaApi(managerId, managerInput) {
  const payload = await fetchJson(`/api/managers/${managerId}`, {
    method: "PUT",
    body: JSON.stringify(managerInput),
  });

  if (!payload.item) {
    throw new Error("Manager update was not returned by API");
  }

  setApiStatus("connected");
  return normalizeStaffRecord(payload.item);
}

async function deleteManagerViaApi(managerId) {
  const payload = await fetchJson(`/api/managers/${managerId}`, {
    method: "DELETE",
  });

  if (!payload.item) {
    throw new Error("Manager deletion was not returned by API");
  }

  setApiStatus("connected");
  return payload.item;
}

async function syncPropertiesFromApi() {
  try {
    const payload = await fetchJson(
      `/api/properties?includeArchived=${isProjectOwner() ? "1" : "0"}`
    );
    if (Array.isArray(payload.items)) {
      payload.items.forEach((property, index) => {
        upsertProperty(normalizeApiProperty(property, index));
      });
    }
    setApiStatus("connected");
  } catch (error) {
    setApiStatus("offline");
  }
}

async function loadPropertyDetailFromApi(propertyCode) {
  try {
    const payload = await fetchJson(`/api/properties/${propertyCode}`);
    if (payload.item) {
      const property = upsertProperty(payload.item);
      setApiStatus("connected");
      return property;
    }
  } catch (error) {
    setApiStatus("offline");
  }

  return null;
}

async function createPropertyViaApi(propertyInput) {
  const payload = await fetchJson("/api/properties", {
    method: "POST",
    body: JSON.stringify(propertyInput),
  });

  if (!payload.item) {
    throw new Error("Property was not returned by API");
  }

  setApiStatus("connected");
  return upsertProperty(payload.item);
}

async function savePropertyFinanceViaApi(propertyCode, financeSettings) {
  const payload = await fetchJson(`/api/properties/${propertyCode}/finance`, {
    method: "PUT",
    body: JSON.stringify(financeSettings),
  });

  if (!payload.item) {
    throw new Error("Updated property finance was not returned by API");
  }

  setApiStatus("connected");
  return upsertProperty(payload.item);
}

async function saveAidatPaymentViaApi(unitCode, paymentInput) {
  const payload = await fetchJson(`/api/units/${unitCode}/aidat-payment`, {
    method: "POST",
    body: JSON.stringify(paymentInput),
  });

  if (!payload.item) {
    throw new Error("Updated property after aidat payment was not returned by API");
  }

  setApiStatus("connected");
  return upsertProperty(payload.item);
}

async function saveOwnersViaApi(unitCode, owners) {
  const payload = await fetchJson(`/api/units/${unitCode}/owners`, {
    method: "PUT",
    body: JSON.stringify({ owners }),
  });

  if (!payload.item) {
    throw new Error("Updated property was not returned by API");
  }

  setApiStatus("connected");
  return upsertProperty(payload.item);
}

async function saveUnitProfileViaApi(unitCode, unitProfile) {
  const payload = await fetchJson(`/api/units/${unitCode}/profile`, {
    method: "PUT",
    body: JSON.stringify(unitProfile),
  });

  if (!payload.item) {
    throw new Error("Updated unit profile was not returned by API");
  }

  setApiStatus("connected");
  return upsertProperty(payload.item);
}

async function archivePropertyViaApi(propertyCode) {
  const payload = await fetchJson(`/api/properties/${propertyCode}/archive`, {
    method: "PATCH",
  });

  if (!payload.item) {
    throw new Error("Archived property was not returned by API");
  }

  setApiStatus("connected");
  return upsertProperty(payload.item);
}

async function restorePropertyViaApi(propertyCode, targetCompanyId = "") {
  const payload = await fetchJson(`/api/properties/${propertyCode}/restore`, {
    method: "PATCH",
    body: JSON.stringify(targetCompanyId ? { targetCompanyId } : {}),
  });

  if (!payload.item) {
    throw new Error("Restored property was not returned by API");
  }

  setApiStatus("connected");
  return upsertProperty(payload.item);
}

function getOwnerDraft(unit) {
  if (!ownerEditorDrafts[unit.id]) {
    ownerEditorDrafts[unit.id] = unit.owners.length
      ? unit.owners.map((owner, index) => normalizeOwner(owner, index))
      : [normalizeOwner(null, 0)];
  }

  return ownerEditorDrafts[unit.id];
}

function setOwnerDraftCount(unit, count) {
  const safeCount = Math.max(1, Math.min(6, Number(count) || 1));
  const nextDraft = Array.from({ length: safeCount }, (_, index) =>
    normalizeOwner(getOwnerDraft(unit)[index], index)
  );
  ownerEditorDrafts[unit.id] = nextDraft;
}

function renderOwnerEditor(unit, property) {
  const draft = getOwnerDraft(unit);
  const canEditTelegramId = canEditPropertyTelegramIds(property);
  const telegramFieldHint = canEditTelegramId
    ? "Ответственный менеджер может внести Telegram ID клиента, чтобы бот открывал именно эту квартиру."
    : "Telegram ID виден только для просмотра. Изменять его может только ответственный менеджер этого дома.";

  return `
    <article class="card" data-ui-id="card-owner-editor-${property.code}-${unit.number}">
      <form class="owner-editor-form" data-owner-form="${unit.id}">
        <div class="owner-editor-head">
          <div>
            <h4>Собственники квартиры</h4>
            <p class="muted-note">Управляющая компания может менять состав собственников прямо в карточке помещения.</p>
            <p class="muted-note">${telegramFieldHint}</p>
          </div>
          <label class="field" data-ui-id="field-owner-count-${property.code}-${unit.number}">
            <span>Количество собственников</span>
            <select name="ownerCount" data-owner-count-select="${unit.id}">
              ${[1, 2, 3, 4, 5, 6]
                .map(
                  (value) => `<option value="${value}" ${draft.length === value ? "selected" : ""}>${value}</option>`
                )
                .join("")}
            </select>
          </label>
        </div>
        <div class="owner-editor-list">
          ${draft
            .map(
              (owner, index) => `
                <div class="owner-editor-row" data-ui-id="row-owner-editor-${property.code}-${unit.number}-${index + 1}">
                  <label class="field">
                    <span>ФИО собственника ${index + 1}</span>
                    <input type="text" name="ownerName-${index}" value="${owner.name}" placeholder="Введите имя собственника" />
                  </label>
                  <label class="field">
                    <span>Телефон</span>
                    <input type="text" name="ownerPhone-${index}" value="${owner.phone}" placeholder="+90 ..." />
                  </label>
                  <label class="field">
                    <span>Telegram ID</span>
                    <input
                      type="text"
                      name="ownerTelegramId-${index}"
                      value="${owner.telegramId || ""}"
                      placeholder="Например, 123456789"
                      ${canEditTelegramId ? "" : "readonly"}
                    />
                  </label>
                  <label class="field">
                    <span>Доля</span>
                    <input type="text" name="ownerShare-${index}" value="${owner.share}" placeholder="50%" />
                  </label>
                </div>
              `
            )
            .join("")}
        </div>
        <div class="owner-editor-actions">
          <div class="form-message" data-owner-message="${unit.id}"></div>
          <button type="submit" class="primary-button" data-ui-id="btn-save-owners-${property.code}-${unit.number}">
            Сохранить собственников
          </button>
        </div>
      </form>
    </article>
  `;
}

function renderUnitProfileEditor(unit, property) {
  return `
    <article class="card" data-ui-id="card-unit-profile-editor-${property.code}-${unit.number}">
      <form class="unit-profile-form" data-unit-profile-form="${unit.id}">
        <div class="card-head">
          <h4>Параметры квартиры</h4>
          <span>Unit profile</span>
        </div>
        <div class="unit-profile-grid">
          <label class="field" data-ui-id="field-unit-floor-${property.code}-${unit.number}">
            <span>Этаж</span>
            <input type="text" name="floor" value="${unit.floor}" placeholder="Например, 2" />
          </label>
          <label class="field" data-ui-id="field-unit-area-${property.code}-${unit.number}">
            <span>Квадратура, м2</span>
            <input type="number" step="0.01" min="0" name="area" value="${unit.area}" placeholder="120" />
          </label>
          <label class="field" data-ui-id="field-unit-layout-${property.code}-${unit.number}">
            <span>Планировка</span>
            <select name="layoutType">
              <option value="" ${!unit.layoutType ? "selected" : ""}>Не выбрано</option>
              <option value="1+1" ${unit.layoutType === "1+1" ? "selected" : ""}>1+1</option>
              <option value="2+1" ${unit.layoutType === "2+1" ? "selected" : ""}>2+1</option>
              <option value="3+1" ${unit.layoutType === "3+1" ? "selected" : ""}>3+1</option>
              <option value="4+1" ${unit.layoutType === "4+1" ? "selected" : ""}>4+1</option>
            </select>
          </label>
          <label class="field" data-ui-id="field-unit-layout-feature-${property.code}-${unit.number}">
            <span>Доп. характеристика</span>
            <select name="layoutFeature">
              <option value="" ${!unit.layoutFeature ? "selected" : ""}>Не выбрано</option>
              <option value="Линейная" ${unit.layoutFeature === "Линейная" ? "selected" : ""}>Линейная</option>
              <option value="Дуплекс" ${unit.layoutFeature === "Дуплекс" ? "selected" : ""}>Дуплекс</option>
            </select>
          </label>
          <label class="field" data-ui-id="field-unit-water-${property.code}-${unit.number}">
            <span>Абонентский номер водоснабжения</span>
            <input
              type="text"
              name="waterAccountNumber"
              value="${unit.waterAccountNumber || ""}"
              placeholder="Введите номер водоснабжения"
            />
          </label>
          <label class="field" data-ui-id="field-unit-electricity-${property.code}-${unit.number}">
            <span>Абонентский номер электричества</span>
            <input
              type="text"
              name="electricityAccountNumber"
              value="${unit.electricityAccountNumber || ""}"
              placeholder="Введите номер электричества"
            />
          </label>
        </div>
        <div class="unit-profile-actions">
          <div class="form-message" data-unit-profile-message="${unit.id}"></div>
          <button type="submit" class="primary-button" data-ui-id="btn-save-unit-profile-${property.code}-${unit.number}">
            Сохранить параметры квартиры
          </button>
        </div>
      </form>
    </article>
  `;
}

function aidatModeLabel(value) {
  if (value === "by_unit_area") return "По размерам квартиры";
  return "Равный для всех";
}

function toMonthInputValue(value) {
  if (!value) return "";
  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(normalized)) return normalized;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized.slice(0, 7);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function toStoredMonthDate(value) {
  const monthValue = toMonthInputValue(value);
  return monthValue ? `${monthValue}-01` : "";
}

function formatMonthYear(value) {
  const monthValue = toMonthInputValue(value);
  if (!monthValue) return "месяц не указан";
  const [year, month] = monthValue.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return monthValue;
  return date.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
  });
}

function formatDateTime(value) {
  if (!value) return "дата не указана";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthOptions(selectedValue = "") {
  const selectedMonth = toMonthInputValue(selectedValue).split("-")[1] || "";
  const formatter = new Intl.DateTimeFormat("ru-RU", { month: "long" });

  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");
    const monthLabel = formatter.format(new Date(2026, index, 1));
    return `<option value="${monthNumber}" ${selectedMonth === monthNumber ? "selected" : ""}>${monthLabel}</option>`;
  }).join("");
}

function yearOptions(selectedValue = "") {
  const selectedYear = toMonthInputValue(selectedValue).split("-")[0] || "";
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 2;
  const endYear = currentYear + 5;
  const options = [];

  for (let year = startYear; year <= endYear; year += 1) {
    options.push(
      `<option value="${year}" ${String(year) === selectedYear ? "selected" : ""}>${year}</option>`
    );
  }

  return options.join("");
}

function buildAidatLogMessage(propertyTitle, financeSettings) {
  const monthLabel = formatMonthYear(financeSettings.aidatStartDate);
  if (financeSettings.aidatCalculationMode === "equal_for_all") {
    const amount = financeSettings.aidatFixedAmount || 0;
    const currency = financeSettings.aidatCurrencyCode || "TRY";
    return `С ${monthLabel} всем квартирам начисляется ежемесячный айдат ${amount} ${currency}.`;
  }

  return `С ${monthLabel} всем квартирам начисляется ежемесячный айдат по размерам квартиры.`;
}

function renderPropertyFinanceEditor(property) {
  return `
    <article class="card" data-ui-id="card-property-finance-${property.code}">
      <form class="property-finance-form" data-property-finance-form="${property.id}">
        <div class="card-head">
          <h4>Финансы</h4>
          <span>Настройки дома</span>
        </div>
        <div class="property-finance-grid">
          <label class="field" data-ui-id="field-property-aidat-mode-${property.code}">
            <span>Айдат</span>
            <select name="aidatCalculationMode" data-aidat-mode-select="${property.id}">
              <option value="equal_for_all" ${property.aidatCalculationMode === "equal_for_all" ? "selected" : ""}>Равный для всех</option>
              <option value="by_unit_area" ${property.aidatCalculationMode === "by_unit_area" ? "selected" : ""}>По размерам квартиры</option>
            </select>
          </label>
          <label class="field" data-ui-id="field-property-aidat-start-${property.code}">
            <span>Начало учета, месяц и год</span>
            <div class="month-year-grid">
              <select name="aidatStartMonth">
                ${monthOptions(property.aidatStartDate)}
              </select>
              <select name="aidatStartYear">
                ${yearOptions(property.aidatStartDate)}
              </select>
            </div>
          </label>
          <label
            class="field property-finance-fixed-field ${property.aidatCalculationMode !== "equal_for_all" ? "is-hidden" : ""}"
            data-aidat-fixed-field="amount"
            data-ui-id="field-property-aidat-amount-${property.code}"
          >
            <span>Сумма</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="aidatFixedAmount"
              value="${property.aidatFixedAmount}"
              placeholder="Введите сумму айдата"
            />
          </label>
          <label
            class="field property-finance-fixed-field ${property.aidatCalculationMode !== "equal_for_all" ? "is-hidden" : ""}"
            data-aidat-fixed-field="currency"
            data-ui-id="field-property-aidat-currency-${property.code}"
          >
            <span>Валюта</span>
            <select name="aidatCurrencyCode">
              <option value="TRY" ${property.aidatCurrencyCode === "TRY" ? "selected" : ""}>Лира</option>
              <option value="EUR" ${property.aidatCurrencyCode === "EUR" ? "selected" : ""}>Евро</option>
              <option value="USD" ${property.aidatCurrencyCode === "USD" ? "selected" : ""}>Доллар</option>
            </select>
          </label>
        </div>
        <div class="property-finance-actions">
          <div class="form-message" data-property-finance-message="${property.id}"></div>
          <button
            type="button"
            class="ghost-button"
            data-open-property-report="${property.id}"
          >
            Отчет по дому
          </button>
          <button
            type="button"
            class="primary-button"
            data-add-aidat="${property.id}"
            data-ui-id="btn-save-property-finance-${property.code}"
          >
            Добавить Айдат
          </button>
        </div>
        <div class="property-finance-log-list">
          ${
            property.financeLogs?.length
              ? property.financeLogs
                  .map(
                    (logItem) => `
                      <div class="finance-log-entry">
                        <strong>${formatDateTime(logItem.createdAt)}</strong>
                        <p>${logItem.message}</p>
                      </div>
                    `
                  )
                  .join("")
              : '<div class="muted-note">История изменений айдата пока пуста.</div>'
          }
        </div>
      </form>
    </article>
  `;
}

function aggregateBalances(items = []) {
  const balanceMap = new Map();

  items.forEach((item) => {
    (item || []).forEach((balance) => {
      const currency = balance.currency || "TRY";
      const amount = Number(balance.amount || 0);
      balanceMap.set(currency, (balanceMap.get(currency) || 0) + amount);
    });
  });

  return Array.from(balanceMap.entries()).map(([currency, amount]) => ({
    currency,
    amount,
  }));
}

function getUnitBalances(unit) {
  return normalizeBalanceEntries(unit?.balances, unit?.debt);
}

function getPropertyBalances(property) {
  const ownBalances = normalizeBalanceEntries(property?.totalBalances);
  if (ownBalances.length) return ownBalances;
  return aggregateBalances((property?.units || []).map((unit) => getUnitBalances(unit)));
}

function getUnitAidatBalances(unit) {
  const aidatCharges = Array.isArray(unit?.chargeLogs)
    ? unit.chargeLogs.filter((charge) => charge.chargeType === "aidat")
    : [];

  if (aidatCharges.length) {
    const aidatMap = new Map();
    aidatCharges.forEach((charge) => {
      const currency = charge.currency || "TRY";
      const outstanding = Number(charge.amountDue || 0) - Number(charge.amountPaid || 0);
      if (outstanding <= 0) return;
      aidatMap.set(currency, (aidatMap.get(currency) || 0) + outstanding);
    });

    return Array.from(aidatMap.entries()).map(([currency, amount]) => ({
      currency,
      amount,
    }));
  }

  return [];
}

function subtractBalances(totalBalances, subtractingBalances) {
  const resultMap = new Map();

  normalizeBalanceEntries(totalBalances).forEach((balance) => {
    resultMap.set(balance.currency, Number(balance.amount || 0));
  });

  normalizeBalanceEntries(subtractingBalances).forEach((balance) => {
    const current = resultMap.get(balance.currency) || 0;
    resultMap.set(balance.currency, Math.max(0, current - Number(balance.amount || 0)));
  });

  return Array.from(resultMap.entries())
    .map(([currency, amount]) => ({ currency, amount }))
    .filter((balance) => balance.amount > 0);
}

function getUnitUtilityBalances(unit) {
  const utilityCharges = Array.isArray(unit?.chargeLogs)
    ? unit.chargeLogs.filter((charge) => charge.chargeType !== "aidat")
    : [];

  if (utilityCharges.length) {
    const utilityMap = new Map();
    utilityCharges.forEach((charge) => {
      const currency = charge.currency || "TRY";
      const outstanding = Number(charge.amountDue || 0) - Number(charge.amountPaid || 0);
      if (outstanding <= 0) return;
      utilityMap.set(currency, (utilityMap.get(currency) || 0) + outstanding);
    });

    return Array.from(utilityMap.entries()).map(([currency, amount]) => ({
      currency,
      amount,
    }));
  }

  return subtractBalances(getUnitBalances(unit), getUnitAidatBalances(unit));
}

function getPropertyAidatBalances(property) {
  return aggregateBalances((property?.units || []).map((unit) => getUnitAidatBalances(unit)));
}

function getPropertyUtilityBalances(property) {
  return aggregateBalances((property?.units || []).map((unit) => getUnitUtilityBalances(unit)));
}

function reportYearOptions(selectedYear = new Date().getFullYear()) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear - 2; year <= currentYear + 1; year += 1) {
    years.push(
      `<option value="${year}" ${Number(selectedYear) === year ? "selected" : ""}>${year}</option>`
    );
  }
  return years.join("");
}

function reportMonthLabels() {
  return ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
}

function buildUnitAidatYearReport(unit, property, year, defaultCurrency = "TRY") {
  const months = Array.from({ length: 12 }, (_, monthIndex) => ({
    monthIndex,
    due: 0,
    applied: 0,
    credit: 0,
    currency: defaultCurrency,
  }));

  (Array.isArray(unit?.chargeLogs) ? unit.chargeLogs : []).forEach((charge) => {
    if (charge.chargeType !== "aidat") return;
    const monthKey = charge.period || toMonthInputValue(charge.chargeDate || "");
    if (!monthKey || !monthKey.startsWith(`${year}-`)) return;
    const monthIndex = Number(monthKey.slice(5, 7)) - 1;
    if (monthIndex < 0 || monthIndex > 11) return;
    months[monthIndex].due += Number(charge.amountDue || 0);
    months[monthIndex].applied += Number(charge.amountPaid || 0);
    months[monthIndex].currency = charge.currency || months[monthIndex].currency;
  });

  if (property?.aidatCalculationMode === "equal_for_all") {
    const startMonth = toMonthInputValue(property.aidatStartDate || "");
    const amount = Number(property.aidatFixedAmount || 0);
    const currency = property.aidatCurrencyCode || defaultCurrency;

    if (startMonth && amount > 0) {
      const startYear = Number(startMonth.slice(0, 4));
      const startMonthIndex = Number(startMonth.slice(5, 7)) - 1;

      months.forEach((month) => {
        if (year < startYear) return;
        if (year === startYear && month.monthIndex < startMonthIndex) return;
        const currentDate = new Date();
        if (year > currentDate.getFullYear()) return;
        if (year === currentDate.getFullYear() && month.monthIndex > currentDate.getMonth()) return;
        if (Number(month.due || 0) <= 0) {
          month.due = amount;
        }
        month.currency = currency;
      });
    }
  }

  const chargeAppliedTotal = months.reduce(
    (sum, month) => sum + Number(month.applied || 0),
    0
  );
  const paymentTotal = (Array.isArray(unit?.aidatPaymentLogs) ? unit.aidatPaymentLogs : [])
    .filter((entry) => {
      const paymentDate = entry?.receivedDate || entry?.recordedAt || "";
      return String(paymentDate).startsWith(`${year}-`);
    })
    .reduce((sum, entry) => sum + Number(entry?.amount || 0), 0);

  let carryover = Math.max(0, paymentTotal - chargeAppliedTotal);
  if (carryover > 0) {
    months.forEach((month) => {
      if (carryover <= 0) return;
      const outstanding = Math.max(
        0,
        Number(month.due || 0) - Number(month.applied || 0)
      );
      if (outstanding <= 0) return;
      const applied = Math.min(outstanding, carryover);
      month.applied += applied;
      carryover -= applied;
    });
  }

  if (carryover > 0) {
    const currentDate = new Date();
    const currentMonthIndex =
      year < currentDate.getFullYear()
        ? 11
        : year > currentDate.getFullYear()
          ? -1
          : currentDate.getMonth();
    const fixedAmount = Number(property?.aidatFixedAmount || 0);
    const bucketAmount = fixedAmount > 0 ? fixedAmount : carryover;
    let targetMonthIndex = Math.min(currentMonthIndex + 1, 11);

    while (carryover > 0 && targetMonthIndex >= 0 && targetMonthIndex < 12) {
      const creditPortion = Math.min(bucketAmount, carryover);
      months[targetMonthIndex].credit += creditPortion;
      months[targetMonthIndex].currency = property?.aidatCurrencyCode || months[targetMonthIndex].currency;
      carryover -= creditPortion;
      targetMonthIndex += 1;
    }
  }

  return months;
}

function renderPropertyReportCell(value) {
  const due = Number(value?.due || 0);
  const applied = Number(value?.applied || 0);
  const credit = Number(value?.credit || 0);
  const currency = value?.currency || "TRY";
  const net = due - applied;

  if (due <= 0 && applied <= 0 && credit <= 0) {
    return '<span class="report-money report-money-empty">—</span>';
  }

  if (credit > 0 && due <= 0 && applied <= 0) {
    return [
      '<span class="report-money report-money-positive">Аванс</span>',
      `<span class="report-money-sub report-money-overpayment">+${formatMoney(credit, currency)}</span>`,
    ].join("");
  }

  if (net > 0) {
    return [
      `<span class="report-money report-money-negative">-${formatMoney(net, currency)}</span>`,
      `<span class="report-money-sub">Нач. ${formatMoney(due, currency)}</span>`,
      `<span class="report-money-sub">Опл. ${formatMoney(applied, currency)}</span>`,
    ].join("");
  }

  const parts = [
    `<span class="report-money report-money-positive">${formatMoney(0, currency)}</span>`,
    `<span class="report-money-sub">Нач. ${formatMoney(due, currency)}</span>`,
    `<span class="report-money-sub">Опл. ${formatMoney(applied, currency)}</span>`,
  ];

  if (credit > 0) {
    parts.push(
      `<span class="report-money-sub report-money-overpayment">Аванс +${formatMoney(credit, currency)}</span>`
    );
  }

  return parts.join("");
}

function renderPropertyYearReport(property, units, year) {
  const months = reportMonthLabels();
  const totalByMonth = Array.from({ length: 12 }, () => ({
    due: 0,
    applied: 0,
    credit: 0,
    currency: property.aidatCurrencyCode || "TRY",
  }));

  return `
    <article class="card property-year-report-card">
      <div class="card-head">
        <h4>Отчет по дому</h4>
        <span>Айдат по квартирам за ${year} год</span>
      </div>
      <div class="property-year-report-toolbar">
        <label class="field property-year-select">
          <span>Год</span>
          <select data-property-report-year="${property.id}">
            ${reportYearOptions(year)}
          </select>
        </label>
      </div>
      <div class="table-wrap">
        <table class="property-year-report-table">
          <thead>
            <tr>
              <th>Кв.</th>
              <th>ФИО</th>
              ${months.map((month) => `<th>${month}</th>`).join("")}
              <th>Итого</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${
              units.length
                ? units
                    .map((unit) => {
                      const unitYear = buildUnitAidatYearReport(unit, property, year, property.aidatCurrencyCode || "TRY");
                      const monthCells = unitYear.map((value, monthIndex) => {
                        totalByMonth[monthIndex].due += value.due;
                        totalByMonth[monthIndex].applied += value.applied;
                        totalByMonth[monthIndex].credit += Number(value.credit || 0);
                        if (value.currency) totalByMonth[monthIndex].currency = value.currency;
                        return `<td>${renderPropertyReportCell(value)}</td>`;
                      }).join("");
                      const yearly = unitYear.reduce(
                        (sum, value) => ({
                          due: sum.due + value.due,
                          applied: sum.applied + value.applied,
                          credit: sum.credit + Number(value.credit || 0),
                          currency: value.currency || sum.currency,
                        }),
                        {
                          due: 0,
                          applied: 0,
                          credit: 0,
                          currency: property.aidatCurrencyCode || "TRY",
                        }
                      );

                      return `
                        <tr>
                          <td><strong>${unit.number}</strong></td>
                          <td class="report-owner-name">${unitOwnerSummary(unit)}</td>
                          ${monthCells}
                          <td>${renderPropertyReportCell(yearly)}</td>
                          <td>
                            <button class="ghost-button inline-button" data-report-open-unit="${unit.id}">
                              Открыть
                            </button>
                          </td>
                        </tr>
                      `;
                    })
                    .join("")
                : `<tr><td colspan="16"><div class="muted-note">Нет данных для отчета.</div></td></tr>`
            }
          </tbody>
          <tfoot>
            <tr>
              <th colspan="2">Итого по дому</th>
              ${totalByMonth.map((value) => `<th>${renderPropertyReportCell(value)}</th>`).join("")}
              <th>${renderPropertyReportCell(totalByMonth.reduce((sum, value) => ({
                due: sum.due + value.due,
                applied: sum.applied + value.applied,
                credit: sum.credit + Number(value.credit || 0),
                currency: value.currency || sum.currency,
              }), {
                due: 0,
                applied: 0,
                credit: 0,
                currency: property.aidatCurrencyCode || "TRY",
              }))}</th>
              <th></th>
            </tr>
          </tfoot>
        </table>
      </div>
    </article>
  `;
}

function totalUnitsCount() {
  return dataStore.properties.reduce(
    (sum, property) => sum + property.units.length,
    0
  );
}

function totalUnitsDebt() {
  return aggregateBalances(dataStore.properties.map((property) => getPropertyBalances(property)));
}

function formatBalancesSummary(balances) {
  if (!balances.length) return "Без задолженности";
  return balances.map((balance) => formatMoney(balance.amount, balance.currency)).join(" • ");
}

function debtBreakdownMarkup(aidatBalances, utilityBalances) {
  return `
    <div class="debt-breakdown">
      <span class="debt-split debt-split-aidat">Айдат: ${formatBalancesSummary(normalizeBalanceEntries(aidatBalances))}</span>
      <span class="debt-split debt-split-utility">Коммунальные: ${formatBalancesSummary(normalizeBalanceEntries(utilityBalances))}</span>
    </div>
  `;
}

function debtFlag(balanceInput) {
  const balances = Array.isArray(balanceInput)
    ? normalizeBalanceEntries(balanceInput)
    : normalizeBalanceEntries([], balanceInput);

  return balances.length
    ? `<span class="debt-flag has-debt">Долг ${formatBalancesSummary(balances)}</span>`
    : '<span class="debt-flag no-debt">Без задолженности</span>';
}

function formatMoney(value, currency) {
  return `${value.toLocaleString("en-US")} ${currency}`;
}

function formatChargeDate(value) {
  if (!value) return "дата не указана";
  if (/^\d{4}-\d{2}$/.test(String(value))) {
    return `1 ${formatMonthYear(value)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }
  return String(value);
}

function monthRangeFromStoredDate(value) {
  const normalized = toMonthInputValue(value);
  if (!normalized) return [];
  const [year, month] = normalized.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const months = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function generateLocalAidatCharges(property, financeSettings) {
  if (financeSettings.aidatCalculationMode !== "equal_for_all") {
    return;
  }

  const amount = Number(financeSettings.aidatFixedAmount || 0);
  const currency = financeSettings.aidatCurrencyCode || "TRY";
  const months = monthRangeFromStoredDate(financeSettings.aidatStartDate);
  if (!months.length || amount <= 0) {
    return;
  }

  property.units.forEach((unit) => {
    unit.chargeLogs = Array.isArray(unit.chargeLogs) ? unit.chargeLogs : [];

    months.forEach((monthDate) => {
      const period = monthDate.toISOString().slice(0, 7);
      const exists = unit.chargeLogs.some(
        (charge) => charge.period === period && charge.chargeType === "aidat"
      );
      if (exists) return;

      unit.chargeLogs.unshift({
        id: `local-aidat-${unit.id}-${period}`,
        period,
        chargeDate: `${period}-01`,
        chargeType: "aidat",
        chargeName: "Айдат",
        amountDue: amount,
        amountPaid: 0,
        currency,
        status: "unpaid",
        note: `Aidat ${period}`,
      });

      const balances = getUnitBalances(unit);
      const balanceIndex = balances.findIndex((entry) => entry.currency === currency);
      if (balanceIndex >= 0) {
        balances[balanceIndex].amount += amount;
      } else {
        balances.push({ currency, amount });
      }
      unit.balances = balances;
      unit.debt = balances.find((entry) => entry.currency === "TRY")?.amount || 0;
    });

    unit.chargeLogs.sort((a, b) => String(b.chargeDate || b.period).localeCompare(String(a.chargeDate || a.period)));
  });

  property.totalBalances = aggregateBalances(property.units.map((unit) => getUnitBalances(unit)));
}

function applyLocalAidatPayment(unit, paymentInput) {
  let remaining = Number(paymentInput.amount || 0);
  const currency = paymentInput.currency || "TRY";
  const aidatCharges = (unit.chargeLogs || [])
    .filter((charge) => charge.chargeType === "aidat" && charge.currency === currency)
    .sort((a, b) => String(a.chargeDate || a.period).localeCompare(String(b.chargeDate || b.period)));

  for (const charge of aidatCharges) {
    if (remaining <= 0) break;
    const outstanding = Number(charge.amountDue || 0) - Number(charge.amountPaid || 0);
    if (outstanding <= 0) continue;
    const applied = Math.min(outstanding, remaining);
    charge.amountPaid = Number(charge.amountPaid || 0) + applied;
    charge.status = charge.amountPaid >= charge.amountDue ? "paid" : "partial";
    remaining -= applied;
  }

  const appliedAmount = Number(paymentInput.amount || 0) - remaining;
  if (appliedAmount <= 0) {
    throw new Error("Нет начислений айдата для погашения");
  }

  const balances = getUnitBalances(unit);
  const balanceEntry = balances.find((entry) => entry.currency === currency);
  if (balanceEntry) {
    balanceEntry.amount = Math.max(0, Number(balanceEntry.amount || 0) - appliedAmount);
  }
  unit.balances = balances.filter((entry) => entry.amount > 0);
  unit.debt = unit.balances.find((entry) => entry.currency === "TRY")?.amount || 0;
  unit.aidatPaymentLogs = Array.isArray(unit.aidatPaymentLogs) ? unit.aidatPaymentLogs : [];
  unit.aidatPaymentLogs.unshift({
    id: `local-aidat-payment-${unit.id}-${paymentInput.recordedAt}`,
    amount: Number(paymentInput.amount || 0),
    appliedAmount,
    currency,
    receivedDate: paymentInput.receivedDate,
    recordedAt: paymentInput.recordedAt,
    note: "Оплата айдата",
  });

  return appliedAmount;
}

function openAidatPaymentModal(property, unit) {
  pendingAidatPaymentUnitId = unit.id;
  aidatPaymentForm.reset();
  aidatPaymentMessage.textContent = "";
  aidatPaymentUnitLabel.value = `${property.title} / квартира ${unit.number}`;
  aidatPaymentCurrencySelect.value = property.aidatCurrencyCode || "TRY";
  aidatPaymentForm.elements.receivedDate.value = new Date().toISOString().slice(0, 10);
  aidatPaymentRecordedAtInput.value = formatDateTime(new Date().toISOString());
  aidatPaymentModal.classList.remove("is-hidden");
  aidatPaymentModal.setAttribute("aria-hidden", "false");
}

function closeAidatPaymentModal() {
  pendingAidatPaymentUnitId = null;
  aidatPaymentModal.classList.add("is-hidden");
  aidatPaymentModal.setAttribute("aria-hidden", "true");
  aidatPaymentMessage.textContent = "";
}

async function handleAddAidat(propertyFinanceForm) {
  const property = getPropertyById(propertyFinanceForm.dataset.propertyFinanceForm);
  if (!property) return;

  const formData = new FormData(propertyFinanceForm);
  const aidatStartMonth = String(formData.get("aidatStartMonth") || "").trim();
  const aidatStartYear = String(formData.get("aidatStartYear") || "").trim();
  const aidatStartValue =
    aidatStartMonth && aidatStartYear ? `${aidatStartYear}-${aidatStartMonth}` : "";
  const nextFinance = {
    aidatCalculationMode:
      String(formData.get("aidatCalculationMode") || "").trim() || "equal_for_all",
    aidatStartDate: toStoredMonthDate(aidatStartValue),
    aidatFixedAmount:
      String(formData.get("aidatCalculationMode") || "").trim() === "equal_for_all"
        ? String(formData.get("aidatFixedAmount") || "").trim()
        : "",
    aidatCurrencyCode:
      String(formData.get("aidatCalculationMode") || "").trim() === "equal_for_all"
        ? String(formData.get("aidatCurrencyCode") || "").trim() || "TRY"
        : "TRY",
  };

  try {
    const updatedProperty = await savePropertyFinanceViaApi(property.code, nextFinance);
    selectedPropertyId = updatedProperty.id;
    selectedUnitId = null;
    const financeMessage = propertyFinanceForm.querySelector("[data-property-finance-message]");
    if (financeMessage) {
      financeMessage.textContent = "Айдат добавлен через API.";
    }
  } catch (error) {
    setApiStatus("offline");
    const createdAt = new Date().toISOString();
    const logEntry = {
      id: `local-finance-log-${property.code}-${createdAt}`,
      action: "aidat_settings_updated",
      message: buildAidatLogMessage(property.title, nextFinance),
      createdAt,
      payload: nextFinance,
    };
    generateLocalAidatCharges(property, nextFinance);
    property.aidatCalculationMode = nextFinance.aidatCalculationMode;
    property.aidatStartDate = nextFinance.aidatStartDate;
    property.aidatFixedAmount = nextFinance.aidatFixedAmount;
    property.aidatCurrencyCode = nextFinance.aidatCurrencyCode;
    property.financeLogs = Array.isArray(property.financeLogs) ? property.financeLogs : [];
    property.financeLogs.unshift(logEntry);
    selectedPropertyId = property.id;
    selectedUnitId = null;
    persistDataStore();
    const financeMessage = propertyFinanceForm.querySelector("[data-property-finance-message]");
    if (financeMessage) {
      financeMessage.textContent = "API недоступен. Айдат добавлен локально.";
    }
  }

  renderSummary();
  renderProperties();
}

function statusBadge(value) {
  return `<span class="badge badge-${value}">${value}</span>`;
}

function readinessClass(status) {
  return `status-${status}`;
}

function readinessPillClass(status) {
  return `status-pill status-${status}-pill`;
}

function navLabel(viewKey) {
  const view = views[viewKey];
  return `
    <span>${view.title}</span>
    <span class="nav-mark">
      <span class="nav-dot ${readinessClass(view.readiness)}"></span>
    </span>
  `;
}

function isProjectOwner() {
  return currentUser?.role === "project_owner";
}

function hasOwnerImpersonationAccess() {
  return currentUser?.role === "project_owner" || currentImpersonator?.role === "project_owner";
}

function canAccessView(viewKey) {
  if (!currentUser) return false;
  return canRoleAccessView(currentUser.role, viewKey);
}

function canCreateRequests() {
  return canRoleCreateRequests(currentUser?.role);
}

function canAddProperties() {
  return canRoleAddProperties(currentUser?.role);
}

function canManageProperty(property) {
  if (!currentUser || !property) return false;
  return canRoleManageProperty({
    role: currentUser.role,
    propertyManagerName: property.manager,
    currentUserName: currentUser.name,
  });
}

function canEditPropertyTelegramIds(property) {
  return canManageProperty(property);
}

function ensureAccessibleView() {
  if (canAccessView(currentView)) return;
  currentView = canAccessView("dashboard")
    ? "dashboard"
    : getDefaultView(currentUser?.role, "dashboard");
}

function renderAuthUi() {
  renderStorageStatus();
  if (currentUserBadge) {
    currentUserBadge.textContent = currentUser
      ? currentImpersonator?.role === "project_owner" && currentUser.role !== "project_owner"
        ? `${currentUser.name} • ${getUserLabel(currentUser)} • через ${currentImpersonator.name}`
        : `${currentUser.name} • ${getUserLabel(currentUser)}`
      : "Гость";
  }

  if (switchUserButton) {
    switchUserButton.hidden = !currentUser;
    switchUserButton.textContent = hasOwnerImpersonationAccess()
      ? "Войти как"
      : "Сменить пользователя";
  }

  if (newRequestButton) {
    newRequestButton.hidden = !canCreateRequests();
  }

  if (addPropertyButton) {
    addPropertyButton.hidden = !canAddProperties() || Boolean(selectedPropertyId || selectedUnitId);
  }
}

function renderImpersonationOptions() {
  authUserSelect.innerHTML = impersonationTargets
    .map(
      (user) =>
        `<option value="${user.id}">${user.name} • ${user.roleLabel}${user.companyName ? ` • ${user.companyName}` : ""}</option>`
    )
    .join("");

  if (currentUser?.id) {
    authUserSelect.value = currentUser.id;
  } else if (impersonationTargets[0]) {
    authUserSelect.value = impersonationTargets[0].id;
  }
}

async function openAuthModal() {
  authMessage.textContent = "";
  authSubmitButton.disabled = false;
  authRestoreButton.hidden = true;
  authPasswordInput.value = "";

  if (hasOwnerImpersonationAccess()) {
    authMode = "impersonate";
    authTitle.textContent = "Войти как пользователь";
    authLoginField.hidden = true;
    authPasswordField.hidden = true;
    authImpersonationField.hidden = false;
    authSubmitButton.textContent = "Открыть кабинет";
    authRestoreButton.hidden = !currentImpersonator;
    authMessage.textContent = "Загружаем список пользователей...";
    authModal.classList.remove("is-hidden");
    authModal.setAttribute("aria-hidden", "false");

    try {
      impersonationTargets = await fetchImpersonationTargetsViaApi();
      renderImpersonationOptions();
      authMessage.textContent = currentImpersonator
        ? `Сейчас открыт кабинет пользователя ${currentUser.name}.`
        : "Создатель может открыть кабинет любого сотрудника или клиента.";
    } catch (error) {
      authUserSelect.innerHTML = "";
      authSubmitButton.disabled = true;
      authMessage.textContent = error.message || "Не удалось загрузить список пользователей.";
    }

    return;
  }

  authMode = "login";
  authTitle.textContent = "Вход в кабинет";
  authLoginField.hidden = false;
  authPasswordField.hidden = false;
  authImpersonationField.hidden = true;
  authSubmitButton.textContent = "Войти";
  authLoginInput.value = currentUser?.login || "";
  authMessage.textContent = "Создатель входит логином owner, сотрудники входят по коду сотрудника.";
  authModal.classList.remove("is-hidden");
  authModal.setAttribute("aria-hidden", "false");
}

function closeAuthModal() {
  authModal.classList.add("is-hidden");
  authModal.setAttribute("aria-hidden", "true");
}

function renderNav() {
  const navOrderByRole = {
    project_owner: ["dashboard", "admin-panel", "company-clients", "properties", "clients", "payments", "requests", "documents"],
    company_admin: ["dashboard", "managers", "properties", "clients", "payments", "requests"],
  };
  const preferredOrder = navOrderByRole[currentUser?.role] || [];

  if (sideNav && preferredOrder.length) {
    preferredOrder.forEach((viewKey) => {
      const link = Array.from(sideLinks).find((item) => item.dataset.view === viewKey);
      if (link) {
        sideNav.appendChild(link);
      }
    });
  }

  sideLinks.forEach((link) => {
    const viewKey = link.dataset.view;
    const isVisible = canAccessView(viewKey);
    link.hidden = !isVisible;
    link.style.display = isVisible ? "" : "none";
    link.innerHTML = navLabel(viewKey);
  });
}

function renderSummary() {
  if (isClientRole()) {
    const clientPrimaryUnit = getClientPrimaryUnit();
    const scopedRequests = getScopedRequests();
    const scopedDocuments = getScopedDocuments();
    const myUnits = getVisibleProperties().reduce(
      (sum, property) => sum + getVisibleUnits(property).length,
      0
    );
    const myAidat = clientPrimaryUnit ? getUnitAidatBalances(clientPrimaryUnit.unit) : [];

    const cards = [
      { label: "Мои квартиры", value: myUnits },
      {
        label: "Мои заявки",
        value: scopedRequests.filter((request) => request.status !== "done").length,
      },
      { label: "Айдат", value: formatBalancesSummary(myAidat) },
      { label: "Мои документы", value: scopedDocuments.length },
    ];

    summaryStrip.innerHTML = cards
      .map(
        (card, index) => `
          <article class="summary-card" data-ui-id="summary-card-client-${index + 1}">
            <p class="eyebrow">${card.label}</p>
            <strong>${card.value}</strong>
          </article>
        `
      )
      .join("");
    return;
  }

  const totalOpenRequests = dataStore.requests.filter(
    (request) => request.status !== "done"
  ).length;
  const overduePayments = dataStore.payments.filter(
    (payment) => payment.status === "overdue"
  ).length;
  const activeClients = dataStore.clients.filter(
    (client) => client.status === "active"
  ).length;
  const activePropertiesCount = dataStore.properties.filter(
    (property) => property.status !== "archived"
  ).length;
  const managedPropertiesCount = getVisibleProperties().filter(
    (property) => property.status !== "archived"
  ).length;

  const cards = [
    currentUser?.role === "company_admin"
      ? { label: "Домов в обслуживании", value: managedPropertiesCount }
      : { label: "Активные клиенты", value: activeClients },
    ...(currentUser?.role === "project_owner"
      ? []
      : [{ label: "Открытые заявки", value: totalOpenRequests }]),
    { label: "Просроченные оплаты", value: overduePayments },
    { label: "Объекты в работе", value: activePropertiesCount },
  ];

  summaryStrip.innerHTML = cards
    .map(
      (card) => `
        <article class="summary-card" data-ui-id="summary-card-${card.value}">
          <p class="eyebrow">${card.label}</p>
          <strong>${card.value}</strong>
        </article>
      `
    )
    .join("");
}

function renderDashboard() {
  if (isClientRole()) {
    const clientRecord = getCurrentClientRecord();
    const scopedRequests = getScopedRequests();
    const scopedPayments = getScopedPayments();
    const clientPrimaryUnit = getClientPrimaryUnit();

    document.getElementById("focus-card").innerHTML = clientPrimaryUnit
      ? `
        <p class="eyebrow">My apartment</p>
        <h3>${clientPrimaryUnit.property.title}, квартира ${clientPrimaryUnit.unit.number}</h3>
        <p>
          ${clientRecord?.name || currentUser.name} видит только свою квартиру, начисления, документы и заявки.
        </p>
      `
      : `
        <p class="eyebrow">My apartment</p>
        <h3>Квартира пока не привязана</h3>
        <p>Для этой роли еще не настроена привязка к помещению.</p>
      `;

    document.getElementById("request-status-grid").innerHTML = clientPrimaryUnit
      ? [
          {
            label: "Айдат",
            value: formatBalancesSummary(getUnitAidatBalances(clientPrimaryUnit.unit)),
          },
          {
            label: "Коммунальные",
            value: formatBalancesSummary(getUnitUtilityBalances(clientPrimaryUnit.unit)),
          },
          {
            label: "Документы",
            value: getScopedDocuments().length,
          },
          {
            label: "Открытые заявки",
            value: scopedRequests.filter((request) => request.status !== "done").length,
          },
        ]
          .map(
            (item, index) => `
              <article class="metric-tile" data-ui-id="metric-client-${index + 1}">
                <span>${item.label}</span>
                <strong>${item.value}</strong>
              </article>
            `
          )
          .join("")
      : '<div class="empty-state">Нет привязанной квартиры.</div>';

    document.getElementById("priority-requests").innerHTML = scopedRequests.length
      ? scopedRequests
          .map(
            (request) => `
              <article class="ticket-card" data-ui-id="card-client-request-${request.id}">
                <strong>${request.title}</strong>
                <p>${request.property}</p>
                <div class="entity-meta">
                  <span>${request.status}</span>
                  <span>${request.createdAt}</span>
                  <span>${request.priority}</span>
                </div>
              </article>
            `
          )
          .join("")
      : '<div class="empty-state">По вашей квартире заявок пока нет.</div>';

    document.getElementById("payment-health").innerHTML = [
      { label: "Оплачено", value: scopedPayments.filter((payment) => payment.status === "paid").length },
      {
        label: "Частично оплачено",
        value: scopedPayments.filter((payment) => payment.status === "partial").length,
      },
      {
        label: "Просрочено",
        value: scopedPayments.filter((payment) => payment.status === "overdue").length,
      },
    ]
      .map(
        (item, index) => `
          <div class="stack-item" data-ui-id="metric-client-payment-${index + 1}">
            <span>${item.label}</span>
            <strong>${item.value}</strong>
          </div>
        `
      )
      .join("");

    document.getElementById("staff-load").innerHTML = clientPrimaryUnit
      ? clientPrimaryUnit.unit.owners
          .map(
            (owner, index) => `
              <div class="load-row" data-ui-id="row-client-owner-${index + 1}">
                <div>
                  <strong>${owner.name}</strong>
                  <p>${owner.share || "доля не указана"}</p>
                </div>
                <div>
                  <p>${owner.phone || "телефон не указан"}</p>
                </div>
              </div>
            `
          )
          .join("")
      : '<div class="empty-state">Нет данных по собственнику.</div>';
    return;
  }

  const requestBuckets = {
    new: dataStore.requests.filter((request) => request.status === "new").length,
    in_progress: dataStore.requests.filter((request) => request.status === "in_progress").length,
    waiting: dataStore.requests.filter((request) => request.status === "waiting").length,
    done: dataStore.requests.filter((request) => request.status === "done").length,
  };

  const urgentRequests = dataStore.requests.filter(
    (request) => request.priority === "urgent" || request.priority === "high"
  );

  const paidCount = dataStore.payments.filter((payment) => payment.status === "paid").length;
  const partialCount = dataStore.payments.filter((payment) => payment.status === "partial").length;
  const overdueCount = dataStore.payments.filter((payment) => payment.status === "overdue").length;

  document.getElementById("focus-card").innerHTML = `
    <p class="eyebrow">Main Focus</p>
    <h3>Сегодня системе нужно внимание к ${urgentRequests.length} приоритетным обращениям.</h3>
    <p>Самый рискованный участок сейчас: срочные ремонты и просроченные оплаты. Этот блок потом можно будет связать с реальным SLA и оповещениями.</p>
  `;

  document.getElementById("request-status-grid").innerHTML = Object.entries(requestBuckets)
    .map(
      ([status, count]) => `
        <article class="metric-tile" data-ui-id="metric-status-${status}">
          <span>${status}</span>
          <strong>${count}</strong>
        </article>
      `
    )
    .join("");

  document.getElementById("priority-requests").innerHTML = urgentRequests
    .map(
      (request) => `
        <article class="ticket-card" data-ui-id="card-priority-request-${request.id}">
          <strong>${request.title}</strong>
          <p>${request.client} • ${request.property}</p>
          <div class="entity-meta">
            <span>${request.assignee}</span>
            <span>${request.createdAt}</span>
            <span>${request.priority}</span>
          </div>
        </article>
      `
    )
    .join("");

  document.getElementById("payment-health").innerHTML = [
    { label: "Оплачено", value: paidCount },
    { label: "Частично оплачено", value: partialCount },
    { label: "Просрочено", value: overdueCount },
  ]
    .map(
      (item) => `
        <div class="stack-item" data-ui-id="metric-payment-${item.value}">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `
    )
    .join("");

  document.getElementById("staff-load").innerHTML = dataStore.staff
    .map((member) => {
      const loadPercent = Math.min(100, member.openRequests * 10);
      return `
        <div class="load-row" data-ui-id="row-staff-${member.id}">
          <div>
            <strong>${member.name}</strong>
            <p>${getRoleLabel(member.role)}</p>
          </div>
          <div>
            <div class="load-bar"><span style="width:${loadPercent}%"></span></div>
            <p>${member.openRequests} открытых</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function matchesSearch(value) {
  if (!searchTerm) return true;
  return value.toLowerCase().includes(searchTerm.toLowerCase());
}

function renderRequestFilters() {
  const filters = ["all", "new", "in_progress", "waiting", "done"];
  requestFilters.innerHTML = filters
    .map(
      (filter) => `
        <button class="filter-chip ${requestStatusFilter === filter ? "is-active" : ""}" data-filter="${filter}" data-ui-id="filter-request-${filter}">
          ${filter}
        </button>
      `
    )
    .join("");

  requestFilters.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      requestStatusFilter = button.dataset.filter;
      renderRequestFilters();
      renderRequestsTable();
    });
  });
}

function renderRequestsTable() {
  const filtered = getScopedRequests().filter((request) => {
    const filterMatch =
      requestStatusFilter === "all" || request.status === requestStatusFilter;
    const textMatch = matchesSearch(
      `${request.id} ${request.title} ${request.client} ${request.property}`
    );
    return filterMatch && textMatch;
  });

  document.getElementById("requests-table").innerHTML = filtered.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Заголовок</th>
              <th>Клиент</th>
              <th>Объект</th>
              <th>Приоритет</th>
              <th>Статус</th>
              <th>Исполнитель</th>
              <th>Источник</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map(
                (request) => `
                  <tr data-ui-id="row-request-${request.id}">
                    <td>${request.id}</td>
                    <td>
                      <strong>${request.title}</strong>
                      <div class="table-meta">${request.createdAt}</div>
                    </td>
                    <td>${request.client}</td>
                    <td>${request.property}</td>
                    <td>${statusBadge(request.priority === "urgent" ? "urgent" : request.priority)}</td>
                    <td>${statusBadge(request.status)}</td>
                    <td>${request.assignee}</td>
                    <td>${request.source}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : '<div class="empty-state">По текущим фильтрам заявки не найдены.</div>';
}

function nextManagerId() {
  const maxValue = dataStore.staff.reduce((max, member) => {
    const numeric = Number(String(member.id || "").replace("ST-", ""));
    return Number.isNaN(numeric) ? max : Math.max(max, numeric);
  }, 0);

  return `ST-${String(maxValue + 1).padStart(2, "0")}`;
}

function renderManagers() {
  if (!managersGrid) return;

  const managers = dataStore.staff
    .filter((member) => member.role === "manager")
    .filter((member) =>
      matchesSearch(`${member.id} ${member.name} ${member.phone || ""} ${member.status || ""}`)
    );
  const canManageManagers = ["project_owner", "company_admin"].includes(currentUser?.role);

  const managerForm = canManageManagers
    ? `
      <article class="card manager-panel-card" data-ui-id="card-manager-create">
        <div class="card-head">
          <h4>${editingManagerId ? "Редактировать менеджера" : "Добавить менеджера"}</h4>
          <span>${editingManagerId ? editingManagerId : "Новый сотрудник"}</span>
        </div>
        <form id="manager-form" class="form-grid" data-manager-form>
          <label class="field">
            <span>ФИО менеджера</span>
            <input name="name" type="text" placeholder="Введите имя" value="${editingManagerId ? (managers.find((item) => item.id === editingManagerId)?.name || "") : ""}" required />
          </label>
          <label class="field">
            <span>Логин</span>
            <input name="login" type="text" placeholder="manager.login" value="${editingManagerId ? (managers.find((item) => item.id === editingManagerId)?.login || "") : ""}" required />
          </label>
          <label class="field">
            <span>Пароль</span>
            <input name="password" type="text" placeholder="${editingManagerId ? "Оставьте пустым, чтобы не менять" : "Введите пароль"}" ${editingManagerId ? "" : "required"} />
          </label>
          <label class="field">
            <span>Телефон</span>
            <input name="phone" type="text" placeholder="+90 555 ..." value="${editingManagerId ? (managers.find((item) => item.id === editingManagerId)?.phone || "") : ""}" />
          </label>
          <label class="field">
            <span>Статус</span>
            <select name="status">
              <option value="active" ${editingManagerId ? ((managers.find((item) => item.id === editingManagerId)?.status || "active") === "active" ? "selected" : "") : "selected"}>Активен</option>
              <option value="inactive" ${editingManagerId ? ((managers.find((item) => item.id === editingManagerId)?.status || "active") === "inactive" ? "selected" : "") : ""}>Неактивен</option>
            </select>
          </label>
          <div class="modal-actions field-full manager-form-actions">
            <div id="manager-form-message" class="form-message">${managerFormFeedback}</div>
            ${editingManagerId ? '<button type="button" class="ghost-button" data-cancel-manager-edit>Отмена</button>' : ''}
            <button type="submit" class="primary-button">${editingManagerId ? "Сохранить" : "Добавить"}</button>
          </div>
        </form>
      </article>
    `
    : "";

  const managerCards = managers.length
    ? managers
        .map(
          (member) => `
            <article class="entity-card" data-ui-id="card-manager-${member.id}">
              <p class="eyebrow">${member.id}</p>
              <strong>${member.name}</strong>
              <p>Менеджер компании${member.phone ? ` • ${member.phone}` : ""}</p>
              <div class="entity-meta">
                <span>Логин: ${member.login || member.id}</span>
                <span>Пароль: скрыт</span>
              </div>
              <div class="entity-meta">
                <span>${member.status === "active" ? "Активен" : "Неактивен"}</span>
                <span>${member.openRequests} открытых заявок</span>
              </div>
              ${canManageManagers ? `
                <div class="company-card-actions manager-card-actions">
                  <button type="button" class="ghost-button" data-edit-manager="${member.id}">Редактировать</button>
                  <button type="button" class="ghost-button" data-delete-manager="${member.id}">Удалить</button>
                </div>
              ` : ""}
            </article>
          `
        )
        .join("")
    : '<div class="empty-state">Менеджеры этой компании пока не добавлены.</div>';

  managersGrid.innerHTML = `${managerForm}${managerCards}`;
}

function renderClients() {
  const filtered = dataStore.clients.filter((client) =>
    matchesSearch(`${client.id} ${client.name} ${client.phone} ${client.properties.join(" ")}`)
  );

  document.getElementById("clients-grid").innerHTML = filtered
    .map(
      (client) => `
        <article class="entity-card" data-ui-id="card-client-${client.id}">
          <p class="eyebrow">${client.id}</p>
          <strong>${client.name}</strong>
          <p>${getRoleLabel(client.role)} • ${client.phone}</p>
          <div class="entity-meta">
            <span>${client.telegram}</span>
            <span>${client.status}</span>
            <span>${client.properties.length} объекта</span>
          </div>
          <p>${client.properties.join(", ")}</p>
        </article>
      `
    )
    .join("");
}

function renderProperties() {
  let selectedProperty = getPropertyById(selectedPropertyId);
  if (selectedProperty && !propertyBelongsToCurrentClient(selectedProperty)) {
    selectedPropertyId = null;
    selectedUnitId = null;
    selectedProperty = null;
  }

  let selectedUnit = getUnitById(selectedProperty, selectedUnitId);
  if (selectedUnit && !unitBelongsToCurrentClient(selectedUnit)) {
    selectedUnitId = null;
    selectedUnit = null;
  }

  addPropertyButton.hidden = !canAddProperties() || Boolean(selectedProperty || selectedUnit);

  if (!selectedProperty) {
    const filtered = getVisibleProperties().filter((property) =>
      matchesSearch(
        `${property.id} ${property.title} ${property.city} ${property.district} ${property.manager}`
      )
    );
    const activeProperties = filtered.filter((property) => property.status !== "archived");
    const archivedProperties = filtered.filter((property) => property.status === "archived");

    propertiesBreadcrumbs.innerHTML = `
      <span class="filter-chip is-active">Все объекты</span>
      <span class="filter-chip">${activeProperties.length} активных домов</span>
    `;

    propertiesOverview.innerHTML = `
      <article class="card">
        <div class="card-head">
          <h4>Реестр домов</h4>
          <span>Главный уровень</span>
        </div>
        <div class="properties-summary">
          <div class="summary-mini">
            <span>Активных домов</span>
            <strong>${activeProperties.length}</strong>
          </div>
          <div class="summary-mini">
            <span>Всего помещений</span>
            <strong>${activeProperties.reduce((sum, property) => sum + property.units.length, 0)}</strong>
          </div>
          <div class="summary-mini">
            <span>Айдат</span>
            <strong>${formatBalancesSummary(aggregateBalances(activeProperties.map((property) => getPropertyAidatBalances(property))))}</strong>
          </div>
          <div class="summary-mini">
            <span>Коммунальные</span>
            <strong>${formatBalancesSummary(aggregateBalances(activeProperties.map((property) => getPropertyUtilityBalances(property))))}</strong>
          </div>
        </div>
      </article>
      ${
        isProjectOwner()
          ? `
            <article class="card properties-archive" data-ui-id="card-properties-archive">
              <div class="card-head">
                <h4>Архив объектов</h4>
                <span>Виден только владельцу проекта</span>
              </div>
              <div class="properties-archive-list">
                ${
                  archivedProperties.length
                    ? archivedProperties
                        .map(
                          (property) => `
                            <div class="summary-mini archive-entry" data-ui-id="archive-property-${property.code}">
                              <div class="archive-entry-copy">
                                <strong>${property.code}</strong>
                                <p>${property.title}</p>
                              </div>
                              <button
                                class="ghost-button inline-button"
                                data-restore-property="${property.id}"
                                data-ui-id="btn-restore-property-${property.code}"
                              >
                                Вернуть
                              </button>
                            </div>
                          `
                        )
                        .join("")
                    : '<div class="muted-note">В архиве пока нет домов.</div>'
                }
              </div>
            </article>
          `
          : ""
      }
    `;

    propertiesGrid.className = "entity-grid";
    propertiesGrid.innerHTML = activeProperties.length
      ? activeProperties
          .map(
            (property) => `
              <article class="entity-card interactive-card property-card-shell" data-ui-id="card-property-${property.code}">
                <div>
                  <p class="eyebrow">${property.code} • ${property.id}</p>
                  <strong>${property.title}</strong>
                  <p>${property.city}, ${property.district}</p>
                </div>
                <div class="entity-meta">
                  <span>${property.type}</span>
                  <span>${property.manager}</span>
                  <span>${property.units.length} помещений</span>
                  <span>${property.status}</span>
                </div>
                ${debtBreakdownMarkup(getPropertyAidatBalances(property), getPropertyUtilityBalances(property))}
                <div class="entity-meta">
                  <button class="primary-button inline-button" data-open-property="${property.id}" data-ui-id="btn-open-property-${property.code}">
                    Открыть объект
                  </button>
                  ${
                    isProjectOwner()
                      ? `<button class="ghost-button inline-button" data-archive-property="${property.id}" data-ui-id="btn-archive-property-${property.code}">
                          В архив
                        </button>`
                      : ""
                  }
                </div>
              </article>
            `
          )
          .join("")
      : '<div class="empty-state">Объекты по текущему поиску не найдены.</div>';

    return;
  }

  if (!selectedUnit) {
    const filteredUnits = getVisibleUnits(selectedProperty).filter((unit) =>
      matchesSearch(
        `${unit.number} ${unit.status} ${unit.owners.map((owner) => owner.name).join(" ")}`
      )
    );

    propertiesBreadcrumbs.innerHTML = `
      <button class="filter-chip" data-back-to-properties="true">Все объекты</button>
      <span class="filter-chip is-active">${selectedProperty.title}</span>
    `;

    propertiesOverview.innerHTML = `
      <article class="card">
        <div class="card-head">
          <h4>${selectedProperty.title}</h4>
          <span>${selectedProperty.code} • ${selectedProperty.city}, ${selectedProperty.district}</span>
        </div>
        <div class="properties-summary">
          <div class="summary-mini">
            <span>Помещений</span>
            <strong>${selectedProperty.units.length}</strong>
          </div>
          <div class="summary-mini">
            <span>Собственников</span>
            <strong>${selectedProperty.units.reduce((sum, unit) => sum + unit.owners.length, 0)}</strong>
          </div>
          <div class="summary-mini">
            <span>Айдат по дому</span>
            <strong>${formatBalancesSummary(getPropertyAidatBalances(selectedProperty))}</strong>
          </div>
          <div class="summary-mini">
            <span>Коммунальные по дому</span>
            <strong>${formatBalancesSummary(getPropertyUtilityBalances(selectedProperty))}</strong>
          </div>
        </div>
      </article>
      ${canManageProperty(selectedProperty) ? renderPropertyFinanceEditor(selectedProperty) : ""}
      ${canManageProperty(selectedProperty) && isPropertyReportVisible ? renderPropertyYearReport(selectedProperty, filteredUnits, selectedPropertyReportYear) : ""}
    `;

    propertiesGrid.className = "unit-grid";
    propertiesGrid.innerHTML = filteredUnits.length
      ? filteredUnits
          .map(
            (unit) => `
              <article class="entity-card interactive-card unit-card-shell" data-ui-id="card-unit-${selectedProperty.code}-${unit.number}">
                <div class="unit-number">#${unit.number}</div>
                <div>
                  <strong>${unitOwnerSummary(unit)}</strong>
                  <p class="muted-note">Собственник помещения</p>
                </div>
                <div class="entity-meta">
                  <span>${unit.area} m2</span>
                  <span>Этаж ${unit.floor}</span>
                  <span>${unit.owners.length} собственник(а)</span>
                  <span>${unit.status}</span>
                </div>
                ${debtBreakdownMarkup(getUnitAidatBalances(unit), getUnitUtilityBalances(unit))}
                <button class="primary-button inline-button" data-open-unit="${unit.id}" data-ui-id="btn-open-unit-${selectedProperty.code}-${unit.number}">
                  Открыть помещение
                </button>
              </article>
            `
          )
          .join("")
      : '<div class="empty-state">Помещения по текущему поиску не найдены.</div>';

    return;
  }

  propertiesBreadcrumbs.innerHTML = `
    <button class="filter-chip" data-back-to-properties="true">Все объекты</button>
    <button class="filter-chip" data-back-to-units="true">${selectedProperty.title}</button>
    <span class="filter-chip is-active">Помещение ${selectedUnit.number}</span>
  `;

  propertiesOverview.innerHTML = `
    <article class="card" data-ui-id="card-unit-info-${selectedProperty.code}-${selectedUnit.number}">
      <div class="card-head">
        <h4>Помещение ${selectedUnit.number}</h4>
        <span>${selectedProperty.title}</span>
      </div>
      <div class="properties-summary">
        <div class="summary-mini">
          <span>Площадь</span>
          <strong>${selectedUnit.area} m2</strong>
        </div>
        <div class="summary-mini">
          <span>Собственники</span>
          <strong>${selectedUnit.owners.length}</strong>
        </div>
        <div class="summary-mini">
          <span>Айдат</span>
          <strong>${formatBalancesSummary(getUnitAidatBalances(selectedUnit))}</strong>
        </div>
        <div class="summary-mini">
          <span>Коммунальные</span>
          <strong>${formatBalancesSummary(getUnitUtilityBalances(selectedUnit))}</strong>
        </div>
      </div>
    </article>
  `;

  propertiesGrid.className = "detail-grid";
  propertiesGrid.innerHTML = `
    ${canManageProperty(selectedProperty) ? renderUnitProfileEditor(selectedUnit, selectedProperty) : ""}
    <article class="card" data-ui-id="card-unit-debts-${selectedProperty.code}-${selectedUnit.number}">
      <div class="card-head">
        <h4>Информация о помещении</h4>
        <span>Apartment profile</span>
      </div>
      <div class="entity-meta">
        <span>Номер ${selectedUnit.number}</span>
        <span>Этаж ${selectedUnit.floor}</span>
        <span>${selectedUnit.area} m2</span>
        <span>Планировка ${selectedUnit.layoutType || "не указана"}</span>
        <span>Характеристика ${selectedUnit.layoutFeature || "не указана"}</span>
        <span>Вода ${selectedUnit.waterAccountNumber || "не указан"}</span>
        <span>Электричество ${selectedUnit.electricityAccountNumber || "не указан"}</span>
        <span>${selectedUnit.status}</span>
        <span>Жителей ${selectedUnit.residents}</span>
      </div>
      <p>Здесь далее можно будет хранить техпаспорт, историю обслуживания, документы и показания.</p>
    </article>
    ${canManageProperty(selectedProperty) ? renderOwnerEditor(selectedUnit, selectedProperty) : ""}
    ${selectedUnit.owners
      .map(
        (owner, index) => `
          <article class="card" data-ui-id="card-owner-${selectedProperty.code}-${selectedUnit.number}-${index + 1}">
            <div class="card-head">
              <h4>Собственник ${index + 1}</h4>
              <span>${owner.share}</span>
            </div>
            <p><strong>${owner.name}</strong></p>
            <div class="entity-meta">
              <span>${owner.clientId}</span>
              <span>${owner.phone}</span>
              <span>Telegram ID ${owner.telegramId || "не указан"}</span>
              <span>Помещение ${selectedUnit.number}</span>
            </div>
            <p>На этом уровне позже можно открыть полную карточку клиента, историю оплат и документы.</p>
          </article>
        `
      )
      .join("")}
    <article class="card finance-focus-card">
      <div class="card-head">
        <h4>Финансовое состояние</h4>
        <span>Debts</span>
      </div>
      ${debtBreakdownMarkup(getUnitAidatBalances(selectedUnit), getUnitUtilityBalances(selectedUnit))}
      ${
        canManageProperty(selectedProperty)
          ? `<div class="owner-editor-actions">
              <button
                type="button"
                class="primary-button"
                data-add-aidat-payment="${selectedUnit.id}"
                data-ui-id="btn-add-aidat-payment-${selectedProperty.code}-${selectedUnit.number}"
              >
                Добавить оплату айдата
              </button>
            </div>`
          : ""
      }
      <div class="property-finance-log-list">
        ${
          selectedUnit.chargeLogs?.length
            ? selectedUnit.chargeLogs
                .map(
                  (charge) => `
                    <div class="finance-log-entry">
                      <strong>${formatChargeDate(charge.chargeDate || charge.period)}</strong>
                      <p>${charge.chargeName || "Начисление"}: ${formatMoney(charge.amountDue, charge.currency)}</p>
                    </div>
                  `
                )
                .join("")
            : '<div class="muted-note">Начислений по квартире пока нет.</div>'
        }
      </div>
      <div class="property-finance-log-list">
        ${
          selectedUnit.aidatPaymentLogs?.length
            ? selectedUnit.aidatPaymentLogs
                .map(
                  (payment) => `
                    <div class="finance-log-entry">
                      <strong>${formatChargeDate(payment.receivedDate)}</strong>
                      <p>Оплата айдата: ${formatMoney(payment.amount, payment.currency)}</p>
                      <p>Внесено: ${formatDateTime(payment.recordedAt)}</p>
                    </div>
                  `
                )
                .join("")
            : '<div class="muted-note">Оплат айдата пока нет.</div>'
        }
      </div>
    </article>
  `;
}

function renderPayments() {
  const filtered = buildIncomingPaymentRows().filter((payment) =>
    matchesSearch(
      `${payment.id} ${payment.propertyTitle} ${payment.propertyCode} ${payment.unitNumber} ${payment.clientName} ${payment.paymentDate}`
    )
  );

  document.getElementById("payments-table").innerHTML = filtered.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Дом</th>
              <th>Квартира</th>
              <th>ФИО</th>
              <th>Дата оплаты</th>
              <th>Оплата</th>
              <th>Зачтено</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map(
                (payment) => `
                  <tr data-ui-id="row-payment-${payment.id}">
                    <td>${payment.propertyTitle}</td>
                    <td>${payment.unitNumber}</td>
                    <td>${payment.clientName}</td>
                    <td>${formatDateTime(payment.paymentDate)}</td>
                    <td>${formatMoney(payment.amount, payment.currency)}</td>
                    <td>${formatMoney(payment.appliedAmount, payment.currency)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : '<div class="empty-state">По выбранному менеджеру платежей пока нет.</div>';
}

function renderAdminPanel() {
  if (!adminPanelGrid) return;

  const archivedProperties = dataStore.properties
    .filter((property) => property.status === "archived")
    .sort((left, right) => String(left.code || "").localeCompare(String(right.code || ""), "ru", {
      numeric: true,
      sensitivity: "base",
    }));
  const activeCompanies = dataStore.companies.filter((company) => company.status !== "blocked");

  const archiveCard = isProjectOwner()
    ? `
      <article class="card properties-archive" data-ui-id="card-owner-house-archive">
        <div class="card-head">
          <h4>Удаленные дома компаний</h4>
          <span>Создатель может восстановить дом в любую компанию</span>
        </div>
        <div class="properties-archive-list">
          ${
            archivedProperties.length
              ? archivedProperties
                  .map((property) => {
                    const selectedCompanyId =
                      archiveRestoreTargets[property.id] ||
                      property.companyId ||
                      activeCompanies[0]?.companyId ||
                      "";
                    return `
                      <div class="summary-mini archive-entry" data-ui-id="owner-archive-property-${property.code}">
                        <div class="archive-entry-copy">
                          <strong>${property.code} • ${property.title}</strong>
                          <p>${property.city}${property.district ? `, ${property.district}` : ""}</p>
                          <p>Была у компании: ${property.companyName || property.companyId || "не указана"}</p>
                        </div>
                        <div class="archive-entry-actions">
                          <select data-archive-target-company="${property.id}">
                            ${activeCompanies
                              .map(
                                (company) =>
                                  `<option value="${company.companyId}" ${company.companyId === selectedCompanyId ? "selected" : ""}>${company.title}</option>`
                              )
                              .join("")}
                          </select>
                          <button
                            class="ghost-button inline-button"
                            data-restore-archived-property="${property.id}"
                            data-ui-id="btn-owner-restore-property-${property.code}"
                            ${activeCompanies.length ? "" : "disabled"}
                          >
                            Восстановить
                          </button>
                        </div>
                      </div>
                    `;
                  })
                  .join("")
              : '<div class="muted-note">В архиве домов пока ничего нет.</div>'
          }
        </div>
      </article>
    `
    : "";

  adminPanelGrid.innerHTML = archiveCard || '<div class="empty-state">Этот раздел доступен только создателю платформы.</div>';
}

function renderCompanyClients() {
  if (!companyClientsGrid) return;

  companyClientsGrid.innerHTML = renderCompanyClientsView({
    isProjectOwner: isProjectOwner(),
    companies: dataStore.companies,
    editingCompanyId,
    formatDateTime,
  });
}

function renderDocuments() {
  const filtered = getScopedDocuments().filter((documentItem) =>
    matchesSearch(`${documentItem.id} ${documentItem.title} ${documentItem.client} ${documentItem.property}`)
  );

  document.getElementById("documents-grid").innerHTML = filtered
    .map(
      (documentItem) => `
        <article class="entity-card" data-ui-id="card-document-${documentItem.id}">
          <p class="eyebrow">${documentItem.id}</p>
          <strong>${documentItem.title}</strong>
          <p>${documentItem.client} • ${documentItem.property}</p>
          <div class="entity-meta">
            <span>${documentItem.type}</span>
            <span>${documentItem.visibility}</span>
            <span>Google Drive</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderViewMeta() {
  const view = views[currentView];
  viewTitle.textContent = view.title;
  viewDescription.innerHTML = `
    <h4>${view.title}</h4>
    <p>${view.description}</p>
    <div class="${readinessPillClass(view.readiness)}">${readinessLabels[view.readiness]}</div>
    <p>${view.note}</p>
  `;

  viewReadiness.innerHTML = `
    <div class="readiness-list">
      ${view.items
        .map(
          (item) => `
            <div class="readiness-item">
              <div class="readiness-meta">
                <span class="legend-dot ${readinessClass(item.status)}"></span>
                <div class="readiness-text">
                  <strong>${item.label}</strong>
                  <span>${readinessLabels[item.status]}</span>
                </div>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function setView(viewKey) {
  if (!canAccessView(viewKey)) {
    ensureAccessibleView();
    viewKey = currentView;
  }

  currentView = viewKey;
  sideLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.view === viewKey);
  });
  panels.forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.panel === viewKey);
  });
  renderViewMeta();
  persistNavigationState();
}

function openPropertyModal() {
  propertyModal.classList.remove("is-hidden");
  propertyModal.setAttribute("aria-hidden", "false");
  propertyFormMessage.textContent = "";
  propertyUnitCountInput.value = "4";
}

function closePropertyModal() {
  propertyModal.classList.add("is-hidden");
  propertyModal.setAttribute("aria-hidden", "true");
  propertyForm.reset();
  propertyFormMessage.textContent = "";
}

function openArchiveConfirmModal(propertyId) {
  pendingArchivePropertyId = propertyId;
  archiveConfirmModal.classList.remove("is-hidden");
  archiveConfirmModal.setAttribute("aria-hidden", "false");
}

function closeArchiveConfirmModal() {
  pendingArchivePropertyId = null;
  archiveConfirmModal.classList.add("is-hidden");
  archiveConfirmModal.setAttribute("aria-hidden", "true");
}

function renderAll() {
  renderStorageStatus();
  renderSummary();
  renderViewMeta();
  renderDashboard();
  renderAdminPanel();
  renderCompanyClients();
  renderManagers();
  renderRequestFilters();
  renderRequestsTable();
  renderClients();
  renderProperties();
  renderPayments();
  renderDocuments();
}

sideLinks.forEach((link) => {
  link.addEventListener("click", async () => {
    if (link.dataset.view === "properties") {
      selectedPropertyId = null;
      selectedUnitId = null;
      await syncPropertiesFromApi();
    }
    setView(link.dataset.view);
    if (link.dataset.view === "properties") {
      renderProperties();
    }
  });
});

document.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-open-admin-route]");
  if (routeButton) {
    setView(routeButton.dataset.openAdminRoute);
    renderAll();
    return;
  }

  const editManagerButton = event.target.closest("[data-edit-manager]");
  if (editManagerButton) {
    editingManagerId = editManagerButton.dataset.editManager;
    managerFormFeedback = "";
    renderManagers();
    return;
  }

  const cancelManagerEditButton = event.target.closest("[data-cancel-manager-edit]");
  if (cancelManagerEditButton) {
    editingManagerId = null;
    managerFormFeedback = "";
    renderManagers();
    return;
  }

  const deleteManagerButton = event.target.closest("[data-delete-manager]");
  if (deleteManagerButton) {
    const managerId = deleteManagerButton.dataset.deleteManager;
    deleteManagerViaApi(managerId)
      .then(async () => {
        editingManagerId = null;
        managerFormFeedback = `Менеджер ${managerId} удален.`;
        await syncManagersFromApi();
        renderManagers();
        renderSummary();
      })
      .catch((error) => {
        setApiStatus("offline");
        managerFormFeedback = error.message || "Не удалось удалить менеджера.";
        renderManagers();
      });
    return;
  }

  const editCompanyButton = event.target.closest("[data-company-edit]");
  if (editCompanyButton) {
    editingCompanyId = editCompanyButton.dataset.companyEdit;
    renderCompanyClients();
    return;
  }

  const cancelCompanyEditButton = event.target.closest("[data-company-edit-cancel]");
  if (cancelCompanyEditButton) {
    editingCompanyId = null;
    renderCompanyClients();
    return;
  }

  const deleteCompanyButton = event.target.closest("[data-company-delete]");
  if (!deleteCompanyButton) return;

  const companyId = deleteCompanyButton.dataset.companyDelete;
  deleteCompanyViaApi(companyId)
    .catch(() => {
      setApiStatus("offline");
      dataStore.companies = removeCompanyState(dataStore.companies, companyId);
      persistDataStore();
    })
    .finally(() => {
      editingCompanyId = null;
      renderCompanyClients();
    });
});

document.addEventListener("submit", (event) => {
  const companyForm = event.target.closest("#company-create-form");
  if (companyForm) {
    event.preventDefault();

    const formData = new FormData(companyForm);
    const companyId = String(formData.get("companyId") || "")
      .trim()
      .toUpperCase();
    const title = String(formData.get("title") || "").trim();
    const directorName = String(formData.get("directorName") || "").trim();
    const telegramId = String(formData.get("telegramId") || "").trim();
    const telegramUsername = String(formData.get("telegramUsername") || "").trim();
    const messageNode = document.getElementById("company-create-message");

    if (!companyId || !title) {
      if (messageNode) {
        messageNode.textContent = "Введите ID и название компании.";
      }
      return;
    }

    const existingCompany = dataStore.companies.find(
      (company) => company.companyId === companyId
    );

    if (existingCompany) {
      if (messageNode) {
        messageNode.textContent = "Компания с таким ID уже зарегистрирована.";
      }
      return;
    }

    createCompanyViaApi({
      companyId,
      title,
      directorName,
      telegramId,
      telegramUsername,
      status: "active",
    })
      .then((companyRecord) => {
        renderCompanyClients();
        const nextMessageNode = document.getElementById("company-create-message");
        if (nextMessageNode) {
          nextMessageNode.textContent = `Компания ${companyId} сохранена в БД. Временный пароль: ${companyRecord.tempPassword}`;
        }
      })
      .catch(() => {
        setApiStatus("offline");
        const fallbackRecord = upsertCompany({
          id: companyId,
          companyId,
          title,
          directorName,
          telegramId,
          telegramUsername,
          telegramLoginMode: "telegram_password",
          tempPassword: generateTemporaryCompanyPassword(),
          mustChangePassword: true,
          status: "invited",
          createdAt: new Date().toISOString(),
        });
        renderCompanyClients();
        const nextMessageNode = document.getElementById("company-create-message");
        if (nextMessageNode) {
          nextMessageNode.textContent = `API недоступен. Компания ${companyId} сохранена только локально. Временный пароль: ${fallbackRecord.tempPassword}`;
        }
      });
    return;
  }

  const managerForm = event.target.closest("[data-manager-form]");
  if (managerForm) {
    event.preventDefault();

    const formData = new FormData(managerForm);
    const name = String(formData.get("name") || "").trim();
    const login = String(formData.get("login") || "").trim();
    const password = String(formData.get("password") || "");
    const phone = String(formData.get("phone") || "").trim();
    const status = String(formData.get("status") || "active").trim() || "active";
    const email = "";

    if (!name) {
      managerFormFeedback = "Введите имя менеджера.";
      renderManagers();
      return;
    }

    if (!login) {
      managerFormFeedback = "Введите логин менеджера.";
      renderManagers();
      return;
    }

    if (!editingManagerId && !password) {
      managerFormFeedback = "Введите пароль менеджера.";
      renderManagers();
      return;
    }

    const request = editingManagerId
      ? updateManagerViaApi(editingManagerId, { login, password, name, phone, email, status })
      : createManagerViaApi({ login, password, name, phone, email, status });

    request
      .then(async (managerItem) => {
        managerFormFeedback = editingManagerId
          ? `Менеджер ${managerItem.name} обновлен. Логин: ${managerItem.login || managerItem.id}.${password ? " Пароль обновлен." : ""}`
          : `Менеджер ${managerItem.name} добавлен. Логин: ${managerItem.login || managerItem.id}. Пароль сохранен.`;
        editingManagerId = null;
        await syncManagersFromApi();
        renderManagers();
        renderSummary();
      })
      .catch((error) => {
        setApiStatus("offline");
        managerFormFeedback = error.message || "Не удалось сохранить менеджера.";
        renderManagers();
      });
    return;
  }

  const editForm = event.target.closest("[data-company-edit-form]");
  if (!editForm) return;

  event.preventDefault();

  const companyId = editForm.dataset.companyEditForm;
  const formData = new FormData(editForm);
  const nextPayload = {
    title: String(formData.get("title") || "").trim(),
    directorName: String(formData.get("directorName") || "").trim(),
    status: String(formData.get("status") || "").trim() || "active",
    telegramId: String(formData.get("telegramId") || "").trim(),
    telegramUsername: String(formData.get("telegramUsername") || "").trim(),
  };

  updateCompanyViaApi(companyId, nextPayload)
    .catch(() => {
      setApiStatus("offline");
      upsertCompany({
        ...dataStore.companies.find((company) => company.companyId === companyId),
        ...nextPayload,
      });
    })
    .finally(() => {
      editingCompanyId = null;
      renderCompanyClients();
    });
});

searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  renderManagers();
  renderRequestsTable();
  renderClients();
  renderProperties();
  renderPayments();
  renderDocuments();
});

refreshButton.addEventListener("click", async () => {
  if (canAccessView("managers")) {
    await syncManagersFromApi();
  }
  renderAll();
  persistNavigationState();
});

switchUserButton.addEventListener("click", async () => {
  await openAuthModal();
});

authRestoreButton.addEventListener("click", async () => {
  authMessage.textContent = "Возвращаем сессию создателя...";

  try {
    const session = await restoreAdminSessionViaApi();
    applyAdminSession(session);
    await syncCompaniesFromApi();
    await syncManagersFromApi();
    await syncPropertiesFromApi();
    closeAuthModal();
    ensureAccessibleView();
    renderNav();
    renderAuthUi();
    setView(currentView);
    renderAll();
    persistNavigationState();
  } catch (error) {
    authMessage.textContent = error.message || "Не удалось вернуться к создателю.";
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    if (authMode === "impersonate") {
      const targetId = String(authUserSelect.value || "").trim();
      if (!targetId) {
        authMessage.textContent = "Выберите пользователя.";
        return;
      }

      authMessage.textContent = "Открываем кабинет пользователя...";
      const session = await impersonateAdminSessionViaApi(targetId);
      applyAdminSession(session);
    } else {
      const login = String(authLoginInput.value || "").trim();
      const password = String(authPasswordInput.value || "");
      if (!login || !password) {
        authMessage.textContent = "Введите логин и пароль.";
        return;
      }

      authMessage.textContent = "Открываем серверную сессию...";
      const session = await loginAdminSessionViaApi(login, password);
      applyAdminSession(session);
    }

    if (currentUser.role !== "client") {
      await syncCompaniesFromApi();
      await syncManagersFromApi();
      await syncPropertiesFromApi();
    }
    closeAuthModal();
    ensureAccessibleView();
    renderNav();
    renderAuthUi();
    setView(currentView);
    renderAll();
    persistNavigationState();
  } catch (error) {
    authMessage.textContent = error.message || "Не удалось открыть сессию.";
  }
});

addPropertyButton.addEventListener("click", () => {
  setView("properties");
  openPropertyModal();
  persistNavigationState();
});

closePropertyModalButton.addEventListener("click", closePropertyModal);
cancelPropertyModalButton.addEventListener("click", closePropertyModal);
cancelArchiveConfirmButton.addEventListener("click", closeArchiveConfirmModal);
closeAidatPaymentModalButton.addEventListener("click", closeAidatPaymentModal);
cancelAidatPaymentModalButton.addEventListener("click", closeAidatPaymentModal);

propertyModal.addEventListener("click", (event) => {
  if (event.target === propertyModal) {
    closePropertyModal();
  }
});

archiveConfirmModal.addEventListener("click", (event) => {
  if (event.target === archiveConfirmModal) {
    closeArchiveConfirmModal();
  }
});

aidatPaymentModal.addEventListener("click", (event) => {
  if (event.target === aidatPaymentModal) {
    closeAidatPaymentModal();
  }
});

aidatPaymentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedProperty = getPropertyById(selectedPropertyId);
  const selectedUnit = getUnitById(selectedProperty, pendingAidatPaymentUnitId);
  if (!selectedProperty || !selectedUnit) {
    closeAidatPaymentModal();
    return;
  }

  const formData = new FormData(aidatPaymentForm);
  const paymentInput = {
    amount: Number(formData.get("amount")) || 0,
    currency:
      String(formData.get("currency") || "").trim() ||
      selectedProperty.aidatCurrencyCode ||
      "TRY",
    receivedDate: String(formData.get("receivedDate") || "").trim(),
    recordedAt: new Date().toISOString(),
  };

  if (paymentInput.amount <= 0 || !paymentInput.receivedDate) {
    aidatPaymentMessage.textContent = "Заполните сумму и дату поступления.";
    return;
  }

  try {
    const updatedProperty = await saveAidatPaymentViaApi(
      selectedUnit.code || selectedUnit.id,
      paymentInput
    );
    selectedPropertyId = updatedProperty.id;
    selectedUnitId =
      updatedProperty.units.find((unit) => unit.code === selectedUnit.code)?.id ||
      selectedUnit.id;
    closeAidatPaymentModal();
    renderSummary();
    renderProperties();
    return;
  } catch (error) {
    try {
      setApiStatus("offline");
      applyLocalAidatPayment(selectedUnit, paymentInput);
      selectedProperty.totalBalances = aggregateBalances(
        selectedProperty.units.map((unit) => getUnitBalances(unit))
      );
      persistDataStore();
      closeAidatPaymentModal();
      renderSummary();
      renderProperties();
      return;
    } catch (localError) {
      setApiStatus("offline");
      aidatPaymentMessage.textContent =
        localError.message || "Не удалось добавить оплату айдата.";
    }
  }
});

propertyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(propertyForm);
  const unitCount = Math.max(1, Number(formData.get("unitCount")) || 1);
  const newProperty = {
    title: String(formData.get("title")).trim(),
    city: String(formData.get("city")).trim(),
    district: String(formData.get("district")).trim(),
    type: String(formData.get("type")).trim(),
    manager: String(formData.get("manager")).trim(),
    status: String(formData.get("status")).trim(),
    unitCount,
  };

  if (!newProperty.title || !newProperty.city || !newProperty.district) {
    propertyFormMessage.textContent = "Заполните обязательные поля.";
    return;
  }

  try {
    const createdProperty = await createPropertyViaApi(newProperty);
    propertyFormMessage.textContent = `Объект ${createdProperty.title} добавлен через API с ID ${createdProperty.code}.`;
  } catch (error) {
    setApiStatus("offline");
    const propertyId = nextPropertyId();
    const propertyCode = nextPropertyCode();
    dataStore.properties.unshift({
      id: propertyId,
      code: propertyCode,
      ...newProperty,
      units: Array.from({ length: unitCount }, (_, index) => {
        const rowNumber = index + 1;
        return {
          id: `${propertyId}-U${rowNumber}`,
          code: `${propertyCode}-U${rowNumber}`,
          number: String(rowNumber),
          area: 0,
          floor: "-",
          debt: 0,
          residents: 0,
          status: "new",
          owners: [],
        };
      }),
    });
    persistDataStore();
    propertyFormMessage.textContent = `API недоступен. Объект ${newProperty.title} сохранен локально.`;
  }

  selectedPropertyId = null;
  selectedUnitId = null;
  renderSummary();
  renderProperties();
  renderViewMeta();
  persistNavigationState();

  window.setTimeout(() => {
    closePropertyModal();
  }, 600);
});

propertiesGrid.addEventListener("click", async (event) => {
  const propertyButton = event.target.closest("[data-open-property]");
  if (propertyButton) {
    selectedPropertyId = propertyButton.dataset.openProperty;
    selectedUnitId = null;
    const property = getPropertyById(selectedPropertyId);
    if (property?.code) {
      await loadPropertyDetailFromApi(property.code);
    }
    renderProperties();
    persistNavigationState();
    return;
  }

  const unitButton = event.target.closest("[data-open-unit]");
  if (unitButton) {
    selectedUnitId = unitButton.dataset.openUnit;
    renderProperties();
    persistNavigationState();
    return;
  }

  const addAidatPaymentButton = event.target.closest("[data-add-aidat-payment]");
  if (addAidatPaymentButton) {
    const selectedProperty = getPropertyById(selectedPropertyId);
    const unit = getUnitById(selectedProperty, addAidatPaymentButton.dataset.addAidatPayment);
    if (!selectedProperty || !unit) return;
    openAidatPaymentModal(selectedProperty, unit);
    return;
  }

  const archiveButton = event.target.closest("[data-archive-property]");
  if (archiveButton) {
    const property = getPropertyById(archiveButton.dataset.archiveProperty);
    if (!property) return;

    openArchiveConfirmModal(property.id);
    return;
  }
});

adminPanelGrid?.addEventListener("change", (event) => {
  const companySelect = event.target.closest("[data-archive-target-company]");
  if (!companySelect) return;

  archiveRestoreTargets[companySelect.dataset.archiveTargetCompany] = companySelect.value;
});

adminPanelGrid?.addEventListener("click", async (event) => {
  const restoreArchivedPropertyButton = event.target.closest("[data-restore-archived-property]");
  if (!restoreArchivedPropertyButton) return;

  const property = getPropertyById(restoreArchivedPropertyButton.dataset.restoreArchivedProperty);
  if (!property) return;

  const targetCompanyId =
    archiveRestoreTargets[property.id] || property.companyId || dataStore.companies[0]?.companyId || "";

  try {
    await restorePropertyViaApi(property.code, targetCompanyId);
  } catch (error) {
    setApiStatus("offline");
    property.status = "active";
    property.companyId = targetCompanyId || property.companyId;
    property.companyName =
      dataStore.companies.find((company) => company.companyId === (targetCompanyId || property.companyId))?.title ||
      property.companyName;
    persistDataStore();
  }

  delete archiveRestoreTargets[property.id];
  renderAdminPanel();
  renderProperties();
  renderSummary();
  persistNavigationState();
});

propertiesOverview.addEventListener("click", async (event) => {
  const openUnitFromReportButton = event.target.closest("[data-report-open-unit]");
  if (openUnitFromReportButton) {
    selectedUnitId = openUnitFromReportButton.dataset.reportOpenUnit;
    renderProperties();
    persistNavigationState();
    return;
  }

  const openPropertyReportButton = event.target.closest("[data-open-property-report]");
  if (openPropertyReportButton) {
    isPropertyReportVisible = !isPropertyReportVisible;
    renderProperties();
    persistNavigationState();
    return;
  }

  const addAidatButton = event.target.closest("[data-add-aidat]");
  if (addAidatButton) {
    const propertyFinanceForm = addAidatButton.closest("[data-property-finance-form]");
    if (!propertyFinanceForm) return;
    await handleAddAidat(propertyFinanceForm);
    return;
  }

  const restoreButton = event.target.closest("[data-restore-property]");
  if (!restoreButton) return;

  const property = getPropertyById(restoreButton.dataset.restoreProperty);
  if (!property) return;

  try {
    await restorePropertyViaApi(property.code);
  } catch (error) {
    setApiStatus("offline");
    property.status = "active";
    persistDataStore();
  }

  selectedPropertyId = null;
  selectedUnitId = null;
  renderProperties();
  renderSummary();
  persistNavigationState();
});

confirmArchiveButton.addEventListener("click", async () => {
  const property = getPropertyById(pendingArchivePropertyId);
  if (!property) {
    closeArchiveConfirmModal();
    return;
  }

  try {
    await archivePropertyViaApi(property.code);
  } catch (error) {
    setApiStatus("offline");
    property.status = "archived";
    persistDataStore();
  }

  closeArchiveConfirmModal();
  selectedPropertyId = null;
  selectedUnitId = null;
  renderProperties();
  renderSummary();
  persistNavigationState();
});

propertiesGrid.addEventListener("change", (event) => {
  const ownerCountSelect = event.target.closest("[data-owner-count-select]");
  if (!ownerCountSelect) return;

  const selectedProperty = getPropertyById(selectedPropertyId);
  const selectedUnit = getUnitById(selectedProperty, ownerCountSelect.dataset.ownerCountSelect);
  if (!selectedUnit) return;

  setOwnerDraftCount(selectedUnit, ownerCountSelect.value);
  renderProperties();
  persistNavigationState();
});

propertiesGrid.addEventListener("submit", async (event) => {
  const unitProfileForm = event.target.closest("[data-unit-profile-form]");
  if (unitProfileForm) {
    event.preventDefault();
    const selectedProperty = getPropertyById(selectedPropertyId);
    const selectedUnit = getUnitById(selectedProperty, unitProfileForm.dataset.unitProfileForm);
    if (!selectedUnit) return;

    const formData = new FormData(unitProfileForm);
    const nextProfile = {
      floor: String(formData.get("floor") || "").trim() || "-",
      area: Number(formData.get("area")) || 0,
      layoutType: String(formData.get("layoutType") || "").trim(),
      layoutFeature: String(formData.get("layoutFeature") || "").trim(),
      waterAccountNumber: String(formData.get("waterAccountNumber") || "").trim(),
      electricityAccountNumber: String(formData.get("electricityAccountNumber") || "").trim(),
    };

    try {
      await saveUnitProfileViaApi(selectedUnit.code || selectedUnit.id, nextProfile);
      const profileMessage = unitProfileForm.querySelector("[data-unit-profile-message]");
      if (profileMessage) {
        profileMessage.textContent = "Параметры квартиры обновлены через API.";
      }
    } catch (error) {
      setApiStatus("offline");
      selectedUnit.floor = nextProfile.floor;
      selectedUnit.area = nextProfile.area;
      selectedUnit.layoutType = nextProfile.layoutType;
      selectedUnit.layoutFeature = nextProfile.layoutFeature;
      selectedUnit.waterAccountNumber = nextProfile.waterAccountNumber;
      selectedUnit.electricityAccountNumber = nextProfile.electricityAccountNumber;
      persistDataStore();
      const profileMessage = unitProfileForm.querySelector("[data-unit-profile-message]");
      if (profileMessage) {
        profileMessage.textContent = "API недоступен. Параметры квартиры обновлены локально.";
      }
    }

    renderProperties();
    persistNavigationState();
    return;
  }

  const ownerForm = event.target.closest("[data-owner-form]");
  if (!ownerForm) return;

  event.preventDefault();
  const selectedProperty = getPropertyById(selectedPropertyId);
  const selectedUnit = getUnitById(selectedProperty, ownerForm.dataset.ownerForm);
  if (!selectedUnit) return;

  const formData = new FormData(ownerForm);
  const ownerCount = Math.max(1, Number(formData.get("ownerCount")) || 1);
  const owners = Array.from({ length: ownerCount }, (_, index) => {
    const currentOwner = selectedUnit.owners[index];
    const name = String(formData.get(`ownerName-${index}`) || "").trim();
    const phone = String(formData.get(`ownerPhone-${index}`) || "").trim();
    const share = String(formData.get(`ownerShare-${index}`) || "").trim();

    return {
      clientId: currentOwner?.clientId || `OWN-${selectedUnit.id}-${index + 1}`,
      name: name || `Собственник ${index + 1}`,
      phone: phone || "не заполнено",
      telegramId: String(formData.get(`ownerTelegramId-${index}`) || "").trim(),
      share: share || "",
    };
  });

  try {
    await saveOwnersViaApi(selectedUnit.code || selectedUnit.id, owners);
    const ownerMessage = ownerForm.querySelector("[data-owner-message]");
    if (ownerMessage) {
      ownerMessage.textContent = "Состав собственников обновлен через API.";
    }
  } catch (error) {
    setApiStatus("offline");
    selectedUnit.owners = owners;
    ownerEditorDrafts[selectedUnit.id] = owners.map((owner, index) =>
      normalizeOwner(owner, index)
    );
    owners.forEach((owner) => {
      upsertClientRecordFromOwner(owner, selectedProperty?.title || "");
    });
    persistDataStore();
    const ownerMessage = ownerForm.querySelector("[data-owner-message]");
    if (ownerMessage) {
      ownerMessage.textContent = "API недоступен. Состав собственников обновлен локально.";
    }
  }

  renderProperties();
  renderSummary();
  persistNavigationState();
});

propertiesOverview.addEventListener("change", (event) => {
  const reportYearSelect = event.target.closest("[data-property-report-year]");
  if (reportYearSelect) {
    selectedPropertyReportYear = Number(reportYearSelect.value) || new Date().getFullYear();
    renderProperties();
    persistNavigationState();
    return;
  }

  const aidatModeSelect = event.target.closest("[data-aidat-mode-select]");
  if (!aidatModeSelect) return;

  const financeForm = aidatModeSelect.closest("[data-property-finance-form]");
  if (!financeForm) return;

  const showFixedFields = aidatModeSelect.value === "equal_for_all";
  financeForm.querySelectorAll("[data-aidat-fixed-field]").forEach((field) => {
    field.classList.toggle("is-hidden", !showFixedFields);
  });
});

propertiesBreadcrumbs.addEventListener("click", (event) => {
  const backToProperties = event.target.closest("[data-back-to-properties]");
  if (backToProperties) {
    selectedPropertyId = null;
    selectedUnitId = null;
    renderProperties();
    persistNavigationState();
    return;
  }

  const backToUnits = event.target.closest("[data-back-to-units]");
  if (backToUnits) {
    selectedUnitId = null;
    renderProperties();
    persistNavigationState();
  }
});

async function bootstrapAdminCabinet() {
  if (adminSessionToken) {
    try {
      const session = await validateAdminSessionViaApi();
      applyAdminSession(session);
    } catch (error) {
      clearAuthState();
    }
  }

  if (currentUser) {
    if (currentUser.role !== "client") {
      await syncCompaniesFromApi();
      await syncManagersFromApi();
      await syncPropertiesFromApi();
    }
  } else {
    openAuthModal();
  }

  await restoreNavigationState();
  ensureAccessibleView();
  setView(currentView);
  renderNav();
  renderAuthUi();
  renderAll();
  persistDataStore();
  persistNavigationState();
}

bootstrapAdminCabinet();
