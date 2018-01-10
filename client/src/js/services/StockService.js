angular.module('bhima.services')
  .service('StockService', StockService);

StockService.$inject = [
  'PrototypeApiService', 'FilterService', 'appcache', 'PeriodService',
  '$httpParamSerializer', 'LanguageService', 'bhConstants',
];

function StockService(Api, Filters, AppCache, Periods, $httpParamSerializer, Languages, bhConstants) {
  // API for stock lots
  var stocks = new Api('/stock/lots');

  // API for stock lots in depots
  var lots = new Api('/stock/lots/depots');

  // API for stock lots movements
  var movements = new Api('/stock/lots/movements');

  // API for stock inventory in depots
  var inventories = new Api('/stock/inventories/depots');

  // API for stock integration
  var integration = new Api('/stock/integration');

  // API for stock transfer
  var transfers = new Api('/stock/transfers');

  // Filter service
  var StockLotFilters = new Filters();
  var StockMovementFilters = new Filters();
  var StockInventoryFilters = new Filters();

  var filterMovementCache = new AppCache('stock-movement-filters');
  var filterLotCache = new AppCache('stock-lot-filters');
  var filterInventoryCache = new AppCache('stock-inventory-filters');

  StockLotFilters.registerDefaultFilters(bhConstants.defaultFilters);
  StockMovementFilters.registerDefaultFilters(bhConstants.defaultFilters);
  StockInventoryFilters.registerDefaultFilters(bhConstants.defaultFilters);

  StockLotFilters.registerCustomFilters([
    { key : 'depot_uuid', label : 'STOCK.DEPOT' },
    { key : 'inventory_uuid', label : 'STOCK.INVENTORY' },
    { key : 'label', label : 'STOCK.LOT' },
    { key : 'entry_date_from', label : 'STOCK.ENTRY_DATE', comparitor : '>', valueFilter : 'date' },
    { key : 'entry_date_to', label : 'STOCK.ENTRY_DATE', comparitor : '<', valueFilter : 'date' },
    { key : 'expiration_date_from', label : 'STOCK.EXPIRATION_DATE', comparitor : '>', valueFilter : 'date' },
    { key : 'expiration_date_to', label : 'STOCK.EXPIRATION_DATE', comparitor : '<', valueFilter : 'date' },
  ]);

  StockMovementFilters.registerCustomFilters([
    { key : 'is_exit', label : 'STOCK.OUTPUT' },
    { key : 'depot_uuid', label : 'STOCK.DEPOT' },
    { key : 'inventory_uuid', label : 'STOCK.INVENTORY' },
    { key : 'label', label : 'STOCK.LOT' },
    { key : 'flux_id', label : 'STOCK.FLUX' },
    { key : 'dateFrom', label : 'FORM.LABELS.DATE', comparitor : '>', valueFilter : 'date' },
    { key : 'dateTo', label : 'FORM.LABELS.DATE', comparitor : '<', valueFilter : 'date' },
    { key : 'user_id', label : 'FORM.LABELS.USER' },
  ]);

  StockInventoryFilters.registerCustomFilters([
    { key : 'depot_uuid', label : 'STOCK.DEPOT' },
    { key : 'inventory_uuid', label : 'STOCK.INVENTORY' },
    { key : 'status', label : 'STOCK.STATUS.LABEL', valueFilter : 'translate' },
    { key : 'require_po', label : 'STOCK.REQUIRES_PO' },
  ]);


  if (filterLotCache.filters) {
    StockLotFilters.loadCache(filterLotCache.filters);
  }

  if (filterMovementCache.filters) {
    StockMovementFilters.loadCache(filterMovementCache.filters);
  }

  if (filterInventoryCache.filters) {
    StockInventoryFilters.loadCache(filterInventoryCache.filters);
  }

  // once the cache has been loaded - ensure that default filters are provided appropriate values
  assignLotDefaultFilters();
  assignMovementDefaultFilters();
  assignInventoryDefaultFilters();

  // creating an object of filter to avoid method duplication
  var stockFilter = {
    lot : StockLotFilters,
    movement : StockMovementFilters,
    inventory : StockInventoryFilters
  };

  // creating an object of filter object to avoid method duplication
  var filterCache = {
    lot : filterLotCache,
    movement : filterMovementCache,
    inventory : filterInventoryCache
  };

  function assignLotDefaultFilters() {
    // get the keys of filters already assigned - on initial load this will be empty
    var assignedKeys = Object.keys(StockLotFilters.formatHTTP());

    // assign default period filter
    var periodDefined =
      lots.util.arrayIncludes(assignedKeys, ['period']);

    if (!periodDefined) {
      StockLotFilters.assignFilters(Periods.defaultFilters());
    }

    // assign default limit filter
    if (assignedKeys.indexOf('limit') === -1) {
      StockLotFilters.assignFilter('limit', 100);
    }
  }

  function assignMovementDefaultFilters() {
    // get the keys of filters already assigned - on initial load this will be empty
    var assignedKeys = Object.keys(StockMovementFilters.formatHTTP());

    // assign default period filter
    var periodDefined =
      movements.util.arrayIncludes(assignedKeys, ['period']);

    if (!periodDefined) {
      StockMovementFilters.assignFilters(Periods.defaultFilters());
    }

    // assign default limit filter
    if (assignedKeys.indexOf('limit') === -1) {
      StockMovementFilters.assignFilter('limit', 100);
    }
  }

  function assignInventoryDefaultFilters() {
    // get the keys of filters already assigned - on initial load this will be empty
    var assignedKeys = Object.keys(StockInventoryFilters.formatHTTP());

    // assign default period filter
    var periodDefined =
      inventories.util.arrayIncludes(assignedKeys, ['period']);

    if (!periodDefined) {
      StockInventoryFilters.assignFilters(Periods.defaultFilters());
    }

    // assign default limit filter
    if (assignedKeys.indexOf('limit') === -1) {
      StockInventoryFilters.assignFilter('limit', 100);
    }
  }

  function removeFilter(filterKey, valueKey) {
    stockFilter[filterKey].resetFilterState(valueKey);
  }

  // load filters from cache
  function cacheFilters(filterKey) {
    filterCache[filterKey].filters = stockFilter[filterKey].formatCache();
  }

  function loadCachedFilters(filterKey) {
    stockFilter[filterKey].loadCache(filterCache[filterKey].filters || {});
  }

  // downloads a type of report based on the
  function download(filterKey, type) {
    var filterOpts = stockFilter[filterKey].formatHTTP();
    var defaultOpts = { renderer : type, lang : Languages.key };

    // combine options
    var options = angular.merge(defaultOpts, filterOpts);

    // return  serialized options
    return $httpParamSerializer(options);
  }

  // uniformSelectedEntity function implementation
  // change name, text and display_nam into displayName
  function uniformSelectedEntity(entity) {
    if (!entity) {
      return {};
    }

    var keys = ['name', 'text', 'display_name'];

    keys.forEach(function (key) {
      if (entity[key]) {
        entity.displayName = entity[key];
      }
    });

    return { reference : entity.reference || '', displayName : entity.displayName || '' };
  }

  /**
   * @function processLotsFromStore
   *
   * @description
   * This function loops through the store's contents mapping them into a flat array
   * of lots.
   *
   * @returns {Array} - lots in an array.
 */
  function processLotsFromStore(data, uuid) {
    return data.reduce(function (current, line) {
      return line.lots.map(function (lot) {
        return {
          uuid : lot.uuid || null,
          label : lot.lot,
          initial_quantity : lot.quantity,
          quantity : lot.quantity,
          unit_cost : line.unit_cost,
          expiration_date : lot.expiration_date,
          inventory_uuid : line.inventory_uuid,
          origin_uuid : uuid,
        };
      }).concat(current);
    }, []);
  }

    /** Get label for purchase Status */
  function statusLabelMap(status) {
    var keys = {
      sold_out          : 'STOCK.STATUS.SOLD_OUT',
      in_stock          : 'STOCK.STATUS.IN_STOCK',
      security_reached  : 'STOCK.STATUS.SECURITY',
      minimum_reached   : 'STOCK.STATUS.MINIMUM',
      over_maximum      : 'STOCK.STATUS.OVER_MAX',
    };

    return keys[status];
  }


  return {
    stocks : stocks,
    lots : lots,
    movements : movements,
    inventories : inventories,
    integration : integration,
    transfers : transfers,
    filter : stockFilter,
    cacheFilters : cacheFilters,
    removeFilter : removeFilter,
    loadCachedFilters : loadCachedFilters,
    download : download,
    uniformSelectedEntity : uniformSelectedEntity,
    processLotsFromStore : processLotsFromStore,
    statusLabelMap : statusLabelMap,
  };
}
