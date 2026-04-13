import { resolveApiBaseUrl } from "./src/config.js";
import {
  normalizeCompanyRecord,
  removeCompanyState,
  renderAdminPanelView,
  renderCompanyClientsView,
  upsertCompanyState,
} from "./src/companies.js";
import {
  renderClientDetailView,
  renderClientsListView,
} from "./src/clients.js";
import {
  renderRequestDetailView,
  renderRequestsListView,
  renderRequestStatusControlView,
} from "./src/requests.js";
import {
  renderPropertiesListView,
  renderPropertyDetailView,
  renderUnitDetailView,
} from "./src/properties.js";
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

function getUserLabel(user) {
  if (!user) return "Гость";
  return user.label || getRoleLabel(user.role);
}

const DEFAULT_DATA_STORE = {
  companies: [],
  staff: [],
  clients: [],
  properties: [],
  requests: [],
  payments: [],
  documents: [],
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
    recordedByRole: entry?.recordedByRole || "",
    recordedById: entry?.recordedById || "",
    recordedByName: entry?.recordedByName || "",
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
    managerId: property.managerId || property.manager_id || "",
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

function collectBoundClientIds(properties = []) {
  const boundClientIds = new Set();

  properties.forEach((property) => {
    (property.units || []).forEach((unit) => {
      (unit.owners || []).forEach((owner) => {
        if (owner?.clientId) {
          boundClientIds.add(owner.clientId);
        }
      });
    });
  });

  return boundClientIds;
}

function pruneUnboundClients(clients = [], properties = []) {
  const boundClientIds = collectBoundClientIds(properties);
  return clients.filter((client) => {
    if (!client?.id) return false;
    if (boundClientIds.has(client.id)) return true;
    return Array.isArray(client.properties) && client.properties.length > 0;
  });
}

function upsertClientRecordFromOwner(owner = {}, propertyTitle = "") {
  if (!owner.name) return;

  const phone = formatPhone(owner.phoneCountryCode, owner.phoneLocalNumber || owner.phone || "");
  const clientId = owner.clientId || `OWNER-${owner.name}`;
  const existingClientIndex = dataStore.clients.findIndex((client) => {
    if (client.id === clientId) return true;
    if (!phone) return false;
    return formatPhone(splitPhoneParts(client.phone).countryCode, splitPhoneParts(client.phone).localNumber) === phone;
  });

  const nextClient = normalizeClientRecord({
    id: clientId,
    name: owner.name,
    role: "owner",
    phone,
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
      id: existingClient.id || nextClient.id,
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
    id: request.id || request.code || "",
    requestNumber: Number(request.requestNumber || request.request_number) || 0,
    code: request.code || request.id || "",
    clientId: request.clientId || "",
    client: request.client || "",
    property: request.property || "",
    propertyCode: request.propertyCode || "",
    unitCode: request.unitCode || "",
    unitNumber: request.unitNumber || "",
    category: request.category || "other",
    priority: request.priority || "medium",
    status: request.status || "new",
    clientDecisionPending: Boolean(request.clientDecisionPending || request.client_decision_pending),
    assignee: request.assignee || "Unassigned",
    assigneeId: request.assigneeId || "",
    source: request.source || "admin",
    createdAt: request.createdAt || "",
    updatedAt: request.updatedAt || "",
    title: request.title || "",
    description: request.description || "",
    attachmentUrl: request.attachmentUrl || "",
    cancelComment: request.cancelComment || "",
    latestReworkCommentNumber: Number(request.latestReworkCommentNumber || request.latest_rework_comment_number) || 0,
    latestReworkComment: request.latestReworkComment || request.latest_rework_comment_text || "",
    latestReworkCommentCreatedAt: request.latestReworkCommentCreatedAt || request.latest_rework_comment_created_at || "",
    reworkComments: Array.isArray(request.reworkComments || request.rework_comments)
      ? (request.reworkComments || request.rework_comments).map((item) => ({
          number: Number(item.number) || 0,
          comment: item.comment || "",
          createdAt: item.createdAt || item.created_at || "",
        }))
      : [],
    statusHistory: Array.isArray(request.statusHistory || request.status_history || request.status_logs)
      ? (request.statusHistory || request.status_history || request.status_logs).map((item) => ({
          status: item.status || "new",
          actorRole: item.actorRole || item.actor_role || "",
          actorName: item.actorName || item.actor_name || "",
          note: item.note || "",
          changedAt: item.changedAt || item.changed_at || "",
        }))
      : [],
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

  const normalizedProperties = merged.properties.map((property, index) =>
    normalizePropertyRecord(property, index)
  );
  const normalizedClients = pruneUnboundClients(
    merged.clients.map((client) => normalizeClientRecord(client)),
    normalizedProperties
  );

  return {
    companies: merged.companies.map((company, index) =>
      normalizeCompanyRecord(company, index)
    ),
    staff: merged.staff.map((staff) => normalizeStaffRecord(staff)),
    clients: normalizedClients,
    properties: normalizedProperties,
    requests: merged.requests.map((request) => normalizeRequestRecord(request)),
    payments: merged.payments.map((payment) => normalizePaymentRecord(payment)),
    documents: merged.documents.map((documentItem) => normalizeDocumentRecord(documentItem)),
  };
}

function loadDataStore() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear legacy local business data", error);
  }
  return normalizeDataStore(cloneData(DEFAULT_DATA_STORE));
}

function persistDataStore() {}

let dataStore = loadDataStore();

function upsertCompany(company, index = 0) {
  dataStore.companies = upsertCompanyState(dataStore.companies, company, index);
  const normalized = dataStore.companies.find((item) => item.companyId === normalizeCompanyRecord(company, index).companyId) || normalizeCompanyRecord(company, index);
  persistDataStore();
  return normalized;
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
    source: "mixed",
    staticAreas: [
      "Часть KPI и обзорных карточек пока собирается на клиенте.",
      "Переходы из обзорных блоков еще не везде вынесены в отдельные экраны.",
    ],
    description:
      "Общий обзор текущей операционной нагрузки: заявки, платежи, загрузка менеджеров и ключевые риски.",
    readiness: "ready",
    note: "Экран уже собран как рабочий обзор текущей операционной картины.",
    items: [
      { label: "Макет и навигация", status: "ready" },
      { label: "KPI и карточки", status: "ready" },
      { label: "Живые данные из API", status: "todo" },
    ],
  },
  managers: {
    title: "Менеджеры",
    source: "db",
    staticAreas: [],
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
    source: "mixed",
    staticAreas: [
      "Часть служебных действий еще не вынесена в отдельные экранные маршруты.",
    ],
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
    source: "db",
    staticAreas: [],
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
    source: "db",
    staticAreas: [],
    description:
      "Очередь обращений из Telegram, клиентского кабинета и внутренних процессов с фильтрацией по статусу и приоритету.",
    readiness: "ready",
    note: "Раздел уже работает как route-screen: список заявок и отдельная карточка заявки читаются из backend-данных.",
    items: [
      { label: "Таблица заявок", status: "ready" },
      { label: "Фильтры и поиск", status: "ready" },
      { label: "Карточка заявки", status: "ready" },
      { label: "Изменение статуса", status: "ready" },
      { label: "Загрузка из backend", status: "ready" },
    ],
  },
  clients: {
    title: "Клиенты",
    source: "db",
    staticAreas: [],
    description:
      "Карточки собственников и арендаторов. Позже здесь будет переход в полную CRM-карточку клиента.",
    readiness: "progress",
    note: "Список и отдельная карточка клиента уже работают как route-screen из данных домов и квартир. CRM-редактирование еще впереди.",
    items: [
      { label: "Список клиентов", status: "ready" },
      { label: "Поиск по клиентам", status: "ready" },
      { label: "Детальная карточка клиента", status: "ready" },
      { label: "Редактирование данных", status: "todo" },
    ],
  },
  properties: {
    title: "Объекты",
    source: "db",
    staticAreas: [],
    description:
      "Дом выступает как основной объект, а внутри него ведется структура помещений, собственников и задолженностей.",
    readiness: "progress",
    note: "Раздел уже работает как route-screen: список домов, экран дома и экран помещения разделены. Следующий шаг это дальнейшая модульная чистка и расширение API-операций.",
    items: [
      { label: "Список объектов", status: "ready" },
      { label: "Помещения внутри объекта", status: "ready" },
      { label: "Карточка помещения", status: "ready" },
      { label: "Добавление объекта", status: "progress" },
      { label: "Запись в backend и PostgreSQL", status: "progress" },
    ],
  },
  payments: {
    title: "Платежи",
    source: "db",
    staticAreas: [],
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
    source: "static",
    staticAreas: [
      "Реестр документов пока отображается как UI-каркас.",
      "Загрузка файлов и чтение из БД еще не подключены.",
    ],
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
const requestsTableNode = document.getElementById("requests-table");
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
const propertiesHead = document.querySelector('[data-ui-id="head-properties"]');
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
const clientRequestModal = document.getElementById("client-request-modal");
const closeClientRequestModalButton = document.getElementById("close-client-request-modal");
const cancelClientRequestModalButton = document.getElementById("cancel-client-request-modal");
const clientRequestForm = document.getElementById("client-request-form");
const clientRequestUnitField = document.getElementById("client-request-unit-field");
const clientRequestUnitSelect = document.getElementById("client-request-unit-select");
const clientRequestDescriptionInput = document.getElementById("client-request-description");
const clientRequestPhotoInput = document.getElementById("client-request-photo");
const clientRequestRouting = document.getElementById("client-request-routing");
const clientRequestMessage = document.getElementById("client-request-message");
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
const unitEditModal = document.getElementById("unit-edit-modal");
const closeUnitEditModalButton = document.getElementById("close-unit-edit-modal");
const cancelUnitEditModalButton = document.getElementById("cancel-unit-edit-modal");
const unitEditForm = document.getElementById("unit-edit-form");
const unitEditTitle = document.getElementById("unit-edit-title");
const unitEditFields = document.getElementById("unit-edit-fields");
const unitEditMessage = document.getElementById("unit-edit-message");

const readinessLabels = {
  ready: "Настроено",
  progress: "Частично готово",
  todo: "Не сделано",
};

const sourceLabels = {
  db: "База данных",
  mixed: "Смешанный экран",
  static: "Статично",
};

const REQUEST_STATUS_LABELS = {
  all: "Все",
  new: "Новый",
  in_progress: "Принято в работу",
  done: "Выполнено",
  cancelled: "Отменено",
};

let currentView = "dashboard";
let requestStatusFilter = "all";
let searchTerm = "";
let editingCompanyId = null;
let editingManagerId = null;
let editingUnitProfileId = null;
let managerFormFeedback = "";
let clientDirectorySort = {
  key: "",
  direction: "asc",
};
let selectedPropertyId = null;
let selectedUnitId = null;
let selectedClientRowId = null;
let selectedRequestCode = null;
let selectedPropertyReportYear = new Date().getFullYear();
let isPropertyReportVisible = false;
let apiStatus = "unknown";
let pendingArchivePropertyId = null;
let archiveRestoreTargets = {};
let pendingAidatPaymentUnitId = null;
let pendingUnitEditUnitId = null;
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
    storageStatusBadge.textContent = "Не сохранено в БД";
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

function sourcePillClass(source) {
  return `source-pill source-${source || 'mixed'}`;
}

function renderImpersonationOptions() {
  if (!authUserSelect) return;
  authUserSelect.innerHTML = impersonationTargets
    .map((user) => `<option value="${user.id}">${user.name} • ${user.roleLabel}${user.companyName ? ` • ${user.companyName}` : ""}</option>`)
    .join("");

  if (currentUser?.id) {
    authUserSelect.value = currentUser.id;
  } else if (impersonationTargets[0]) {
    authUserSelect.value = impersonationTargets[0].id;
  }
}

async function openAuthModal() {
  if (!authModal) return;
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
  authMessage.textContent = "Введите логин и пароль.";
  authModal.classList.remove("is-hidden");
  authModal.setAttribute("aria-hidden", "false");
}

function closeAuthModal() {
  if (!authModal) return;
  authModal.classList.add("is-hidden");
  authModal.setAttribute("aria-hidden", "true");
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
  resetGlobalSearch();
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
      dataStore.companies = payload.items.map((company, index) => normalizeCompanyRecord(company, index));
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
      dataStore.staff = [...nonManagers, ...payload.items.map((item) => normalizeStaffRecord(item))];
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
    managerId: property?.managerId || property?.manager_id || "",
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

async function syncPropertiesFromApi() {
  try {
    const payload = await fetchJson(`/api/properties?includeArchived=${isProjectOwner() ? "1" : "0"}`);
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

async function syncRequestsFromApi() {
  const payload = await fetchJson('/api/requests');
  dataStore.requests = Array.isArray(payload.items)
    ? payload.items.map(normalizeRequestRecord)
    : [];
  setApiStatus('connected');
  return dataStore.requests;
}

async function createRequestViaApi(requestInput) {
  const payload = await fetchJson('/api/requests', {
    method: 'POST',
    body: JSON.stringify(requestInput || {}),
  });
  if (!payload.item) {
    throw new Error('Created request was not returned by API');
  }
  setApiStatus('connected');
  return normalizeRequestRecord(payload.item);
}

async function updateRequestStatusViaApi(requestCode, status, cancelComment = '') {
  const payload = await fetchJson(`/api/requests/${requestCode}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, cancelComment }),
  });
  if (!payload.item) {
    throw new Error('Updated request was not returned by API');
  }
  setApiStatus('connected');
  return normalizeRequestRecord(payload.item);
}

async function reviewRequestViaApi(requestCode, action, comment = '') {
  const payload = await fetchJson(`/api/requests/${requestCode}/client-review`, {
    method: 'PATCH',
    body: JSON.stringify({ action, comment }),
  });
  if (!payload.item) {
    throw new Error('Updated request was not returned by API');
  }
  setApiStatus('connected');
  return normalizeRequestRecord(payload.item);
}

function getPropertyById(propertyId) {
  return dataStore.properties.find((property) => property.id === propertyId) || null;
}

function getPropertyByCode(propertyCode) {
  return dataStore.properties.find((property) => property.code === propertyCode) || null;
}

function getUnitById(property, unitId) {
  if (!property) return null;
  return property.units.find((unit) => unit.id === unitId || unit.code === unitId) || null;
}

function getUnitByCode(property, unitCode) {
  if (!property) return null;
  return property.units.find((unit) => unit.code === unitCode) || null;
}

async function openPropertyById(propertyId) {
  selectedPropertyId = String(propertyId || '').trim();
  selectedUnitId = null;
  const property = getPropertyById(selectedPropertyId);
  if (property?.code) {
    await loadPropertyDetailFromApi(property.code);
  }
  renderProperties();
  persistNavigationState();
}

function openUnitByCode(unitCode) {
  selectedUnitId = String(unitCode || '').trim();
  renderProperties();
  persistNavigationState();
}

window.__openTulipProperty = openPropertyById;
window.__openTulipUnit = openUnitByCode;

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

  if (currentView === "clients" && selectedClientRowId) {
    parts.push(encodeURIComponent(selectedClientRowId));
  }

  if (currentView === "requests" && selectedRequestCode) {
    parts.push(encodeURIComponent(selectedRequestCode));
  }

  return `#${parts.join("/")}`;
}

function persistNavigationState() {
  const payload = {
    view: currentView,
    propertyCode: getPropertyById(selectedPropertyId)?.code || "",
    unitCode:
      getUnitById(getPropertyById(selectedPropertyId), selectedUnitId)?.code || "",
    clientRowId: selectedClientRowId || "",
    requestCode: selectedRequestCode || "",
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
      clientRowId: parsed?.clientRowId || "",
      requestCode: parsed?.requestCode || "",
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

  if (currentView === "clients" && navigationState.clientRowId) {
    const row = getClientDirectoryRowById(decodeURIComponent(navigationState.clientRowId));
    if (row) {
      selectedClientRowId = row.id;
    }
  }

  if (currentView === "requests" && navigationState.requestCode) {
    const request = getRequestByCode(decodeURIComponent(navigationState.requestCode));
    if (request) {
      selectedRequestCode = request.code;
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

function ownerMatchesCurrentClient(owner) {
  if (!owner) return false;
  const clientId = getCurrentClientId();
  const clientRecord = getCurrentClientRecord();
  const ownerPhone = formatPhone(owner.phoneCountryCode, owner.phoneLocalNumber || owner.phone || "");
  const clientPhone = formatPhone(
    splitPhoneParts(clientRecord?.phone || "").countryCode,
    splitPhoneParts(clientRecord?.phone || "").localNumber
  );

  if (owner.clientId === clientId) return true;
  if (clientPhone && ownerPhone && ownerPhone === clientPhone) return true;
  if (clientRecord?.telegramId && owner.telegramId && owner.telegramId === clientRecord.telegramId) return true;
  return false;
}

function unitBelongsToCurrentClient(unit) {
  if (!isClientRole()) return true;
  return Boolean(unit?.owners?.some((owner) => ownerMatchesCurrentClient(owner)));
}

function propertyBelongsToCurrentClient(property) {
  if (!isClientRole()) return true;
  return Boolean(property?.units?.some((unit) => unitBelongsToCurrentClient(unit)));
}

function getVisibleProperties() {
  if (isClientRole()) {
    return dataStore.properties.filter((property) => propertyBelongsToCurrentClient(property));
  }

  if (currentUser?.role === "company_admin") {
    const currentCompanyCode = currentUser?.company?.code || "";
    return dataStore.properties.filter((property) => property.companyId === currentCompanyCode);
  }

  if (currentUser?.role === "manager") {
    const currentCompanyCode = currentUser?.company?.code || "";
    return dataStore.properties.filter(
      (property) => property.managerId === currentUser.id
        && property.companyId === currentCompanyCode
    );
  }

  return dataStore.properties;
}

function getVisibleUnits(property) {
  if (!property) return [];
  const units = isClientRole()
    ? (property.units || []).filter((unit) => unitBelongsToCurrentClient(unit))
    : property.units || [];

  return [...units].sort(compareUnitNumbers);
}

function getScopedManagers() {
  if (currentUser?.role === "manager") {
    return dataStore.staff.filter(
      (member) => member.role === "manager" && member.id === currentUser.id
    );
  }

  if (currentUser?.role === "company_admin") {
    const currentCompanyCode = currentUser?.company?.code || "";
    const companyProperties = currentCompanyCode
      ? dataStore.properties.filter((property) => property.companyId === currentCompanyCode)
      : [];
    const companyManagerNames = new Set(
      companyProperties.map((property) => String(property.manager || "").trim()).filter(Boolean)
    );

    return dataStore.staff.filter((member) => {
      if (member.role !== "manager") return false;
      if (currentCompanyCode && member.companyId === currentCompanyCode) return true;
      return companyManagerNames.has(String(member.name || "").trim());
    });
  }

  return dataStore.staff.filter((member) => member.role === "manager");
}

function canAddAidatPaymentForCurrentUser(property) {
  if (!property) return false;
  if (currentUser?.role === "project_owner") return true;
  if (currentUser?.role === "company_admin") {
    return property.companyId === (currentUser?.company?.code || "");
  }
  if (currentUser?.role === "manager") {
    return Boolean(currentUser?.canRecordClientPayments)
      && property.managerId === currentUser.id
      && property.companyId === (currentUser?.company?.code || "");
  }
  return false;
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

function getClientRequestTargetUnits() {
  return getVisibleProperties().flatMap((property) =>
    getVisibleUnits(property).map((unit) => ({ property, unit }))
  );
}

function getRequestTargetUnit(unitCode = '') {
  const targets = getClientRequestTargetUnits();
  if (!targets.length) return null;
  if (!unitCode) return targets[0];
  return targets.find((item) => (item.unit.code || item.unit.id) === unitCode) || targets[0];
}

function unitOwnerSummary(unit) {
  const ownerNames = (unit?.owners || []).map((owner) => owner.name).filter(Boolean);
  if (!ownerNames.length) return `Квартира ${unit?.number || ''}`.trim();
  if (ownerNames.length === 1) return ownerNames[0];
  return `${ownerNames[0]} +${ownerNames.length - 1}`;
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
          paymentDate: payment.receivedDate || payment.recordedAt || '',
          recordedAt: payment.recordedAt || payment.receivedDate || '',
          amount: Number(payment.amount || 0),
          appliedAmount: Number(payment.appliedAmount || payment.amount || 0),
          currency: payment.currency || property.aidatCurrencyCode || 'TRY',
        }))
      )
    )
    .sort((left, right) => String(right.recordedAt || right.paymentDate).localeCompare(String(left.recordedAt || left.paymentDate)));
}

function getRequestResidentLabel(request) {
  return request.client || 'Собственник не указан';
}

function getRequestPreviewText(request) {
  const text = String(request.description || request.title || '').trim();
  if (!text) return 'Без описания';
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
}

function renderRequestStatusHistory(request) {
  const items = Array.isArray(request?.statusHistory) ? request.statusHistory : [];
  if (!items.length) {
    return '<div class="muted-note">История статусов пока пуста.</div>';
  }

  return `
    <div class="property-finance-log-list">
      ${items.map((item) => `
        <div class="finance-log-entry">
          <strong>${formatDateTime(item.changedAt)}</strong>
          <p>${getRequestStatusLabel(item.status)}</p>
          <p>${item.actorName || item.actorRole || 'Система'}</p>
          ${item.note ? `<p>${item.note}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderSummary() {
  if (!summaryStrip) return;

  if (isClientRole()) {
    const clientPrimaryUnit = getClientPrimaryUnit();
    const scopedRequests = getScopedRequests();
    const scopedDocuments = getScopedDocuments();
    const myUnits = getVisibleProperties().reduce((sum, property) => sum + getVisibleUnits(property).length, 0);
    const myAidat = clientPrimaryUnit ? getUnitAidatBalances(clientPrimaryUnit.unit) : [];

    const cards = [
      { label: 'Мои квартиры', value: myUnits },
      { label: 'Мои заявки', value: scopedRequests.filter((request) => request.status !== 'done').length },
      { label: 'Айдат', value: formatBalancesSummary(myAidat) },
      { label: 'Мои документы', value: scopedDocuments.length },
    ];

    summaryStrip.innerHTML = cards.map((card, index) => `
      <article class="summary-card" data-ui-id="summary-card-client-${index + 1}">
        <p class="eyebrow">${card.label}</p>
        <strong>${card.value}</strong>
      </article>
    `).join('');
    return;
  }

  const visibleProperties = getVisibleProperties().filter((property) => property.status !== 'archived');
  const scopedRequests = getScopedRequests();
  const overdueRows = buildClientDirectoryRows().filter((row) => row.aidatVariant === 'debt');
  const totalDebt = overdueRows.reduce((sum, row) => {
    const match = String(row.aidatText || '').match(/(\d+[\d,.]*)/);
    return sum + (match ? Number(String(match[1]).replace(/,/g, '')) || 0 : 0);
  }, 0);

  const cards = currentUser?.role === 'company_admin'
    ? [
        { label: 'Домов в обслуживании', value: visibleProperties.length },
        { label: 'Просроченные оплаты', value: `${overdueRows.length} • ${totalDebt ? formatMoney(totalDebt, 'TRY') : 'Без задолженности'}` },
        { label: 'Объекты в работе', value: visibleProperties.length },
      ]
    : currentUser?.role === 'manager'
      ? [
          { label: 'Клиенты', value: visibleProperties.reduce((sum, property) => sum + getVisibleUnits(property).length, 0) },
          { label: 'Просроченные оплаты', value: `${overdueRows.length} • ${totalDebt ? formatMoney(totalDebt, 'TRY') : 'Без задолженности'}` },
          { label: 'Объекты в работе', value: visibleProperties.length },
        ]
      : [
          { label: 'Компании', value: dataStore.companies.length },
          { label: 'Дома', value: visibleProperties.length },
          { label: 'Клиенты', value: dataStore.clients.filter((client) => client.status === 'active').length },
        ];

  summaryStrip.innerHTML = cards.map((card, index) => `
    <article class="summary-card" data-ui-id="summary-card-${index + 1}">
      <p class="eyebrow">${card.label}</p>
      <strong>${card.value}</strong>
    </article>
  `).join('');
}

function renderDashboard() {
  const focusCard = document.getElementById('focus-card');
  const requestStatusGrid = document.getElementById('request-status-grid');
  const priorityRequests = document.getElementById('priority-requests');
  const paymentHealth = document.getElementById('payment-health');
  const staffLoad = document.getElementById('staff-load');
  if (!focusCard || !requestStatusGrid || !priorityRequests || !paymentHealth || !staffLoad) return;

  if (isClientRole()) {
    const clientPrimaryUnit = getClientPrimaryUnit();
    const scopedRequests = getScopedRequests();
    const scopedDocuments = getScopedDocuments();
    const clientRecord = getCurrentClientRecord();

    focusCard.innerHTML = clientPrimaryUnit
      ? `<p class="eyebrow">Мое помещение</p><h3>${clientPrimaryUnit.property.title}, квартира ${clientPrimaryUnit.unit.number}</h3><p>${clientRecord?.name || currentUser?.name || 'Клиент'} видит только свои данные.</p>`
      : `<p class="eyebrow">Мое помещение</p><h3>Квартира пока не привязана</h3><p>Для этого клиента пока нет активной квартиры.</p>`;

    requestStatusGrid.innerHTML = clientPrimaryUnit
      ? [
          { label: 'Дом: айдат', value: formatBalancesSummary(getPropertyAidatBalances(clientPrimaryUnit.property)) },
          { label: 'Мой айдат', value: formatBalancesSummary(getUnitAidatBalances(clientPrimaryUnit.unit)) },
          { label: 'Коммунальные', value: 'В разработке' },
          { label: 'Мои заявки', value: scopedRequests.filter((request) => request.status !== 'done').length },
        ].map((item, index) => `<article class="metric-tile" data-ui-id="metric-client-${index + 1}"><span>${item.label}</span><strong>${item.value}</strong></article>`).join('')
      : '<div class="empty-state">Нет привязанной квартиры.</div>';

    priorityRequests.innerHTML = scopedRequests.length
      ? scopedRequests.map((request) => `<article class="ticket-card" data-ui-id="card-client-request-${request.code}"><strong>Заявка №${request.requestNumber || '—'}</strong><p>${getRequestPreviewText(request)}</p><div class="entity-meta"><span>${getRequestStatusLabel(request.status)}</span><span>${formatDateTime(request.createdAt)}</span></div></article>`).join('')
      : '<div class="empty-state">По вашей квартире заявок пока нет.</div>';

    paymentHealth.innerHTML = clientPrimaryUnit
      ? `<div class="stack-item"><span>Айдат</span><strong>${formatBalancesSummary(getUnitAidatBalances(clientPrimaryUnit.unit))}</strong></div>`
      : '<div class="empty-state">Нет данных по платежам.</div>';

    staffLoad.innerHTML = clientPrimaryUnit
      ? `<div class="load-row"><div><strong>${unitOwnerSummary(clientPrimaryUnit.unit)}</strong><p>Собственник</p></div><div><p>${clientRecord?.phone || 'Телефон не указан'}</p></div></div>`
      : '<div class="empty-state">Нет данных по собственнику.</div>';
    return;
  }

  const visibleProperties = getVisibleProperties().filter((property) => property.status !== 'archived');
  const visibleManagers = getScopedManagers();
  const scopedRequests = getScopedRequests();
  const requestBuckets = {
    new: scopedRequests.filter((request) => request.status === 'new').length,
    in_progress: scopedRequests.filter((request) => request.status === 'in_progress').length,
    done: scopedRequests.filter((request) => request.status === 'done').length,
    cancelled: scopedRequests.filter((request) => request.status === 'cancelled').length,
  };

  focusCard.innerHTML = `<p class="eyebrow">Главное</p><h3>${visibleProperties.length} домов в контуре текущего кабинета.</h3><p>Экран уже берет данные из БД по текущей роли.</p>`;
  requestStatusGrid.innerHTML = Object.entries(requestBuckets).map(([status, count]) => `<article class="metric-tile"><span>${getRequestStatusLabel(status)}</span><strong>${count}</strong></article>`).join('');
  priorityRequests.innerHTML = scopedRequests.length
    ? scopedRequests.slice(0, 5).map((request) => `<article class="ticket-card"><strong>Заявка №${request.requestNumber || '—'}</strong><p>${request.property || 'Комплекс не указан'} • ${getRequestResidentLabel(request)}</p><div class="entity-meta"><span>${getRequestStatusLabel(request.status)}</span><span>${request.assignee || 'Не назначен'}</span></div></article>`).join('')
    : '<div class="empty-state">Заявок пока нет.</div>';
  paymentHealth.innerHTML = buildIncomingPaymentRows().slice(0, 5).map((payment) => `<div class="stack-item"><span>${payment.propertyTitle} • кв. ${payment.unitNumber}</span><strong>${formatMoney(payment.amount, payment.currency)}</strong></div>`).join('') || '<div class="empty-state">Платежей пока нет.</div>';
  staffLoad.innerHTML = visibleManagers.length
    ? visibleManagers.map((member) => `<div class="load-row"><div><strong>${member.name}</strong><p>${getRoleLabel(member.role)}</p></div><div><p>${member.openRequests || 0} открытых</p></div></div>`).join('')
    : '<div class="empty-state">Менеджеров пока нет.</div>';
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
    const currentCompanyCode = currentUser?.company?.code || "";
    return dataStore.properties.filter(
      (property) => property.managerId === currentUser.id
        && property.companyId === currentCompanyCode
    );
  }
  return dataStore.properties;
}

function buildNetBalanceEntries(charges = [], payments = []) {
  const balanceMap = new Map();

  charges.forEach((charge) => {
    const currency = charge.currency || "TRY";
    const amount = Number(charge.amountDue || 0);
    balanceMap.set(currency, (balanceMap.get(currency) || 0) + amount);
  });

  payments.forEach((payment) => {
    const currency = payment.currency || "TRY";
    const amount = Number(payment.amount || 0);
    balanceMap.set(currency, (balanceMap.get(currency) || 0) - amount);
  });

  return Array.from(balanceMap.entries())
    .map(([currency, amount]) => ({ currency, amount }))
    .filter((item) => item.amount !== 0);
}

function getUnitAidatNetBalances(unit) {
  const aidatCharges = Array.isArray(unit?.chargeLogs)
    ? unit.chargeLogs.filter((charge) => charge.chargeType === "aidat")
    : [];
  const aidatPayments = Array.isArray(unit?.aidatPaymentLogs) ? unit.aidatPaymentLogs : [];
  return buildNetBalanceEntries(aidatCharges, aidatPayments);
}

function getPropertyAidatNetBalances(property) {
  return aggregateBalances((property?.units || []).map((unit) => getUnitAidatNetBalances(unit)));
}

function formatAidatNetSummary(netBalances = []) {
  if (!netBalances.length) return "Закрыто";

  const debtBalances = netBalances.filter((item) => item.amount > 0);
  const creditBalances = netBalances.filter((item) => item.amount < 0);

  if (debtBalances.length && !creditBalances.length) {
    return `Долг ${debtBalances.map((item) => formatMoney(item.amount, item.currency)).join(" • ")}`;
  }

  if (creditBalances.length && !debtBalances.length) {
    return `Переплата ${creditBalances
      .map((item) => formatMoney(Math.abs(item.amount), item.currency))
      .join(" • ")}`;
  }

  return netBalances
    .map((item) => `${item.amount > 0 ? "Долг" : "Переплата"} ${formatMoney(Math.abs(item.amount), item.currency)}`)
    .join(" • ");
}

function formatAidatPosition(netBalances = []) {
  if (!netBalances.length) {
    return { text: "Закрыто", filterText: "закрыто", variant: "neutral" };
  }

  const debtBalances = netBalances.filter((item) => item.amount > 0);
  const creditBalances = netBalances.filter((item) => item.amount < 0);

  if (debtBalances.length && !creditBalances.length) {
    return {
      text: `Долг ${debtBalances.map((item) => formatMoney(item.amount, item.currency)).join(" • ")}`,
      filterText: debtBalances.map((item) => `${item.amount} ${item.currency}`).join(" "),
      variant: "debt",
    };
  }

  if (creditBalances.length && !debtBalances.length) {
    return {
      text: `Переплата ${creditBalances.map((item) => formatMoney(Math.abs(item.amount), item.currency)).join(" • ")}`,
      filterText: creditBalances.map((item) => `${Math.abs(item.amount)} ${item.currency}`).join(" "),
      variant: "credit",
    };
  }

  return {
    text: netBalances
      .map((item) => `${item.amount > 0 ? "Долг" : "Переплата"} ${formatMoney(Math.abs(item.amount), item.currency)}`)
      .join(" • "),
    filterText: netBalances.map((item) => `${Math.abs(item.amount)} ${item.currency}`).join(" "),
    variant: "mixed",
  };
}

function buildClientDirectoryRows() {
  return getVisibleProperties()
    .filter((property) => property.status !== "archived")
    .flatMap((property) =>
      getVisibleUnits(property).flatMap((unit) => {
        const aidatCharges = Array.isArray(unit?.chargeLogs)
          ? unit.chargeLogs.filter((charge) => charge.chargeType === "aidat")
          : [];
        const aidatPayments = Array.isArray(unit?.aidatPaymentLogs) ? unit.aidatPaymentLogs : [];
        const aidatPosition = formatAidatPosition(buildNetBalanceEntries(aidatCharges, aidatPayments));
        const owners = Array.isArray(unit?.owners) ? unit.owners.filter((owner) => owner?.name) : [];

        if (!owners.length) {
          return [{
            id: `${property.code}-${unit.code}-no-owner`,
            propertyId: property.id,
            propertyCode: property.code,
            unitId: unit.id,
            unitCode: unit.code,
            ownerClientId: "",
            complex: property.title,
            unitNumber: String(unit.number || ""),
            ownerDisplay: "—",
            phone: "",
            telegramId: "",
            aidatText: aidatPosition.text,
            aidatFilterText: aidatPosition.filterText,
            aidatVariant: aidatPosition.variant,
          }];
        }

        return owners.map((owner, index) => ({
          id: `${property.code}-${unit.code}-${owner.clientId || index + 1}`,
          propertyId: property.id,
          propertyCode: property.code,
          unitId: unit.id,
          unitCode: unit.code,
          ownerClientId: owner.clientId || "",
          complex: property.title,
          unitNumber: String(unit.number || ""),
          ownerDisplay: owner.name || "—",
          phone: owner.phone || "",
          telegramId: owner.telegramId || "",
          aidatText: aidatPosition.text,
          aidatFilterText: aidatPosition.filterText,
          aidatVariant: aidatPosition.variant,
        }));
      })
    );
}

function getClientDirectorySortIcon(key) {
  if (clientDirectorySort.key !== key) return "↕";
  return clientDirectorySort.direction === "asc" ? "↑" : "↓";
}

function getClientDirectorySortLabel(key) {
  if (clientDirectorySort.key !== key) return "Без сортировки";
  return clientDirectorySort.direction === "asc" ? "По возрастанию" : "По убыванию";
}

function getClientDirectoryAidatSortValue(row) {
  const lowerText = String(row.aidatText || "").toLowerCase();
  const amountMatch = lowerText.match(/(\d+[\d,\.]*)/);
  const amount = amountMatch ? Number(String(amountMatch[1]).replace(/,/g, "")) || 0 : 0;

  if (lowerText.includes("долг")) return amount;
  if (lowerText.includes("переплата")) return -amount;
  return 0;
}

function sortClientDirectoryRows(rows) {
  if (!clientDirectorySort.key) return rows;

  const direction = clientDirectorySort.direction === "desc" ? -1 : 1;
  const sortedRows = [...rows].sort((left, right) => {
    if (clientDirectorySort.key === "unit") {
      return String(left.unitNumber).localeCompare(String(right.unitNumber), "ru", {
        numeric: true,
        sensitivity: "base",
      }) * direction;
    }

    if (clientDirectorySort.key === "aidat") {
      return (getClientDirectoryAidatSortValue(left) - getClientDirectoryAidatSortValue(right)) * direction;
    }

    const leftValue = clientDirectorySort.key === "complex" ? left.complex : left.ownerDisplay;
    const rightValue = clientDirectorySort.key === "complex" ? right.complex : right.ownerDisplay;

    return String(leftValue).localeCompare(String(rightValue), "ru", {
      numeric: true,
      sensitivity: "base",
    }) * direction;
  });

  return sortedRows;
}

function matchesSearch(value) {
  if (!searchTerm) return true;
  return String(value || '').toLowerCase().includes(searchTerm.toLowerCase());
}

function renderRequestFilters() {
  if (!requestFilters) return;

  const filters = [
    { key: 'all', label: 'Все' },
    { key: 'new', label: 'Новый' },
    { key: 'in_progress', label: 'Принято в работу' },
    { key: 'done', label: 'Выполнено' },
    { key: 'cancelled', label: 'Отменено' },
  ];

  requestFilters.innerHTML = filters
    .map(
      (filter) => `
        <button
          type="button"
          class="filter-chip ${requestStatusFilter === filter.key ? 'is-active' : ''}"
          data-filter="${filter.key}"
          data-ui-id="filter-request-${filter.key}"
        >
          ${filter.label}
        </button>
      `
    )
    .join('');

  requestFilters.querySelectorAll('.filter-chip').forEach((button) => {
    button.addEventListener('click', () => {
      requestStatusFilter = button.dataset.filter || 'all';
      renderRequestFilters();
      renderRequestsTable();
    });
  });
}

function renderRequestsTable() {
  const request = getRequestByCode(selectedRequestCode);
  if (request) {
    renderRequestDetailScreen(request);
    return;
  }

  selectedRequestCode = null;
  renderRequestsListScreen();
}

function getClientDirectoryRowById(rowId) {
  if (!rowId) return null;
  return buildClientDirectoryRows().find((row) => row.id === rowId) || null;
}

function getRequestByCode(requestCode) {
  if (!requestCode) return null;
  return getScopedRequests().find((request) => request.code === requestCode) || null;
}

function renderRequestStatusControl(request, canManageRequestStatus) {
  return renderRequestStatusControlView({
    request,
    canManageRequestStatus,
    statusBadge,
  });
}

function renderRequestsListScreen() {
  const canManageRequestStatus = ["manager", "company_admin", "project_owner"].includes(currentUser?.role);
  const filtered = getScopedRequests().filter((request) => {
    const filterMatch = requestStatusFilter === "all" || request.status === requestStatusFilter;
    const textMatch = matchesSearch(
      `#${request.requestNumber || ""} ${request.code} ${request.title} ${request.description} ${request.client} ${request.property} ${request.unitNumber || ""}`
    );
    return filterMatch && textMatch;
  });

  requestsTableNode.innerHTML = renderRequestsListView({
    filtered,
    canManageRequestStatus,
    getRequestResidentLabel,
    getRequestPreviewText,
    renderRequestStatusControl,
  });
}

function renderRequestDetailScreen(request) {
  const canManageRequestStatus = ["manager", "company_admin", "project_owner"].includes(currentUser?.role);
  requestsTableNode.innerHTML = renderRequestDetailView({
    request,
    canManageRequestStatus,
    getRequestResidentLabel,
    renderRequestStatusControl,
    renderRequestStatusHistory,
    getRequestStatusLabel,
  });
}

function renderClientsListScreen() {
  dataStore.clients = pruneUnboundClients(dataStore.clients, dataStore.properties);
  persistDataStore();

  const rows = buildClientDirectoryRows().filter((row) =>
    matchesSearch(`${row.complex} ${row.unitNumber} ${row.ownerDisplay} ${row.aidatText}`)
  );
  const filteredRows = sortClientDirectoryRows(rows);

  document.getElementById("clients-grid").innerHTML = renderClientsListView({
    filteredRows,
    getClientDirectorySortIcon,
  });
}

function renderClientDetailScreen(row) {
  const property = getPropertyByCode(row.propertyCode);
  const unit = getUnitById(property, row.unitCode || row.unitId);
  const owner = unit?.owners?.find((item) => (item.clientId || "") === row.ownerClientId) || null;
  document.getElementById("clients-grid").innerHTML = renderClientDetailView({
    row,
    unit,
    owner,
  });
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
          <label class="field field-full manager-permission-field">
            <span>Право на оплаты</span>
            <label class="manager-permission-toggle">
              <input name="canRecordClientPayments" type="checkbox" ${editingManagerId ? ((managers.find((item) => item.id === editingManagerId)?.canRecordClientPayments) ? "checked" : "") : ""} />
              <strong>Может вносить оплаты клиентов</strong>
            </label>
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
              <div class="entity-meta">
                <span>${member.canRecordClientPayments ? "Может вносить оплаты" : "Не вносит оплаты"}</span>
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
  const row = getClientDirectoryRowById(selectedClientRowId);
  if (row) {
    renderClientDetailScreen(row);
    return;
  }
  selectedClientRowId = null;
  renderClientsListScreen();
}

function renderPropertiesListScreen() {
  const filtered = getVisibleProperties().filter((property) =>
    matchesSearch(
      `${property.id} ${property.title} ${property.city} ${property.district} ${property.manager}`
    )
  );
  const activeProperties = filtered.filter((property) => property.status !== "archived");
  const archivedProperties = filtered.filter((property) => property.status === "archived");

  const view = renderPropertiesListView({
    isClientRole: isClientRole(),
    isProjectOwner: isProjectOwner(),
    activeProperties,
    archivedProperties,
    formatBalancesSummary,
    aggregateBalances,
    getPropertyAidatBalances,
    getPropertyUtilityBalances,
    debtBreakdownMarkup,
  });

  propertiesBreadcrumbs.innerHTML = view.breadcrumbs;
  propertiesOverview.innerHTML = view.overview;
  propertiesGrid.className = view.gridClassName;
  propertiesGrid.innerHTML = view.gridMarkup;
}

function renderPropertyDetailScreen(selectedProperty) {
  const filteredUnits = getVisibleUnits(selectedProperty).filter((unit) =>
    matchesSearch(
      `${unit.number} ${unit.status} ${unit.owners.map((owner) => owner.name).join(" ")}`
    )
  );

  const view = renderPropertyDetailView({
    selectedProperty,
    filteredUnits,
    formatBalancesSummary,
    getPropertyAidatBalances,
    getPropertyUtilityBalances,
    canManageProperty: canManageProperty(selectedProperty),
    renderPropertyFinanceEditor,
    isPropertyReportVisible,
    renderPropertyYearReport,
    selectedPropertyReportYear,
    unitOwnerSummary,
    debtBreakdownMarkup,
    getUnitAidatBalances,
    getUnitUtilityBalances,
  });

  propertiesBreadcrumbs.innerHTML = view.breadcrumbs;
  propertiesOverview.innerHTML = view.overview;
  propertiesGrid.className = view.gridClassName;
  propertiesGrid.innerHTML = view.gridMarkup;
}

function renderUnitDetailScreen(selectedProperty, selectedUnit) {
  const view = renderUnitDetailView({
    selectedProperty,
    selectedUnit,
    formatBalancesSummary,
    getUnitAidatBalances,
    getUnitUtilityBalances,
    buildUnitDetailMarkup,
  });

  propertiesBreadcrumbs.innerHTML = view.breadcrumbs;
  propertiesOverview.innerHTML = view.overview;
  propertiesGrid.className = view.gridClassName;
  propertiesGrid.innerHTML = view.gridMarkup;
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
    renderPropertiesListScreen();
    return;
  }

  const propertyHasLoadedUnits = Array.isArray(selectedProperty.units) && selectedProperty.units.length > 0;
  if (!selectedUnit && selectedProperty.code && !propertyHasLoadedUnits) {
    propertiesBreadcrumbs.innerHTML = `
      <button class="filter-chip" data-back-to-properties="true">Все объекты</button>
      <span class="filter-chip is-active">${selectedProperty.title}</span>
    `;
    propertiesOverview.innerHTML = '<div class="empty-state">Загружаем помещения из базы данных...</div>';
    propertiesGrid.className = 'unit-grid';
    propertiesGrid.innerHTML = '<div class="empty-state">Загружаем помещения из базы данных...</div>';
    loadPropertyDetailFromApi(selectedProperty.code)
      .then(() => {
        renderProperties();
        persistNavigationState();
      })
      .catch(() => {
        setApiStatus("offline");
        propertiesGrid.innerHTML = '<div class="empty-state">Не удалось загрузить помещения из базы данных.</div>';
      });
    return;
  }

  if (!selectedUnit) {
    renderPropertyDetailScreen(selectedProperty);
    return;
  }

  renderUnitDetailScreen(selectedProperty, selectedUnit);
}

const COUNTRY_PHONE_CODES = [
  { value: "+90", label: "+90 Turkey" },
  { value: "+7", label: "+7 Russia / Kazakhstan" },
  { value: "+380", label: "+380 Ukraine" },
  { value: "+375", label: "+375 Belarus" },
  { value: "+998", label: "+998 Uzbekistan" },
  { value: "+996", label: "+996 Kyrgyzstan" },
  { value: "+994", label: "+994 Azerbaijan" },
  { value: "+995", label: "+995 Georgia" },
  { value: "+49", label: "+49 Germany" },
  { value: "+1", label: "+1 USA / Canada" },
];

function normalizePhoneCountryCode(value = "") {
  const safeValue = String(value || "").trim();
  return COUNTRY_PHONE_CODES.some((item) => item.value === safeValue) ? safeValue : "+90";
}

function normalizePhoneLocalNumber(value = "") {
  return String(value || "").replace(/[^\d]/g, "").trim();
}

function splitPhoneParts(phone = "") {
  const normalized = String(phone || "").replace(/[^\d+]/g, "").trim();
  const matchedCountry = COUNTRY_PHONE_CODES.slice().sort((a, b) => b.value.length - a.value.length).find((item) => normalized.startsWith(item.value));
  if (!normalized) return { countryCode: "+90", localNumber: "" };
  if (!matchedCountry) return { countryCode: "+90", localNumber: normalizePhoneLocalNumber(normalized) };
  return {
    countryCode: matchedCountry.value,
    localNumber: normalizePhoneLocalNumber(normalized.slice(matchedCountry.value.length)),
  };
}

function formatPhone(countryCode = "+90", localNumber = "") {
  const normalizedCountryCode = normalizePhoneCountryCode(countryCode);
  const normalizedLocalNumber = normalizePhoneLocalNumber(localNumber);
  return normalizedLocalNumber ? `${normalizedCountryCode}${normalizedLocalNumber}` : "";
}

function normalizeOwner(owner, index) {
  const phoneParts = splitPhoneParts(owner?.phone || "");
  return {
    clientId: owner?.clientId || `NEW-${index + 1}`,
    name: owner?.name || "",
    share: owner?.share || "",
    phone: formatPhone(phoneParts.countryCode, phoneParts.localNumber),
    phoneCountryCode: phoneParts.countryCode,
    phoneLocalNumber: phoneParts.localNumber,
    telegramId: owner?.telegramId || "",
  };
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
  const nextDraft = Array.from({ length: safeCount }, (_, index) => normalizeOwner(getOwnerDraft(unit)[index], index));
  ownerEditorDrafts[unit.id] = nextDraft;
}

function canEditPropertyTelegramIds(property) {
  return canManageProperty(property);
}

function formatMoney(value, currency) {
  return `${Number(value || 0).toLocaleString("en-US")} ${currency}`;
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
  return Array.from(balanceMap.entries()).map(([currency, amount]) => ({ currency, amount })).filter((entry) => entry.amount > 0);
}

function getUnitBalances(unit) {
  return normalizeBalanceEntries(unit?.balances, unit?.debt);
}

function subtractBalances(totalBalances, subtractingBalances) {
  const resultMap = new Map();
  normalizeBalanceEntries(totalBalances).forEach((balance) => resultMap.set(balance.currency, Number(balance.amount || 0)));
  normalizeBalanceEntries(subtractingBalances).forEach((balance) => {
    const current = resultMap.get(balance.currency) || 0;
    resultMap.set(balance.currency, Math.max(0, current - Number(balance.amount || 0)));
  });
  return Array.from(resultMap.entries()).map(([currency, amount]) => ({ currency, amount })).filter((balance) => balance.amount > 0);
}

function getUnitAidatBalances(unit) {
  const aidatCharges = Array.isArray(unit?.chargeLogs) ? unit.chargeLogs.filter((charge) => charge.chargeType === "aidat") : [];
  if (!aidatCharges.length) return [];
  const aidatMap = new Map();
  aidatCharges.forEach((charge) => {
    const currency = charge.currency || "TRY";
    const outstanding = Number(charge.amountDue || 0) - Number(charge.amountPaid || 0);
    if (outstanding <= 0) return;
    aidatMap.set(currency, (aidatMap.get(currency) || 0) + outstanding);
  });
  return Array.from(aidatMap.entries()).map(([currency, amount]) => ({ currency, amount }));
}

function getUnitUtilityBalances(unit) {
  const utilityCharges = Array.isArray(unit?.chargeLogs) ? unit.chargeLogs.filter((charge) => charge.chargeType !== "aidat") : [];
  if (utilityCharges.length) {
    const utilityMap = new Map();
    utilityCharges.forEach((charge) => {
      const currency = charge.currency || "TRY";
      const outstanding = Number(charge.amountDue || 0) - Number(charge.amountPaid || 0);
      if (outstanding <= 0) return;
      utilityMap.set(currency, (utilityMap.get(currency) || 0) + outstanding);
    });
    return Array.from(utilityMap.entries()).map(([currency, amount]) => ({ currency, amount }));
  }
  return subtractBalances(getUnitBalances(unit), getUnitAidatBalances(unit));
}

function getPropertyAidatBalances(property) {
  return aggregateBalances((property?.units || []).map((unit) => getUnitAidatBalances(unit)));
}

function getPropertyUtilityBalances(property) {
  return aggregateBalances((property?.units || []).map((unit) => getUnitUtilityBalances(unit)));
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

function formatChargeDate(value) {
  if (!value) return "дата не указана";
  if (/^\d{4}-\d{2}$/.test(String(value))) {
    const [year, month] = String(value).split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("ru-RU", { year: "numeric", month: "long" });
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    }
  }
  return String(value);
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
  return date.toLocaleDateString("ru-RU", { year: "numeric", month: "long" });
}

function formatDateTime(value) {
  if (!value) return "дата не указана";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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
    options.push(`<option value="${year}" ${String(year) === selectedYear ? "selected" : ""}>${year}</option>`);
  }
  return options.join("");
}

function reportYearOptions(selectedYear = new Date().getFullYear()) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear - 2; year <= currentYear + 1; year += 1) {
    years.push(`<option value="${year}" ${Number(selectedYear) === year ? "selected" : ""}>${year}</option>`);
  }
  return years.join("");
}

