'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const settingsSchema = yup.object({
  sizeOptimization: yup.boolean().required(),
  responsiveQuality: yup
    .number()
    .min(0)
    .max(100)
    .required(),
  responsiveDimensions: yup.boolean().required(),
});

module.exports = validateYupSchema(settingsSchema);
