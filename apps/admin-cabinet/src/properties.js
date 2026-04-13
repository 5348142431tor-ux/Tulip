export function renderPropertiesListView({
  isClientRole,
  isProjectOwner,
  activeProperties,
  archivedProperties,
  formatBalancesSummary,
  aggregateBalances,
  getPropertyAidatBalances,
  getPropertyUtilityBalances,
  debtBreakdownMarkup,
}) {
  return {
    breadcrumbs: isClientRole
      ? ""
      : `
        <span class="filter-chip is-active">Все объекты</span>
        <span class="filter-chip">${activeProperties.length} активных домов</span>
      `,
    overview: isClientRole
      ? `
        <article class="card">
          <div class="card-head">
            <h4>Мои квартиры</h4>
            <span>${activeProperties.length} объект(а)</span>
          </div>
        </article>
        `
      : `
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
          isProjectOwner
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
      `,
    gridClassName: "entity-grid",
    gridMarkup: activeProperties.length
      ? activeProperties
          .map(
            (property) => `
              <article class="entity-card interactive-card property-card-shell" data-open-property-card="${property.id}" onclick="window.__openTulipProperty('${property.id}')" data-ui-id="card-property-${property.code}">
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
                  <button type="button" class="primary-button inline-button" data-open-property="${property.id}" onclick="window.__openTulipProperty('${property.id}'); return false;" data-ui-id="btn-open-property-${property.code}">
                    Открыть объект
                  </button>
                  ${
                    isProjectOwner
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
      : '<div class="empty-state">Объекты по текущему поиску не найдены.</div>',
  };
}

export function renderPropertyDetailView({
  selectedProperty,
  filteredUnits,
  formatBalancesSummary,
  getPropertyAidatBalances,
  getPropertyUtilityBalances,
  canManageProperty,
  renderPropertyFinanceEditor,
  isPropertyReportVisible,
  renderPropertyYearReport,
  selectedPropertyReportYear,
  unitOwnerSummary,
  debtBreakdownMarkup,
  getUnitAidatBalances,
  getUnitUtilityBalances,
}) {
  return {
    breadcrumbs: `
      <button class="filter-chip" data-back-to-properties="true">Все объекты</button>
      <span class="filter-chip is-active">${selectedProperty.title}</span>
    `,
    overview: `
      <article class="card" data-ui-id="card-property-detail-${selectedProperty.code}">
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
      ${canManageProperty ? renderPropertyFinanceEditor(selectedProperty) : ""}
      ${canManageProperty && isPropertyReportVisible ? renderPropertyYearReport(selectedProperty, filteredUnits, selectedPropertyReportYear) : ""}
    `,
    gridClassName: "unit-grid",
    gridMarkup: filteredUnits.length
      ? filteredUnits
          .map(
            (unit) => `
              <article class="entity-card interactive-card unit-card-shell" data-open-unit-card="${unit.code}" onclick="window.__openTulipUnit('${unit.code}')" data-ui-id="card-unit-${selectedProperty.code}-${unit.number}">
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
                <button type="button" class="primary-button inline-button" data-open-unit="${unit.code}" onclick="window.__openTulipUnit('${unit.code}'); return false;" data-ui-id="btn-open-unit-${selectedProperty.code}-${unit.number}">
                  Открыть помещение
                </button>
              </article>
            `
          )
          .join("")
      : '<div class="empty-state">Помещения по текущему поиску не найдены.</div>',
  };
}

export function renderUnitDetailView({
  selectedProperty,
  selectedUnit,
  formatBalancesSummary,
  getUnitAidatBalances,
  getUnitUtilityBalances,
  buildUnitDetailMarkup,
}) {
  return {
    breadcrumbs: `
      <button class="filter-chip" data-back-to-properties="true">Все объекты</button>
      <button class="filter-chip" data-back-to-units="true">${selectedProperty.title}</button>
      <span class="filter-chip is-active">Помещение ${selectedUnit.number}</span>
    `,
    overview: `
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
    `,
    gridClassName: "unit-detail-stack",
    gridMarkup: buildUnitDetailMarkup(selectedUnit, selectedProperty),
  };
}
