export function renderClientsListView({ filteredRows, getClientDirectorySortIcon }) {
  return `
    <article class="card clients-directory-card" data-ui-id="card-clients-directory">
      <div class="card-head">
        <h4>Клиенты по объектам</h4>
        <span>${filteredRows.length} строк</span>
      </div>
      <div class="table-wrap">
        <table class="clients-directory-table">
          <thead>
            <tr>
              <th><button type="button" class="table-sort-button" data-client-sort="complex">Комплекс <span>${getClientDirectorySortIcon("complex")}</span></button></th>
              <th><button type="button" class="table-sort-button" data-client-sort="unit">Квартира <span>${getClientDirectorySortIcon("unit")}</span></button></th>
              <th><button type="button" class="table-sort-button" data-client-sort="owner">Собственник <span>${getClientDirectorySortIcon("owner")}</span></button></th>
              <th><button type="button" class="table-sort-button" data-client-sort="aidat">Айдат <span>${getClientDirectorySortIcon("aidat")}</span></button></th>
            </tr>
          </thead>
          <tbody>
            ${filteredRows.length
              ? filteredRows
                  .map(
                    (row) => `
                      <tr data-ui-id="row-client-directory-${row.id}" data-open-client-row="${row.id}">
                        <td>${row.complex}</td>
                        <td>${row.unitNumber}</td>
                        <td>${row.ownerDisplay}</td>
                        <td><span class="client-aidat client-aidat-${row.aidatVariant}">${row.aidatText}</span></td>
                      </tr>
                    `
                  )
                  .join("")
              : '<tr><td colspan="4"><div class="empty-state">По текущим фильтрам клиенты не найдены.</div></td></tr>'}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

export function renderClientDetailView({ row, unit, owner }) {
  return `
    <article class="card client-detail-card" data-ui-id="card-client-detail-${row.id}">
      <div class="card-head">
        <div>
          <h4>${row.ownerDisplay === "—" ? `Квартира ${row.unitNumber}` : row.ownerDisplay}</h4>
          <span>${row.complex} • кв. ${row.unitNumber}</span>
        </div>
        <button type="button" class="ghost-button inline-button" data-back-to-clients="true">Назад к списку</button>
      </div>
      <div class="properties-summary">
        <div class="summary-mini"><span>Комплекс</span><strong>${row.complex}</strong></div>
        <div class="summary-mini"><span>Квартира</span><strong>${row.unitNumber}</strong></div>
        <div class="summary-mini"><span>Айдат</span><strong>${row.aidatText}</strong></div>
        <div class="summary-mini"><span>Площадь</span><strong>${unit?.area || 0} m2</strong></div>
      </div>
      <article class="card">
        <div class="card-head"><h4>Контакты</h4><span>${owner ? "Собственник" : "Помещение без собственника"}</span></div>
        <div class="entity-meta">
          <span>ФИО ${row.ownerDisplay}</span>
          <span>Телефон ${row.phone || owner?.phone || "не указан"}</span>
          <span>Telegram ID ${row.telegramId || owner?.telegramId || "не указан"}</span>
          <span>Доля ${owner?.share || "не указана"}</span>
        </div>
      </article>
    </article>
  `;
}
