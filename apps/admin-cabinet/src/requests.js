export function renderRequestStatusControlView({ request, canManageRequestStatus, statusBadge }) {
  const cancelCommentRequired = request.status === "cancelled";

  if (canManageRequestStatus) {
    if (request.clientDecisionPending) {
      return `
        <div class="request-status-stack">
          ${statusBadge("done")}
          <div class="muted-note">Ждем согласования клиентом.</div>
        </div>
      `;
    }

    return `
      <div class="request-status-stack">
        <select data-request-status-select="${request.code}">
          <option value="new" ${request.status === "new" ? "selected" : ""}>Новый</option>
          <option value="in_progress" ${request.status === "in_progress" ? "selected" : ""}>Принято в работу</option>
          <option value="done" ${request.status === "done" ? "selected" : ""}>Выполнено</option>
          <option value="cancelled" ${request.status === "cancelled" ? "selected" : ""}>Отменено</option>
        </select>
        <textarea
          data-request-cancel-comment="${request.code}"
          rows="2"
          placeholder="Комментарий при отмене обязателен"
          ${cancelCommentRequired ? "" : 'data-hidden-comment="true"'}
        >${request.cancelComment || ""}</textarea>
        <button type="button" class="ghost-button inline-button" data-save-request-status="${request.code}">Сохранить</button>
      </div>
    `;
  }

  if (request.clientDecisionPending) {
    return `
      <div class="request-status-stack">
        ${statusBadge(request.status)}
        <div class="muted-note">Менеджер отметил заявку как выполненную. Подтвердите результат или верните на доработку.</div>
        <textarea data-request-client-rework-comment="${request.code}" rows="2" placeholder="Комментарий обязателен, если нужно доделать"></textarea>
        <div class="request-client-actions">
          <button type="button" class="ghost-button inline-button" data-request-client-rework="${request.code}">Доделать</button>
          <button type="button" class="primary-button inline-button" data-request-client-accept="${request.code}">Принять</button>
        </div>
      </div>
    `;
  }

  return statusBadge(request.status);
}

export function renderRequestsListView({ filtered, canManageRequestStatus, getRequestResidentLabel, getRequestPreviewText, renderRequestStatusControl }) {
  return filtered.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Номер заявки</th>
              <th>Комплекс</th>
              <th>Квартира</th>
              <th>ФИО</th>
              <th>Краткое описание</th>
              <th>Статус</th>
              <th>Исполнитель</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map(
                (request) => `
                  <tr data-ui-id="row-request-${request.id}" data-open-request="${request.code}">
                    <td><strong>№${request.requestNumber || "—"}</strong></td>
                    <td><strong>${request.property || "Комплекс не указан"}</strong><div class="table-meta">${request.propertyCode || ""}</div></td>
                    <td><strong>${request.unitNumber || "—"}</strong><div class="table-meta">${request.unitCode || ""}</div></td>
                    <td>${getRequestResidentLabel(request)}</td>
                    <td>
                      <strong>Заявка №${request.requestNumber || "—"}</strong>
                      <div class="table-meta">${request.title || "Заявка клиента"}</div>
                      <div class="table-meta">${request.createdAt || ""}</div>
                      <div class="table-meta">${getRequestPreviewText(request)}</div>
                    </td>
                    <td>${renderRequestStatusControl(request, canManageRequestStatus)}</td>
                    <td>${request.assignee || "Не назначен"}</td>
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

export function renderRequestDetailView({ request, canManageRequestStatus, getRequestResidentLabel, renderRequestStatusControl, renderRequestStatusHistory, getRequestStatusLabel }) {
  return `
    <article class="card request-detail-card" data-ui-id="card-request-detail-${request.code}">
      <div class="card-head">
        <div>
          <h4>Заявка №${request.requestNumber || "—"}</h4>
          <span>${request.title || "Заявка клиента"}</span>
        </div>
        <button type="button" class="ghost-button inline-button" data-back-to-requests="true">Назад к списку</button>
      </div>
      <div class="properties-summary">
        <div class="summary-mini"><span>Комплекс</span><strong>${request.property || "—"}</strong></div>
        <div class="summary-mini"><span>Квартира</span><strong>${request.unitNumber || "—"}</strong></div>
        <div class="summary-mini"><span>ФИО</span><strong>${getRequestResidentLabel(request)}</strong></div>
        <div class="summary-mini"><span>Исполнитель</span><strong>${request.assignee || "Не назначен"}</strong></div>
      </div>
      <div class="finance-log-entry">
        <strong>Описание</strong>
        <p>${request.description || "Описание не указано"}</p>
        ${request.attachmentUrl ? `<p><a href="${request.attachmentUrl}" target="_blank" rel="noreferrer">Открыть фото</a></p>` : ""}
        ${request.cancelComment ? `<p class="muted-note">Комментарий при отмене: ${request.cancelComment}</p>` : ""}
      </div>
      ${request.reworkComments.length ? `
        <article class="card">
          <div class="card-head"><h4>Комментарии на доделать</h4><span>${request.reworkComments.length}</span></div>
          <div class="property-finance-log-list">
            ${request.reworkComments.map((item) => `<div class="finance-log-entry"><strong>Комментарий №${item.number}</strong><p>${item.comment}</p></div>`).join("")}
          </div>
        </article>
      ` : ""}
      <article class="card">
        <div class="card-head"><h4>Статус</h4><span>${getRequestStatusLabel(request.status)}</span></div>
        ${renderRequestStatusControl(request, canManageRequestStatus)}
        ${renderRequestStatusHistory(request)}
      </article>
    </article>
  `;
}
