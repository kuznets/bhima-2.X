angular.module('bhima.services')
  .service('PatientInvoiceService', PatientInvoiceService);

PatientInvoiceService.$inject = [
  '$uibModal', 'SessionService', 'PrototypeApiService', 'FilterService', 'appcache',
  'PeriodService', '$httpParamSerializer', 'LanguageService', 'bhConstants',
  'TransactionService',
];

/**
 * @module
 * Patient Invoice Service
 *
 * @description
 * This service wraps the /invoices URL and all CRUD on the underlying tables
 * takes place through this service.
 */
function PatientInvoiceService(
  Modal, Session, Api, Filters, AppCache, Periods, $httpParamSerializer,
  Languages, bhConstants, Transactions
) {
  var service = new Api('/invoices/');

  var invoiceFilters = new Filters();
  var filterCache = new AppCache('cash-filters');

  service.create = create;
  service.openSearchModal = openSearchModal;
  service.openCreditNoteModal = openCreditNoteModal;
  service.balance = balance;
  service.filters = invoiceFilters;
  service.remove = Transactions.remove;

  /**
   * @method create
   *
   * @description
   * This method formats and submits an invoice to the server from the PatientInvoiceController
   *
   * @returns {Promise} - a promise resolving to the HTTP result.
   */
  function create(invoice, invoiceItems, invoicingFees, subsidies, description) {
    var cp = angular.copy(invoice);

    // add project id from session
    cp.project_id = Session.project.id;

    // a patient invoice is not required to qualify for invoicing fees or subsidies
    // default to empty arrays
    invoicingFees = invoicingFees || [];
    subsidies = subsidies || [];

    // concatenate into a single object to send back to the client
    cp.items = invoiceItems.map(filterInventorySource);

    cp.invoicingFees = invoicingFees.map(function (invoicingFee) {
      return invoicingFee.invoicing_fee_id;
    });

    cp.subsidies = subsidies.map(function (subsidy) {
      return subsidy.subsidy_id;
    });

    cp.description = description;

    return Api.create.call(this, { invoice : cp });
  }

  /**
   * @method balance
   *
   * @description
   * This method returns the balance on an invoice due to a debtor.
   *
   * @param {String} uuid - the invoice uuid
   * @param {String} debtorUuid - the amount due to the debtor
   */
  function balance(uuid) {
    var url = '/invoices/'.concat(uuid, '/balance');
    return this.$http.get(url)
      .then(this.util.unwrapHttpResponse);
  }

  // utility methods

  // remove the source items from invoice items - if they exist
  function filterInventorySource(item) {
    delete item.code;
    delete item.description;
    delete item._valid;
    delete item._invalid;
    delete item._initialised;
    delete item._hasPriceList;
    return item;
  }

  // open a dialog box to help user filtering invoices
  function openSearchModal(filters) {
    return Modal.open({
      templateUrl : 'modules/invoices/registry/search.modal.html',
      size : 'md',
      animation : false,
      keyboard  : false,
      backdrop : 'static',
      controller : 'InvoiceRegistrySearchModalController as $ctrl',
      resolve : {
        filters : function filtersProvider() { return filters; },
      },
    }).result;
  }

  // open a dialog box to Cancel Credit Note
  function openCreditNoteModal(invoice) {
    return Modal.open({
      templateUrl : 'modules/invoices/registry/modalCreditNote.html',
      resolve : { data : { invoice : invoice } },
      size : 'md',
      animation : true,
      keyboard  : false,
      backdrop : 'static',
      controller : 'ModalCreditNoteController as ModalCtrl',
    }, true).result;
  }

  invoiceFilters.registerDefaultFilters(bhConstants.defaultFilters);

  invoiceFilters.registerCustomFilters([
    { key : 'service_id', label : 'FORM.LABELS.SERVICE' },
    { key : 'user_id', label : 'FORM.LABELS.USER' },
    { key : 'reference', label : 'FORM.LABELS.REFERENCE' },
    { key : 'debtor_uuid', label : 'FORM.LABELS.CLIENT' },
    { key : 'patientReference', label : 'FORM.LABELS.REFERENCE_PATIENT' },
    { key : 'inventory_uuid', label : 'FORM.LABELS.INVENTORY' },
    { key : 'billingDateFrom', label : 'FORM.LABELS.DATE', comparitor : '>', valueFilter : 'date' },
    { key : 'billingDateTo', label : 'FORM.LABELS.DATE', comparitor : '<', valueFilter : 'date' },
    { key : 'reversed', label : 'FORM.INFO.CREDIT_NOTE' },
    { key : 'defaultPeriod', label : 'TABLE.COLUMNS.PERIOD', valueFilter : 'translate' },
    { key : 'debtor_group_uuid', label : 'FORM.LABELS.DEBTOR_GROUP' },
    { key : 'cash_uuid', label : 'FORM.INFO.PAYMENT' },
  ]);

  if (filterCache.filters) {
    // load cached filter definition if it exists
    invoiceFilters.loadCache(filterCache.filters);
  }

  // once the cache has been loaded - ensure that default filters are provided appropriate values
  assignDefaultFilters();

  function assignDefaultFilters() {
    // get the keys of filters already assigned - on initial load this will be empty
    var assignedKeys = Object.keys(invoiceFilters.formatHTTP());

    // assign default period filter
    var periodDefined =
      service.util.arrayIncludes(assignedKeys, ['period', 'custom_period_start', 'custom_period_end']);

    if (!periodDefined) {
      invoiceFilters.assignFilters(Periods.defaultFilters());
    }

    // assign default limit filter
    if (assignedKeys.indexOf('limit') === -1) {
      invoiceFilters.assignFilter('limit', 100);
    }
  }

  service.removeFilter = function removeFilter(key) {
    invoiceFilters.resetFilterState(key);
  };

  // load filters from cache
  service.cacheFilters = function cacheFilters() {
    filterCache.filters = invoiceFilters.formatCache();
  };

  service.loadCachedFilters = function loadCachedFilters() {
    invoiceFilters.loadCache(filterCache.filters || {});
  };

  // downloads a type of report based on the
  service.download = function download(type) {
    var filterOpts = invoiceFilters.formatHTTP();
    var defaultOpts = { renderer : type, lang : Languages.key };

    // combine options
    var options = angular.merge(defaultOpts, filterOpts);

    // return  serialized options
    return $httpParamSerializer(options);
  };

  return service;
}
