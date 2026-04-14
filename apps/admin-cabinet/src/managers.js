function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderManagersView({
  managers,
  canManageManagers,
  currentUser,
  editingManagerId,
  managerFormFeedback,
  companyAdminProfileFeedback,
}) {
  const editingManager = editingManagerId
    ? managers.find((item) => item.id === editingManagerId) || null
    : null;

  const companyAdminProfileCard = currentUser?.role === "company_admin"
    ? `
      <article class="card manager-panel-card" data-ui-id="card-company-admin-profile">
        <div class="card-head">
          <h4>Профиль руководителя</h4>
          <span>${escapeHtml(currentUser?.company?.name || "Компания")}</span>
        </div>
        <form class="form-grid" data-company-admin-profile-form>
          <label class="field">
            <span>ФИО руководителя</span>
            <input name="name" type="text" value="${escapeHtml(currentUser?.name || "")}" required />
          </label>
          <label class="field">
            <span>Логин</span>
            <input type="text" value="${escapeHtml(currentUser?.login || currentUser?.id || "")}" disabled />
          </label>
          <div class="modal-actions field-full manager-form-actions">
            <div class="form-message">${escapeHtml(companyAdminProfileFeedback || "")}</div>
            <button type="submit" class="primary-button">Сохранить профиль</button>
          </div>
        </form>
      </article>
    `
    : "";

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
            <input name="name" type="text" placeholder="Введите имя" value="${escapeHtml(editingManager?.name || "")}" required />
          </label>
          <label class="field">
            <span>Логин</span>
            <input name="login" type="text" placeholder="manager.login" value="${escapeHtml(editingManager?.login || "")}" required />
          </label>
          <label class="field">
            <span>Пароль</span>
            <input name="password" type="text" placeholder="${editingManagerId ? "Оставьте пустым, чтобы не менять" : "Введите пароль"}" ${editingManagerId ? "" : "required"} />
          </label>
          <label class="field">
            <span>Телефон</span>
            <input name="phone" type="text" placeholder="+90 555 ..." value="${escapeHtml(editingManager?.phone || "")}" />
          </label>
          <label class="field field-full manager-permission-field">
            <span>Право на оплаты</span>
            <label class="manager-permission-toggle">
              <input name="canRecordClientPayments" type="checkbox" ${editingManager?.canRecordClientPayments ? "checked" : ""} />
              <strong>Может вносить оплаты клиентов</strong>
            </label>
          </label>
          <label class="field">
            <span>Статус</span>
            <select name="status">
              <option value="active" ${(editingManager?.status || "active") === "active" ? "selected" : ""}>Активен</option>
              <option value="inactive" ${(editingManager?.status || "active") === "inactive" ? "selected" : ""}>Неактивен</option>
            </select>
          </label>
          <div class="modal-actions field-full manager-form-actions">
            <div id="manager-form-message" class="form-message">${escapeHtml(managerFormFeedback || "")}</div>
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
              <strong>${escapeHtml(member.name)}</strong>
              <p>Менеджер компании${member.phone ? ` • ${escapeHtml(member.phone)}` : ""}</p>
              <div class="entity-meta">
                <span>Логин: ${escapeHtml(member.login || member.id)}</span>
                <span>Пароль: скрыт</span>
              </div>
              <div class="entity-meta">
                <span>${member.status === "active" ? "Активен" : "Неактивен"}</span>
                <span>${member.openRequests || 0} открытых заявок</span>
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

  return `${companyAdminProfileCard}${managerForm}${managerCards}`;
}
