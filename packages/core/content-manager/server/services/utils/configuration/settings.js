'use strict';

const { isEmpty, pick, pipe, propOr } = require('lodash/fp');
const { isSortable, getDefaultMainField } = require('./attributes');

/** General settings */
const DEFAULT_SETTINGS = {
  bulkable: true,
  filterable: true,
  searchable: true,
  pageSize: 10,
};

const settingsFields = [
  'searchable',
  'filterable',
  'bulkable',
  'pageSize',
  'mainField',
  'coverField',
  'defaultSortBy',
  'defaultSortOrder',
];

const getModelSettings = pipe([propOr({}, 'config.settings'), pick(settingsFields)]);

module.exports = {
  async createDefaultSettings(schema) {
    const defaultField = getDefaultMainField(schema);

    return {
      ...DEFAULT_SETTINGS,
      mainField: defaultField,
      defaultSortBy: defaultField,
      defaultSortOrder: 'ASC',
      ...getModelSettings(schema),
    };
  },

  async syncSettings(configuration, schema) {
    if (isEmpty(configuration.settings)) return this.createDefaultSettings(schema);

    const defaultField = getDefaultMainField(schema);

    const { mainField = defaultField, defaultSortBy = defaultField } = configuration.settings || {};

    return {
      ...configuration.settings,
      mainField,
      defaultSortBy: isSortable(schema, defaultSortBy) ? defaultSortBy : defaultField,
    };
  },
};
