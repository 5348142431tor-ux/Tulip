export function normalizeCompanyRecord(company = {}, index = 0) {
  return {
    id: company.id || `MC-${String(index + 1).padStart(3, "0")}`,
    companyId: company.companyId || company.id || `company-${index + 1}`,
    title: company.title || `Компания ${index + 1}`,
    directorName: company.directorName || "",
    telegramId: company.telegramId || "",
    telegramUsername: company.telegramUsername || "",
    telegramLoginMode: company.telegramLoginMode || "telegram_password",
    tempPassword: company.tempPassword || "",
    mustChangePassword:
      company.mustChangePassword === undefined ? true : Boolean(company.mustChangePassword),
    status: company.status || "invited",
    createdAt: company.createdAt || new Date().toISOString(),
  };
}

export function generateTemporaryCompanyPassword() {
  return `Tulip-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.random()
    .toString(10)
    .slice(2, 6)}`;
}

export function upsertCompanyState(companies, company, index = 0) {
  const normalized = normalizeCompanyRecord(company, index);
  const existingIndex = companies.findIndex(
    (item) => item.companyId === normalized.companyId
  );

  if (existingIndex >= 0) {
    return companies.map((item, itemIndex) =>
      itemIndex === existingIndex ? { ...item, ...normalized } : item
    );
  }

  return [normalized, ...companies];
}

export function removeCompanyState(companies, companyId) {
  return companies.filter((company) => company.companyId !== companyId);
}

export function renderAdminPanelView({ isProjectOwner }) {
  return isProjectOwner
    ? `
      <article class="entity-card" data-ui-id="card-admin-panel-companies">
        <p class="eyebrow">System section</p>
        <strong>Компании</strong>
        <p>Реестр компаний как отдельных контуров данных, их Telegram-привязок и руководителей компании.</p>
        <div class="entity-meta">
          <span>Только для создателя</span>
          <span>Компания идет сразу после создателя</span>
        </div>
        <button class="primary-button" data-open-admin-route="company-clients" data-ui-id="btn-open-company-clients">
          Открыть компании
        </button>
      </article>
    `
    : '<div class="empty-state">Этот раздел доступен только создателю платформы.</div>';
}

