function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderClientDashboardView({
  clientPrimaryUnit,
  clientRecordName,
  clientPhone,
  clientOwnerSummary,
  scopedRequests,
  getRequestPreviewText,
  getRequestStatusLabel,
  formatDateTime,
  propertyAidatSummary,
  unitAidatSummary,
}) {
  return {
    focusCard: clientPrimaryUnit
      ? `<p class="eyebrow">Мое помещение</p><h3>${clientPrimaryUnit.property.title}, квартира ${clientPrimaryUnit.unit.number}</h3><p>${clientRecordName || "Клиент"} видит только свои данные.</p>`
      : `<p class="eyebrow">Мое помещение</p><h3>Квартира пока не привязана</h3><p>Для этого клиента пока нет активной квартиры.</p>`,
    requestStatusGrid: clientPrimaryUnit
      ? [
          { label: "Дом: айдат", value: propertyAidatSummary },
          { label: "Мой айдат", value: unitAidatSummary },
          { label: "Коммунальные", value: "В разработке" },
          { label: "Мои заявки", value: scopedRequests.filter((request) => request.status !== "done").length },
        ]
          .map(
            (item, index) =>
              `<article class="metric-tile" data-ui-id="metric-client-${index + 1}"><span>${item.label}</span><strong>${item.value}</strong></article>`
          )
          .join("")
      : '<div class="empty-state">Нет привязанной квартиры.</div>',
    priorityRequests: scopedRequests.length
      ? scopedRequests
          .map(
            (request) =>
              `<article class="ticket-card" data-ui-id="card-client-request-${request.code}"><strong>Заявка №${request.requestNumber || "—"}</strong><p>${getRequestPreviewText(request)}</p><div class="entity-meta"><span>${getRequestStatusLabel(request.status)}</span><span>${formatDateTime(request.createdAt)}</span></div></article>`
          )
          .join("")
      : '<div class="empty-state">По вашей квартире заявок пока нет.</div>',
    paymentHealth: clientPrimaryUnit
      ? `<div class="stack-item"><span>Айдат</span><strong>${unitAidatSummary}</strong></div>`
      : '<div class="empty-state">Нет данных по платежам.</div>',
    staffLoad: clientPrimaryUnit
      ? `<div class="load-row"><div><strong>${clientOwnerSummary}</strong><p>Собственник</p></div><div><p>${clientPhone || "Телефон не указан"}</p></div></div>`
      : '<div class="empty-state">Нет данных по собственнику.</div>',
  };
}

export function renderStaffDashboardView({
  role,
  visiblePropertiesCount,
  requestBuckets,
  requestItems,
  paymentItems,
  visibleManagers,
  getRequestStatusLabel,
  getRequestResidentLabel,
  companyProfile,
  companyProfileFeedback,
  currentCompanyName,
}) {
  const focusCard = role === "company_admin"
    ? `<p class="eyebrow">Компания</p><h3>${escapeHtml(companyProfile?.title || currentCompanyName || "Компания")}</h3><p>Руководитель может менять название компании и имя руководителя. Изменения сохраняются сразу в БД.</p><form class="form-grid company-profile-form" data-company-profile-form><label><span>Название компании</span><input name="title" type="text" value="${escapeHtml(companyProfile?.title || "")}" required /></label><label><span>Имя руководителя</span><input name="directorName" type="text" value="${escapeHtml(companyProfile?.directorName || "")}" placeholder="Например, Ahmet Yilmaz" /></label><div class="manager-form-actions company-profile-actions"><div class="form-message">${escapeHtml(companyProfileFeedback || "")}</div><button type="submit" class="primary-button">Сохранить</button></div></form>`
    : `<p class="eyebrow">Главное</p><h3>${visiblePropertiesCount} домов в контуре текущего кабинета.</h3><p>Экран уже берет данные из БД по текущей роли.</p>`;

  return {
    focusCard,
    requestStatusGrid: Object.entries(requestBuckets)
      .map(
        ([status, count]) =>
          `<article class="metric-tile"><span>${getRequestStatusLabel(status)}</span><strong>${count}</strong></article>`
      )
      .join(""),
    priorityRequests: requestItems.length
      ? requestItems
          .slice(0, 5)
          .map(
            (request) =>
              `<article class="ticket-card"><strong>Заявка №${request.requestNumber || "—"}</strong><p>${request.property || "Комплекс не указан"} • ${getRequestResidentLabel(request)}</p><div class="entity-meta"><span>${getRequestStatusLabel(request.status)}</span><span>${request.assignee || "Не назначен"}</span></div></article>`
          )
          .join("")
      : '<div class="empty-state">Заявок пока нет.</div>',
    paymentHealth: paymentItems.length
      ? paymentItems
          .slice(0, 5)
          .map(
            (payment) =>
              `<div class="stack-item"><span>${payment.propertyTitle} • кв. ${payment.unitNumber}</span><strong>${payment.amountText}</strong></div>`
          )
          .join("")
      : '<div class="empty-state">Платежей пока нет.</div>',
    staffLoad: visibleManagers.length
      ? visibleManagers
          .map(
            (member) =>
              `<div class="load-row"><div><strong>${member.name}</strong><p>${member.roleLabel}</p></div><div><p>${member.openRequests || 0} открытых</p></div></div>`
          )
          .join("")
      : '<div class="empty-state">Менеджеров пока нет.</div>',
  };
}