function reportMonthLabels() {
  return ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
}

function buildUnitAidatYearReport(unit, property, year, defaultCurrency = "TRY") {
  const months = Array.from({ length: 12 }, (_, monthIndex) => ({ monthIndex, due: 0, applied: 0, credit: 0, currency: defaultCurrency }));
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
  return months;
}

function renderPropertyReportCell(value) {
  const due = Number(value?.due || 0);
  const applied = Number(value?.applied || 0);
  const credit = Number(value?.credit || 0);
  const currency = value?.currency || "TRY";
  const net = due - applied;
  if (due <= 0 && applied <= 0 && credit <= 0) return '<span class="report-money report-money-empty">—</span>';
  if (credit > 0 && due <= 0 && applied <= 0) {
    return ['<span class="report-money report-money-positive">Аванс</span>', `<span class="report-money-sub report-money-overpayment">+${formatMoney(credit, currency)}</span>`].join("");
  }
  if (net > 0) {
    return [`<span class="report-money report-money-negative">-${formatMoney(net, currency)}</span>`, `<span class="report-money-sub">Нач. ${formatMoney(due, currency)}</span>`, `<span class="report-money-sub">Опл. ${formatMoney(applied, currency)}</span>`].join("");
  }
  return [`<span class="report-money report-money-positive">${formatMoney(0, currency)}</span>`, `<span class="report-money-sub">Нач. ${formatMoney(due, currency)}</span>`, `<span class="report-money-sub">Опл. ${formatMoney(applied, currency)}</span>`].join("");
}

