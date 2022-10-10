'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const settingsSchema = yup.object({
  sizeOptimization: yup.boolean().required(),
  responsiveDimensions: yup.boolean().required(),
  responsiveQuality: yup.number().required().min(0).max(100),
});

module.exports = validateYupSchema(settingsSchema);