export function renderCompanyClientsView({
  isProjectOwner,
  companies,
  editingCompanyId,
  formatDateTime,
}) {
  if (!isProjectOwner) {
    return '<div class="empty-state">Этот раздел доступен только создателю платформы.</div>';
  }

  return `
    <article class="card" data-ui-id="card-company-create">
      <div class="card-head">
        <h4>Добавить компанию</h4>
        <span>Platform registry</span>
      </div>
      <form id="company-create-form" class="form-grid" data-ui-id="form-company-create">
        <label class="field" data-ui-id="field-company-id">
          <span>ID компании</span>
          <input name="companyId" type="text" placeholder="Например, MC-001" required />
        </label>
        <label class="field" data-ui-id="field-company-title">
          <span>Название компании</span>
          <input name="title" type="text" placeholder="Например, Tulip Antalya" required />
        </label>
        <label class="field" data-ui-id="field-company-director-name">
          <span>Имя директора</span>
          <input name="directorName" type="text" placeholder="Например, Ahmet Yilmaz" />
        </label>
        <label class="field" data-ui-id="field-company-telegram-id">
          <span>Telegram ID компании</span>
          <input name="telegramId" type="text" placeholder="Например, 254348031" />
        </label>
        <label class="field" data-ui-id="field-company-telegram-username">
          <span>Telegram username</span>
          <input name="telegramUsername" type="text" placeholder="@company_login" />
        </label>
        <div class="modal-actions field-full" data-ui-id="actions-company-create">
          <div id="company-create-message" class="form-message" data-ui-id="message-company-create"></div>
          <button type="submit" class="primary-button" data-ui-id="btn-create-company">
            Зарегистрировать компанию
          </button>
        </div>
      </form>
      <p class="muted-note">Компания входит через Telegram по кнопке и временный пароль. После первого входа пароль нужно сменить. Первый пользователь компании получает роль руководителя компании.</p>
    </article>
    ${
      companies.length
        ? companies
            .map(
              (company) =>
                editingCompanyId === company.companyId
                  ? `
                    <article class="card" data-ui-id="card-company-edit-${company.companyId}">
                      <div class="card-head">
                        <h4>Редактировать компанию</h4>
                        <span>${company.companyId}</span>
                      </div>
                      <form class="form-grid" data-company-edit-form="${company.companyId}">
                        <label class="field">
                          <span>Название компании</span>
                          <input name="title" type="text" value="${company.title}" required />
                        </label>
                        <label class="field">
                          <span>Имя директора</span>
                          <input name="directorName" type="text" value="${company.directorName || ""}" />
                        </label>
                        <label class="field">
                          <span>Статус</span>
                          <select name="status">
                            <option value="active" ${company.status === "active" ? "selected" : ""}>active</option>
                            <option value="invited" ${company.status === "invited" ? "selected" : ""}>invited</option>
                            <option value="blocked" ${company.status === "blocked" ? "selected" : ""}>blocked</option>
                          </select>
                        </label>
                        <label class="field">
                          <span>Telegram ID</span>
                          <input name="telegramId" type="text" value="${company.telegramId || ""}" />
                        </label>
                        <label class="field">
                          <span>Telegram username</span>
                          <input name="telegramUsername" type="text" value="${company.telegramUsername || ""}" />
                        </label>
                        <div class="modal-actions field-full">
                          <div class="entity-meta">
                            <span>Временный пароль: ${company.tempPassword}</span>
                            <span>${company.mustChangePassword ? "Нужно сменить пароль" : "Пароль подтвержден"}</span>
                          </div>
                          <button type="button" class="ghost-button" data-company-edit-cancel="${company.companyId}">Отмена</button>
                          <button type="submit" class="primary-button">Сохранить</button>
                        </div>
                      </form>
                    </article>
                  `
                  : `
                    <article class="entity-card" data-ui-id="card-company-${company.companyId}">
                      <p class="eyebrow">${company.companyId}</p>
                      <strong>${company.title}</strong>
                      <p>Компания как отдельный контур данных. Вход: Telegram по кнопке + пароль.</p>
                      <div class="entity-meta">
                        <span>Директор: ${company.directorName || "не указан"}</span>
                        <span>Статус: ${company.status}</span>
                      </div>
                      <div class="entity-meta">
                        <span>Telegram ID: ${company.telegramId || "не указан"}</span>
                        <span>${company.telegramUsername || "username не указан"}</span>
                      </div>
                      <div class="entity-meta">
                        <span>Временный пароль: ${company.tempPassword}</span>
                        <span>${company.mustChangePassword ? "Нужно сменить пароль" : "Пароль подтвержден"}</span>
                      </div>
                      <div class="entity-meta">
                        <span>Создано: ${formatDateTime(company.createdAt)}</span>
                        <span>Уровень: после создателя платформы</span>
                      </div>
                      <div class="modal-actions company-card-actions">
                        <button type="button" class="ghost-button" data-company-edit="${company.companyId}">
                          Редактировать
                        </button>
                        <button type="button" class="ghost-button" data-company-delete="${company.companyId}">
                          Удалить
                        </button>
                      </div>
                    </article>
                  `
            )
            .join("")
        : `
          <article class="card" data-ui-id="card-company-clients-empty">
            <div class="card-head">
              <h4>Компании</h4>
              <span>Platform registry</span>
            </div>
            <p>Пока нет зарегистрированных компаний. Добавьте первую компанию по ID.</p>
          </article>
        `
    }
    <article class="card" data-ui-id="card-company-clients-back">
      <button class="ghost-button" data-open-admin-route="admin-panel" data-ui-id="btn-back-admin-panel">
        Назад в админ панель
      </button>
    </article>
  `;
}