function renderPropertyYearReport(property, units, year) {
  const months = reportMonthLabels();
  const totalByMonth = Array.from({ length: 12 }, () => ({ due: 0, applied: 0, credit: 0, currency: property.aidatCurrencyCode || "TRY" }));
  return `
    <article class="card property-year-report-card">
      <div class="card-head">
        <h4>Отчет по дому</h4>
        <span>Айдат по квартирам за ${year} год</span>
      </div>
      <div class="property-year-report-toolbar">
        <label class="field property-year-select">
          <span>Год</span>
          <select data-property-report-year="${property.id}">${reportYearOptions(year)}</select>
        </label>
      </div>
      <div class="table-wrap">
        <table class="property-year-report-table">
          <thead><tr><th>Кв.</th><th>ФИО</th>${months.map((month) => `<th>${month}</th>`).join("")}<th>Итого</th><th></th></tr></thead>
          <tbody>
            ${units.length ? units.map((unit) => {
              const unitYear = buildUnitAidatYearReport(unit, property, year, property.aidatCurrencyCode || "TRY");
              const monthCells = unitYear.map((value, monthIndex) => {
                totalByMonth[monthIndex].due += value.due;
                totalByMonth[monthIndex].applied += value.applied;
                totalByMonth[monthIndex].credit += Number(value.credit || 0);
                if (value.currency) totalByMonth[monthIndex].currency = value.currency;
                return `<td>${renderPropertyReportCell(value)}</td>`;
              }).join("");
              const yearly = unitYear.reduce((sum, value) => ({ due: sum.due + value.due, applied: sum.applied + value.applied, credit: sum.credit + Number(value.credit || 0), currency: value.currency || sum.currency }), { due: 0, applied: 0, credit: 0, currency: property.aidatCurrencyCode || "TRY" });
              return `<tr><td><strong>${unit.number}</strong></td><td class="report-owner-name">${unitOwnerSummary(unit)}</td>${monthCells}<td>${renderPropertyReportCell(yearly)}</td><td><button class="ghost-button inline-button" data-report-open-unit="${unit.id}">Открыть</button></td></tr>`;
            }).join("") : `<tr><td colspan="16"><div class="muted-note">Нет данных для отчета.</div></td></tr>`}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderPropertyFinanceEditor(property) {
  return `
    <article class="card" data-ui-id="card-property-finance-${property.code}">
      <form class="property-finance-form" data-property-finance-form="${property.id}">
        <div class="card-head"><h4>Финансы</h4><span>Настройки дома</span></div>
        <div class="property-finance-grid">
          <label class="field"><span>Айдат</span><select name="aidatCalculationMode" data-aidat-mode-select="${property.id}"><option value="equal_for_all" ${property.aidatCalculationMode === "equal_for_all" ? "selected" : ""}>Равный для всех</option><option value="by_unit_area" ${property.aidatCalculationMode === "by_unit_area" ? "selected" : ""}>По размерам квартиры</option></select></label>
          <label class="field"><span>Начало учета, месяц и год</span><div class="month-year-grid"><select name="aidatStartMonth">${monthOptions(property.aidatStartDate)}</select><select name="aidatStartYear">${yearOptions(property.aidatStartDate)}</select></div></label>
          <label class="field property-finance-fixed-field ${property.aidatCalculationMode !== "equal_for_all" ? "is-hidden" : ""}" data-aidat-fixed-field="amount"><span>Сумма</span><input type="number" step="0.01" min="0" name="aidatFixedAmount" value="${property.aidatFixedAmount || ""}" placeholder="Введите сумму айдата" /></label>
          <label class="field property-finance-fixed-field ${property.aidatCalculationMode !== "equal_for_all" ? "is-hidden" : ""}" data-aidat-fixed-field="currency"><span>Валюта</span><select name="aidatCurrencyCode"><option value="TRY" ${property.aidatCurrencyCode === "TRY" ? "selected" : ""}>Лира</option><option value="EUR" ${property.aidatCurrencyCode === "EUR" ? "selected" : ""}>Евро</option><option value="USD" ${property.aidatCurrencyCode === "USD" ? "selected" : ""}>Доллар</option></select></label>
        </div>
        <div class="property-finance-actions"><div class="form-message" data-property-finance-message="${property.id}"></div><button type="button" class="ghost-button" data-open-property-report="${property.id}">Отчет по дому</button><button type="button" class="primary-button" data-add-aidat="${property.id}" data-ui-id="btn-save-property-finance-${property.code}">Добавить Айдат</button></div>
        <div class="property-finance-log-list">${property.financeLogs?.length ? property.financeLogs.map((logItem) => `<div class="finance-log-entry"><strong>${formatDateTime(logItem.createdAt)}</strong><p>${logItem.message}</p></div>`).join("") : '<div class="muted-note">История изменений айдата пока пуста.</div>'}</div>
      </form>
    </article>
  `;
}

function renderUnitEditModalFields(unit, property) {
  const draft = getOwnerDraft(unit);
  const canEditTelegramId = canEditPropertyTelegramIds(property);
  return `
    <div class="unit-edit-layout">
      <section class="unit-edit-section">
        <div class="unit-edit-section-head">
          <div>
            <p class="eyebrow">Просмотр</p>
            <h4>Параметры квартиры</h4>
          </div>
        </div>
        <div class="unit-profile-grid">
          <label class="field"><span>Этаж</span><input type="text" name="floor" value="${unit.floor}" placeholder="Например, 2" /></label>
          <label class="field"><span>Квадратура, м2</span><input type="number" step="0.01" min="0" name="area" value="${unit.area}" placeholder="120" /></label>
          <label class="field"><span>Планировка</span><select name="layoutType"><option value="" ${!unit.layoutType ? "selected" : ""}>Не выбрано</option><option value="1+1" ${unit.layoutType === "1+1" ? "selected" : ""}>1+1</option><option value="2+1" ${unit.layoutType === "2+1" ? "selected" : ""}>2+1</option><option value="3+1" ${unit.layoutType === "3+1" ? "selected" : ""}>3+1</option><option value="4+1" ${unit.layoutType === "4+1" ? "selected" : ""}>4+1</option></select></label>
          <label class="field"><span>Доп. характеристика</span><select name="layoutFeature"><option value="" ${!unit.layoutFeature ? "selected" : ""}>Не выбрано</option><option value="Линейная" ${unit.layoutFeature === "Линейная" ? "selected" : ""}>Линейная</option><option value="Дуплекс" ${unit.layoutFeature === "Дуплекс" ? "selected" : ""}>Дуплекс</option></select></label>
          <label class="field"><span>Абонентский номер водоснабжения</span><input type="text" name="waterAccountNumber" value="${unit.waterAccountNumber || ""}" placeholder="Введите номер водоснабжения" /></label>
          <label class="field"><span>Абонентский номер электричества</span><input type="text" name="electricityAccountNumber" value="${unit.electricityAccountNumber || ""}" placeholder="Введите номер электричества" /></label>
        </div>
      </section>
      <section class="unit-edit-section">
        <div class="unit-edit-section-head">
          <div>
            <p class="eyebrow">Собственники</p>
            <h4>Собственники квартиры</h4>
          </div>
          <label class="field unit-edit-owner-count">
            <span>Количество собственников</span>
            <select name="ownerCount" data-unit-edit-owner-count="${unit.id}">${[1,2,3,4,5,6].map((value) => `<option value="${value}" ${draft.length === value ? "selected" : ""}>${value}</option>`).join("")}</select>
          </label>
        </div>
        <div class="owner-editor-list">
          ${draft.map((owner, index) => `
            <div class="owner-editor-row">
              <label class="field"><span>ФИО собственника ${index + 1}</span><input type="text" name="ownerName-${index}" value="${owner.name}" placeholder="Введите имя собственника" /></label>
              <label class="field"><span>Код страны</span><select name="ownerPhoneCountry-${index}">${COUNTRY_PHONE_CODES.map((item) => `<option value="${item.value}" ${owner.phoneCountryCode === item.value ? "selected" : ""}>${item.label}</option>`).join("")}</select></label>
              <label class="field"><span>Телефон</span><input type="text" data-owner-phone-local name="ownerPhoneLocal-${index}" value="${owner.phoneLocalNumber}" placeholder="Только цифры" /></label>
              <label class="field"><span>Telegram ID</span><input type="text" name="ownerTelegramId-${index}" value="${owner.telegramId || ""}" placeholder="Например, 123456789" ${canEditTelegramId ? "" : "readonly"} /></label>
              <label class="field"><span>Доля</span><input type="text" name="ownerShare-${index}" value="${owner.share}" placeholder="50%" /></label>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function openUnitEditModal(property, unit) {
  if (!unitEditModal || !unitEditFields || !unitEditTitle) return;
  pendingUnitEditUnitId = unit.id;
  unitEditTitle.textContent = `Редактировать помещение ${unit.number}`;
  unitEditFields.innerHTML = renderUnitEditModalFields(unit, property);
  unitEditMessage.textContent = "";
  unitEditModal.classList.remove("is-hidden");
  unitEditModal.setAttribute("aria-hidden", "false");
}

function closeUnitEditModal() {
  pendingUnitEditUnitId = null;
  if (!unitEditModal) return;
  unitEditModal.classList.add("is-hidden");
  unitEditModal.setAttribute("aria-hidden", "true");
  if (unitEditFields) unitEditFields.innerHTML = "";
  if (unitEditMessage) unitEditMessage.textContent = "";
}

function renderOwnerEditor(unit, property) {
  const draft = getOwnerDraft(unit);
  const canEditTelegramId = canEditPropertyTelegramIds(property);
  return `
    <article class="card" data-ui-id="card-owner-editor-${property.code}-${unit.number}">
      <form class="owner-editor-form" data-owner-form="${unit.id}">
        <div class="owner-editor-head">
          <div><h4>Собственники квартиры</h4><p class="muted-note">Управляющая компания может менять состав собственников прямо в карточке помещения.</p></div>
          <label class="field"><span>Количество собственников</span><select name="ownerCount" data-owner-count-select="${unit.id}">${[1,2,3,4,5,6].map((value) => `<option value="${value}" ${draft.length === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        </div>
        <div class="owner-editor-list">
          ${draft.map((owner, index) => `
            <div class="owner-editor-row" data-ui-id="row-owner-editor-${property.code}-${unit.number}-${index + 1}">
              <label class="field"><span>ФИО собственника ${index + 1}</span><input type="text" name="ownerName-${index}" value="${owner.name}" placeholder="Введите имя собственника" /></label>
              <label class="field"><span>Код страны</span><select name="ownerPhoneCountry-${index}">${COUNTRY_PHONE_CODES.map((item) => `<option value="${item.value}" ${owner.phoneCountryCode === item.value ? "selected" : ""}>${item.label}</option>`).join("")}</select></label>
              <label class="field"><span>Телефон</span><input type="text" data-owner-phone-local name="ownerPhoneLocal-${index}" value="${owner.phoneLocalNumber}" placeholder="Только цифры" /></label>
              <label class="field"><span>Telegram ID</span><input type="text" name="ownerTelegramId-${index}" value="${owner.telegramId || ""}" placeholder="Например, 123456789" ${canEditTelegramId ? "" : "readonly"} /></label>
              <label class="field"><span>Доля</span><input type="text" name="ownerShare-${index}" value="${owner.share}" placeholder="50%" /></label>
            </div>`).join("")}
        </div>
        <div class="owner-editor-actions"><div class="form-message" data-owner-message="${unit.id}"></div><button type="submit" class="primary-button" data-ui-id="btn-save-owners-${property.code}-${unit.number}">Сохранить собственников</button></div>
      </form>
    </article>
  `;
}

function renderUnitProfileEditor(unit, property) {
  const isEditing = editingUnitProfileId === unit.id;
  return `
    <article class="card" data-ui-id="card-unit-profile-editor-${property.code}-${unit.number}">
      <form class="unit-profile-form" data-unit-profile-form="${unit.id}">
        <div class="card-head"><h4>Параметры квартиры</h4><span>Unit profile</span></div>
        <div class="unit-profile-grid">
          <label class="field"><span>Этаж</span><input type="text" name="floor" value="${unit.floor}" placeholder="Например, 2" ${isEditing ? "" : "disabled"} /></label>
          <label class="field"><span>Квадратура, м2</span><input type="number" step="0.01" min="0" name="area" value="${unit.area}" placeholder="120" ${isEditing ? "" : "disabled"} /></label>
          <label class="field"><span>Планировка</span><select name="layoutType" ${isEditing ? "" : "disabled"}><option value="" ${!unit.layoutType ? "selected" : ""}>Не выбрано</option><option value="1+1" ${unit.layoutType === "1+1" ? "selected" : ""}>1+1</option><option value="2+1" ${unit.layoutType === "2+1" ? "selected" : ""}>2+1</option><option value="3+1" ${unit.layoutType === "3+1" ? "selected" : ""}>3+1</option><option value="4+1" ${unit.layoutType === "4+1" ? "selected" : ""}>4+1</option></select></label>
          <label class="field"><span>Доп. характеристика</span><select name="layoutFeature" ${isEditing ? "" : "disabled"}><option value="" ${!unit.layoutFeature ? "selected" : ""}>Не выбрано</option><option value="Линейная" ${unit.layoutFeature === "Линейная" ? "selected" : ""}>Линейная</option><option value="Дуплекс" ${unit.layoutFeature === "Дуплекс" ? "selected" : ""}>Дуплекс</option></select></label>
          <label class="field"><span>Абонентский номер водоснабжения</span><input type="text" name="waterAccountNumber" value="${unit.waterAccountNumber || ""}" placeholder="Введите номер водоснабжения" ${isEditing ? "" : "disabled"} /></label>
          <label class="field"><span>Абонентский номер электричества</span><input type="text" name="electricityAccountNumber" value="${unit.electricityAccountNumber || ""}" placeholder="Введите номер электричества" ${isEditing ? "" : "disabled"} /></label>
        </div>
        <div class="unit-profile-actions"><div class="form-message" data-unit-profile-message="${unit.id}"></div>${isEditing ? `<button type="submit" class="primary-button" data-ui-id="btn-save-unit-profile-${property.code}-${unit.number}">Сохранить параметры квартиры</button>` : `<button type="button" class="primary-button" data-edit-unit-profile="${unit.id}" data-ui-id="btn-edit-unit-profile-${property.code}-${unit.number}">Изменить</button>`}</div>
      </form>
    </article>
  `;
}

function buildUnitDetailMarkup(selectedUnit, selectedProperty) {
  const unitOwners = Array.isArray(selectedUnit?.owners) ? selectedUnit.owners : [];
  const aidatBalances = getUnitAidatBalances(selectedUnit);
  const utilityBalances = getUnitUtilityBalances(selectedUnit);
  const chargeLogs = Array.isArray(selectedUnit?.chargeLogs) ? selectedUnit.chargeLogs : [];
  const aidatChargeLogs = chargeLogs.filter((charge) => charge.chargeType === "aidat");
  const aidatPaymentLogs = Array.isArray(selectedUnit?.aidatPaymentLogs) ? selectedUnit.aidatPaymentLogs : [];
  const aidatCurrency = aidatChargeLogs[0]?.currency || selectedProperty?.aidatCurrencyCode || "TRY";
  const aidatAccruedTotal = aidatChargeLogs.reduce((sum, charge) => sum + Number(charge.amountDue || 0), 0);
  const aidatPaidTotal = aidatChargeLogs.reduce((sum, charge) => sum + Number(charge.amountPaid || 0), 0);
  const aidatRemainingTotal = Math.max(0, aidatAccruedTotal - aidatPaidTotal);
  return `
    <article class="card" data-ui-id="card-unit-main-${selectedProperty.code}-${selectedUnit.number}"><div class="card-head"><h4>Информация о помещении</h4><span>${selectedProperty.title}</span></div><div class="entity-meta"><span>Номер ${selectedUnit.number}</span><span>Этаж ${selectedUnit.floor}</span><span>Площадь ${selectedUnit.area} m2</span><span>Планировка ${selectedUnit.layoutType || "не указана"}</span><span>Характеристика ${selectedUnit.layoutFeature || "не указана"}</span><span>Вода ${selectedUnit.waterAccountNumber || "не указан"}</span><span>Электричество ${selectedUnit.electricityAccountNumber || "не указан"}</span><span>Статус ${selectedUnit.status}</span><span>Жителей ${selectedUnit.residents}</span></div><div class="owner-editor-actions">${canManageProperty(selectedProperty) ? `<button type="button" class="primary-button" data-edit-unit-details="${selectedUnit.id}" data-ui-id="btn-edit-unit-details-${selectedProperty.code}-${selectedUnit.number}">Редактировать помещение</button>` : ""}</div></article>
    <article class="card" data-ui-id="card-unit-aidat-details-${selectedProperty.code}-${selectedUnit.number}"><div class="card-head"><h4>Айдат</h4><span>Данные из базы</span></div><div class="properties-summary"><div class="summary-mini"><span>Начислено</span><strong>${formatMoney(aidatAccruedTotal, aidatCurrency)}</strong></div><div class="summary-mini"><span>Оплачено</span><strong>${formatMoney(aidatPaidTotal, aidatCurrency)}</strong></div><div class="summary-mini"><span>Остаток</span><strong>${formatMoney(aidatRemainingTotal, aidatCurrency)}</strong></div></div>${aidatChargeLogs.length ? `<div class="property-finance-log-list">${aidatChargeLogs.map((charge) => `<div class="finance-log-entry"><strong>${formatChargeDate(charge.chargeDate || charge.period)}</strong><p>Начислено: ${formatMoney(Number(charge.amountDue || 0), charge.currency || aidatCurrency)}</p><p>Оплачено: ${formatMoney(Number(charge.amountPaid || 0), charge.currency || aidatCurrency)}</p></div>`).join("")}</div>` : '<div class="muted-note">Начислений айдата по квартире пока нет.</div>'}</article>
    <article class="card finance-focus-card" data-ui-id="card-unit-finance-${selectedProperty.code}-${selectedUnit.number}"><div class="card-head"><h4>Финансовое состояние</h4><span>Общий обзор</span></div>${debtBreakdownMarkup(aidatBalances, utilityBalances)}${canAddAidatPaymentForCurrentUser(selectedProperty) ? `<div class="owner-editor-actions"><button type="button" class="primary-button" data-add-aidat-payment="${selectedUnit.id}" data-ui-id="btn-add-aidat-payment-${selectedProperty.code}-${selectedUnit.number}">Добавить оплату айдата</button></div>` : ""}${aidatPaymentLogs.length ? `<div class="property-finance-log-list">${aidatPaymentLogs.map((payment) => `<div class="finance-log-entry"><strong>${formatChargeDate(payment.receivedDate)}</strong><p>Оплата айдата: ${formatMoney(payment.amount, payment.currency)}</p><p>Внесено: ${formatDateTime(payment.recordedAt)}${payment.recordedByName ? ` • ${payment.recordedByName}` : ""}</p></div>`).join("")}</div>` : '<div class="muted-note">Оплат айдата пока нет.</div>'}</article>
  `;
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
  const aidatStartValue = aidatStartMonth && aidatStartYear ? `${aidatStartYear}-${aidatStartMonth}` : "";
  const nextFinance = {
    aidatCalculationMode: String(formData.get("aidatCalculationMode") || "").trim() || "equal_for_all",
    aidatStartDate: toStoredMonthDate(aidatStartValue),
    aidatFixedAmount: String(formData.get("aidatCalculationMode") || "").trim() === "equal_for_all" ? String(formData.get("aidatFixedAmount") || "").trim() : "",
    aidatCurrencyCode: String(formData.get("aidatCalculationMode") || "").trim() === "equal_for_all" ? String(formData.get("aidatCurrencyCode") || "").trim() || "TRY" : "TRY",
  };
  try {
    const updatedProperty = await savePropertyFinanceViaApi(property.code, nextFinance);
    selectedPropertyId = updatedProperty.id;
    selectedUnitId = null;
    const financeMessage = propertyFinanceForm.querySelector("[data-property-finance-message]");
    if (financeMessage) financeMessage.textContent = "Айдат добавлен через API.";
  } catch (error) {
    setApiStatus("offline");
    const financeMessage = propertyFinanceForm.querySelector("[data-property-finance-message]");
    if (financeMessage) financeMessage.textContent = error.message || "Не удалось сохранить айдат в базе данных.";
  }
  renderSummary();
  renderProperties();
}

function getRequestStatusLabel(value) {
  return REQUEST_STATUS_LABELS[value] || value || "Не указан";
}

function statusBadge(value) {
  return `<span class="badge badge-${value}">${getRequestStatusLabel(value)}</span>`;
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
    propertyManagerId: property.managerId,
    currentUserId: currentUser.id,
    propertyCompanyCode: property.companyId,
    currentCompanyCode: currentUser?.company?.code || "",
  });
}

function ensureAccessibleView() {
  if (canAccessView(currentView)) return;
  currentView = canAccessView("dashboard")
    ? "dashboard"
    : getDefaultView(currentUser?.role, "dashboard");
}

function renderNav() {
  const navOrderByRole = {
    project_owner: ["dashboard", "admin-panel", "company-clients", "properties", "clients", "payments", "requests", "documents"],
    company_admin: ["dashboard", "managers", "properties", "clients", "payments", "requests"],
    client: ["properties", "requests"],
  };
  const preferredOrder = navOrderByRole[currentUser?.role] || [];

  if (sideNav && preferredOrder.length) {
    preferredOrder.forEach((viewKey) => {
      const link = Array.from(sideLinks).find((item) => item.dataset.view === viewKey);
      if (link) sideNav.appendChild(link);
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

function resetGlobalSearch() {
  searchTerm = "";
  if (searchInput) {
    searchInput.value = "";
  }
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
    switchUserButton.textContent = hasOwnerImpersonationAccess() ? "Войти как" : "Сменить пользователя";
  }

  if (newRequestButton) {
    newRequestButton.hidden = !canCreateRequests();
  }

  if (addPropertyButton) {
    addPropertyButton.hidden = !canAddProperties() || Boolean(selectedPropertyId || selectedUnitId);
  }
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
  const hideClientRequestDescription = isClientRole() && currentView === "requests";
  const requestsStatusPill = document.querySelector('[data-ui-id="pill-requests-status"]');
  const staticAreas = Array.isArray(view.staticAreas) ? view.staticAreas : [];
  viewTitle.textContent = view.title;
  viewDescription.innerHTML = `
    <h4>${view.title}</h4>
    ${hideClientRequestDescription ? "" : `<p>${view.description}</p>`}
    <div class="view-meta-pills">
      <div class="${readinessPillClass(view.readiness)}">${readinessLabels[view.readiness]}</div>
      <div class="${sourcePillClass(view.source)}">${sourceLabels[view.source] || sourceLabels.mixed}</div>
    </div>
    <p>${view.note}</p>
    ${staticAreas.length ? `
      <div class="static-areas-note">
        <strong>Пока статично</strong>
        <ul class="plain-list static-areas-list">
          ${staticAreas.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    ` : ""}
  `;

  if (requestsStatusPill) {
    requestsStatusPill.textContent = hideClientRequestDescription ? "" : "Queue management";
    requestsStatusPill.style.display = hideClientRequestDescription ? "none" : "";
  }

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

function renderClientRequestRouting(requestTarget) {
  if (!clientRequestRouting) return;
  const companyName = requestTarget?.property?.companyName || "не указана";
  const managerName = requestTarget?.property?.manager || "не назначен";
  clientRequestRouting.innerHTML = `Заявка передается компании <strong>${companyName}</strong>, ответственный менеджер <strong>${managerName}</strong>.`;
}

function openClientRequestModal(requestTarget = getRequestTargetUnit()) {
  if (!clientRequestModal || !clientRequestForm) return;
  const requestTargets = getClientRequestTargetUnits();
  const selectedTarget = requestTarget || requestTargets[0] || null;

  clientRequestModal.classList.remove("is-hidden");
  clientRequestModal.setAttribute("aria-hidden", "false");
  clientRequestForm.reset();
  clientRequestMessage.textContent = "";

  if (clientRequestUnitField && clientRequestUnitSelect) {
    if (requestTargets.length > 1) {
      clientRequestUnitField.classList.remove("is-hidden");
      clientRequestUnitSelect.innerHTML = requestTargets
        .map((item) => {
          const unitCode = item.unit.code || item.unit.id;
          const selected = selectedTarget && (selectedTarget.unit.code || selectedTarget.unit.id) === unitCode;
          return `<option value="${unitCode}" ${selected ? "selected" : ""}>${item.property.title} • кв. ${item.unit.number}</option>`;
        })
        .join("");
    } else {
      clientRequestUnitField.classList.add("is-hidden");
      clientRequestUnitSelect.innerHTML = selectedTarget
        ? `<option value="${selectedTarget.unit.code || selectedTarget.unit.id}" selected>${selectedTarget.property.title} • кв. ${selectedTarget.unit.number}</option>`
        : "";
    }
  }

  renderClientRequestRouting(selectedTarget);
}

function closeClientRequestModal() {
  if (!clientRequestModal || !clientRequestForm) return;
  clientRequestModal.classList.add("is-hidden");
  clientRequestModal.setAttribute("aria-hidden", "true");
  clientRequestForm.reset();
  clientRequestMessage.textContent = "";
  if (clientRequestRouting) {
    clientRequestRouting.textContent = "";
  }
  if (clientRequestUnitSelect) {
    clientRequestUnitSelect.innerHTML = "";
  }
  if (clientRequestUnitField) {
    clientRequestUnitField.classList.add("is-hidden");
  }
}

async function readFileAsDataUrl(file) {
  if (!file) return "";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
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
    if (["properties", "clients"].includes(link.dataset.view)) {
      if (link.dataset.view === "properties") {
        selectedPropertyId = null;
        selectedUnitId = null;
      }
      if (link.dataset.view === "clients") {
        selectedClientRowId = null;
      }
      await syncPropertiesFromApi();
    }
    if (link.dataset.view === "requests") {
      selectedRequestCode = null;
    }
    setView(link.dataset.view);
    if (link.dataset.view === "properties") {
      renderProperties();
    }
    if (link.dataset.view === "clients") {
      renderClients();
    }
    if (link.dataset.view === "requests") {
      renderRequestsTable();
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

  const openClientRequestButton = event.target.closest("[data-open-client-request]");
  if (openClientRequestButton) {
    const requestTarget = getRequestTargetUnit();
    if (!requestTarget) {
      window.alert("Для заявки нужна привязанная квартира.");
      return;
    }
    openClientRequestModal(requestTarget);
    return;
  }

  const saveRequestStatusButton = event.target.closest("[data-save-request-status]");
  if (saveRequestStatusButton) {
    const requestCode = saveRequestStatusButton.dataset.saveRequestStatus;
    const statusSelect = document.querySelector(`[data-request-status-select="${requestCode}"]`);
    const cancelCommentInput = document.querySelector(`[data-request-cancel-comment="${requestCode}"]`);
    const nextStatus = String(statusSelect?.value || "new").trim();
    const cancelComment = String(cancelCommentInput?.value || "").trim();

    if (nextStatus === "cancelled" && !cancelComment) {
      window.alert("При отмене заявки нужно добавить комментарий.");
      cancelCommentInput?.focus();
      return;
    }

    updateRequestStatusViaApi(requestCode, nextStatus, cancelComment)
      .then(async () => {
        await syncRequestsFromApi();
        renderAll();
      })
      .catch((error) => {
        setApiStatus("offline");
        window.alert(error.message || "Не удалось обновить статус заявки.");
      });
    return;
  }

  const acceptRequestButton = event.target.closest("[data-request-client-accept]");
  if (acceptRequestButton) {
    const requestCode = acceptRequestButton.dataset.requestClientAccept;
    reviewRequestViaApi(requestCode, "accept")
      .then(async () => {
        await syncRequestsFromApi();
        renderAll();
      })
      .catch((error) => {
        setApiStatus("offline");
        window.alert(error.message || "Не удалось подтвердить заявку.");
      });
    return;
  }

  const reworkRequestButton = event.target.closest("[data-request-client-rework]");
  if (reworkRequestButton) {
    const requestCode = reworkRequestButton.dataset.requestClientRework;
    const commentInput = document.querySelector(`[data-request-client-rework-comment="${requestCode}"]`);
    const comment = String(commentInput?.value || "").trim();

    if (!comment) {
      window.alert("Чтобы вернуть заявку на доработку, нужен комментарий.");
      commentInput?.focus();
      return;
    }

    reviewRequestViaApi(requestCode, "rework", comment)
      .then(async () => {
        await syncRequestsFromApi();
        renderAll();
      })
      .catch((error) => {
        setApiStatus("offline");
        window.alert(error.message || "Не удалось вернуть заявку на доработку.");
      });
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
    .catch((error) => {
      setApiStatus("offline");
      window.alert(error.message || "Не удалось удалить компанию из базы данных.");
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
      .catch((error) => {
        setApiStatus("offline");
        renderCompanyClients();
        const nextMessageNode = document.getElementById("company-create-message");
        if (nextMessageNode) {
          nextMessageNode.textContent = error.message || `Не удалось сохранить компанию ${companyId} в базу данных.`;
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
    const canRecordClientPayments = formData.get("canRecordClientPayments") === "on";
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
      ? updateManagerViaApi(editingManagerId, { login, password, name, phone, email, status, canRecordClientPayments })
      : createManagerViaApi({ login, password, name, phone, email, status, canRecordClientPayments });

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
    .catch((error) => {
      setApiStatus("offline");
      window.alert(error.message || "Не удалось обновить компанию в базе данных.");
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

document.addEventListener("click", (event) => {
  const sortButton = event.target.closest("[data-client-sort]");
  if (sortButton) {
    const nextKey = sortButton.dataset.clientSort;
    if (clientDirectorySort.key !== nextKey) {
      clientDirectorySort = { key: nextKey, direction: "asc" };
    } else if (clientDirectorySort.direction === "asc") {
      clientDirectorySort = { key: nextKey, direction: "desc" };
    } else {
      clientDirectorySort = { key: "", direction: "asc" };
    }

    renderClients();
    persistNavigationState();
    return;
  }

  const openClientRowButton = event.target.closest("[data-open-client-row]");
  if (openClientRowButton) {
    selectedClientRowId = openClientRowButton.dataset.openClientRow;
    renderClients();
    persistNavigationState();
    return;
  }

  const backToClientsButton = event.target.closest("[data-back-to-clients]");
  if (backToClientsButton) {
    selectedClientRowId = null;
    renderClients();
    persistNavigationState();
    return;
  }

  const openRequestButton = event.target.closest("[data-open-request]");
  if (openRequestButton && !event.target.closest('[data-save-request-status], [data-request-status-select], [data-request-cancel-comment], [data-request-client-rework], [data-request-client-accept]')) {
    selectedRequestCode = openRequestButton.dataset.openRequest;
    renderRequestsTable();
    persistNavigationState();
    return;
  }

  const backToRequestsButton = event.target.closest("[data-back-to-requests]");
  if (backToRequestsButton) {
    selectedRequestCode = null;
    renderRequestsTable();
    persistNavigationState();
    return;
  }
});

refreshButton.addEventListener("click", async () => {
  if (canAccessView("managers")) {
    await syncManagersFromApi();
  }
  await syncRequestsFromApi();
  renderAll();
  persistNavigationState();
});

newRequestButton?.addEventListener("click", () => {
  if (isClientRole()) {
    const requestTarget = getRequestTargetUnit();
    if (!requestTarget) {
      window.alert("Для заявки нужна привязанная квартира.");
      return;
    }
    openClientRequestModal(requestTarget);
    return;
  }

  setView("requests");
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

    await syncPropertiesFromApi();
    await syncRequestsFromApi();

    if (currentUser.role !== "client") {
      await syncCompaniesFromApi();
      await syncManagersFromApi();
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
closeClientRequestModalButton?.addEventListener("click", closeClientRequestModal);
cancelClientRequestModalButton?.addEventListener("click", closeClientRequestModal);
cancelArchiveConfirmButton.addEventListener("click", closeArchiveConfirmModal);
closeAidatPaymentModalButton.addEventListener("click", closeAidatPaymentModal);
cancelAidatPaymentModalButton.addEventListener("click", closeAidatPaymentModal);
closeUnitEditModalButton?.addEventListener("click", closeUnitEditModal);
cancelUnitEditModalButton?.addEventListener("click", closeUnitEditModal);

propertyModal.addEventListener("click", (event) => {
  if (event.target === propertyModal) {
    closePropertyModal();
  }
});

clientRequestModal?.addEventListener("click", (event) => {
  if (event.target === clientRequestModal) {
    closeClientRequestModal();
  }
});

clientRequestUnitSelect?.addEventListener("change", (event) => {
  const requestTarget = getRequestTargetUnit(String(event.target.value || "").trim());
  renderClientRequestRouting(requestTarget);
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

unitEditModal?.addEventListener("click", (event) => {
  if (event.target === unitEditModal) {
    closeUnitEditModal();
  }
});

clientRequestForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedUnitCode = String(clientRequestUnitSelect?.value || "").trim();
  const requestTarget = getRequestTargetUnit(selectedUnitCode);
  if (!requestTarget) {
    clientRequestMessage.textContent = "Для заявки нужна привязанная квартира.";
    return;
  }

  const description = String(clientRequestDescriptionInput?.value || "").trim();
  if (!description) {
    clientRequestMessage.textContent = "Введите текст заявки.";
    return;
  }

  clientRequestMessage.textContent = "Отправляем заявку...";

  try {
    const attachmentUrl = await readFileAsDataUrl(clientRequestPhotoInput?.files?.[0]);
    await createRequestViaApi({
      unitCode: requestTarget.unit.code || requestTarget.unit.id,
      description,
      attachmentUrl,
    });
    await syncRequestsFromApi();
    closeClientRequestModal();
    setView("dashboard");
    renderAll();
  } catch (error) {
    setApiStatus("offline");
    clientRequestMessage.textContent = error.message || "Не удалось отправить заявку.";
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
    setApiStatus("offline");
    aidatPaymentMessage.textContent = error.message || "Не удалось добавить оплату айдата в базу данных.";
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
    propertyFormMessage.textContent = error.message || `Не удалось сохранить объект ${newProperty.title} в базу данных.`;
    return;
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

  const openUnitTarget = event.target.closest("[data-open-unit], [data-open-unit-card]");
  if (openUnitTarget) {
    selectedUnitId = openUnitTarget.dataset.openUnit || openUnitTarget.dataset.openUnitCard;
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

  const editUnitDetailsButton = event.target.closest("[data-edit-unit-details]");
  if (editUnitDetailsButton) {
    const selectedProperty = getPropertyById(selectedPropertyId);
    const unit = getUnitById(selectedProperty, editUnitDetailsButton.dataset.editUnitDetails);
    if (!selectedProperty || !unit) return;
    setOwnerDraftCount(unit, (unit.owners || []).length || 1);
    openUnitEditModal(selectedProperty, unit);
    return;
  }

  const editUnitProfileButton = event.target.closest("[data-edit-unit-profile]");
  if (editUnitProfileButton) {
    editingUnitProfileId = editUnitProfileButton.dataset.editUnitProfile;
    renderProperties();
    persistNavigationState();
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
    window.alert(error.message || "Не удалось восстановить объект в базе данных.");
    return;
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
    window.alert(error.message || "Не удалось восстановить объект в базе данных.");
    return;
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
    window.alert(error.message || "Не удалось отправить объект в архив в базе данных.");
    return;
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

propertiesGrid.addEventListener("input", (event) => {
  const phoneInput = event.target.closest("[data-owner-phone-local]");
  if (!phoneInput) return;
  phoneInput.value = normalizePhoneLocalNumber(phoneInput.value);
});

unitEditForm?.addEventListener("change", (event) => {
  const ownerCountSelect = event.target.closest("[data-unit-edit-owner-count]");
  if (!ownerCountSelect) return;
  const selectedProperty = getPropertyById(selectedPropertyId);
  const selectedUnit = getUnitById(selectedProperty, ownerCountSelect.dataset.unitEditOwnerCount || pendingUnitEditUnitId);
  if (!selectedUnit) return;
  setOwnerDraftCount(selectedUnit, ownerCountSelect.value);
  openUnitEditModal(selectedProperty, selectedUnit);
});

unitEditForm?.addEventListener("input", (event) => {
  const phoneInput = event.target.closest("[data-owner-phone-local]");
  if (!phoneInput) return;
  phoneInput.value = normalizePhoneLocalNumber(phoneInput.value);
});

unitEditForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const selectedProperty = getPropertyById(selectedPropertyId);
  const selectedUnit = getUnitById(selectedProperty, pendingUnitEditUnitId);
  if (!selectedProperty || !selectedUnit) return;

  const formData = new FormData(unitEditForm);
  const nextProfile = {
    floor: String(formData.get("floor") || "").trim() || "-",
    area: Number(formData.get("area")) || 0,
    layoutType: String(formData.get("layoutType") || "").trim(),
    layoutFeature: String(formData.get("layoutFeature") || "").trim(),
    waterAccountNumber: String(formData.get("waterAccountNumber") || "").trim(),
    electricityAccountNumber: String(formData.get("electricityAccountNumber") || "").trim(),
  };
  const ownerCount = Math.max(1, Number(formData.get("ownerCount")) || 1);
  const owners = Array.from({ length: ownerCount }, (_, index) => {
    const currentOwner = selectedUnit.owners[index];
    const name = String(formData.get(`ownerName-${index}`) || "").trim();
    const phoneCountryCode = normalizePhoneCountryCode(String(formData.get(`ownerPhoneCountry-${index}`) || "+90"));
    const phoneLocalNumber = normalizePhoneLocalNumber(String(formData.get(`ownerPhoneLocal-${index}`) || ""));
    const share = String(formData.get(`ownerShare-${index}`) || "").trim();
    return {
      clientId: currentOwner?.clientId || `OWN-${selectedUnit.id}-${index + 1}`,
      name: name || `Собственник ${index + 1}`,
      phone: formatPhone(phoneCountryCode, phoneLocalNumber),
      phoneCountryCode,
      phoneLocalNumber,
      telegramId: String(formData.get(`ownerTelegramId-${index}`) || "").trim(),
      share: share || "",
    };
  });

  unitEditMessage.textContent = "Сохраняем в базу данных...";
  try {
    await saveUnitProfileViaApi(selectedUnit.code || selectedUnit.id, nextProfile);
    await saveOwnersViaApi(selectedUnit.code || selectedUnit.id, owners);
    closeUnitEditModal();
    renderProperties();
    renderSummary();
    persistNavigationState();
  } catch (error) {
    setApiStatus("offline");
    unitEditMessage.textContent = error.message || "Не удалось сохранить помещение в базе данных.";
  }
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
      editingUnitProfileId = null;
      const profileMessage = unitProfileForm.querySelector("[data-unit-profile-message]");
      if (profileMessage) {
        profileMessage.textContent = "Параметры квартиры обновлены через API.";
      }
    } catch (error) {
      setApiStatus("offline");
      const profileMessage = unitProfileForm.querySelector("[data-unit-profile-message]");
      if (profileMessage) {
        profileMessage.textContent = error.message || "Не удалось обновить параметры квартиры в базе данных.";
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
    const phoneCountryCode = normalizePhoneCountryCode(
      String(formData.get(`ownerPhoneCountry-${index}`) || "+90")
    );
    const phoneLocalNumber = normalizePhoneLocalNumber(
      String(formData.get(`ownerPhoneLocal-${index}`) || "")
    );
    const share = String(formData.get(`ownerShare-${index}`) || "").trim();

    return {
      clientId: currentOwner?.clientId || `OWN-${selectedUnit.id}-${index + 1}`,
      name: name || `Собственник ${index + 1}`,
      phone: formatPhone(phoneCountryCode, phoneLocalNumber),
      phoneCountryCode,
      phoneLocalNumber,
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
    const ownerMessage = ownerForm.querySelector("[data-owner-message]");
    if (ownerMessage) {
      ownerMessage.textContent = error.message || "Не удалось обновить состав собственников в базе данных.";
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
    await syncPropertiesFromApi();
    await syncRequestsFromApi();

    if (currentUser.role !== "client") {
      await syncCompaniesFromApi();
      await syncManagersFromApi();
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
