import { cloneDeep, get, set } from 'lodash';
import { mergeMetasWithSchema } from '../../../utils';

const getRelationModel = (targetModel, models) => models.find((model) => model.uid === targetModel);

const formatLayouts = (initialData, models) => {
  const data = createMetasSchema(initialData, models);

  const formattedCTEditLayout = formatLayoutWithMetas(data.contentType, models);
  const formattedListLayout = formatListLayoutWithMetas(data.contentType, data.components);

  set(data, ['contentType', 'layouts', 'edit'], formattedCTEditLayout);
  set(data, ['contentType', 'layouts', 'list'], formattedListLayout);

  Object.keys(data.components).forEach((componentUid) => {
    const formattedComponentEditLayout = formatLayoutWithMetas(
      data.components[componentUid],
      models
    );

    set(data, ['components', componentUid, 'layouts', 'edit'], formattedComponentEditLayout);
  });

  return data;
};

const createMetasSchema = (initialData, models) => {
  const data = mergeMetasWithSchema(cloneDeep(initialData), models, 'contentType');
  const { components, contentType } = data;

  const formatMetadatas = (targetSchema) => {
    return Object.keys(targetSchema.metadatas).reduce((acc, current) => {
      const schema = get(targetSchema, ['attributes', current], {});
      let metadatas = targetSchema.metadatas[current];

      if (schema.type === 'relation') {
        const relationModel = getRelationModel(schema.targetModel, models);
        const mainFieldName = metadatas.edit.mainField;
        const mainField = {
          name: mainFieldName,
          schema: get(relationModel, ['attributes', mainFieldName]),
        };

        const coverFieldName = metadatas.edit.coverField;
        const coverField = {
          name: coverFieldName,
          schema: get(relationModel, ['attributes', coverFieldName]),
        };

        metadatas = {
          list: {
            ...metadatas.list,
            mainField,
            coverField,
          },
          edit: {
            ...metadatas.edit,
            mainField,
            coverField,
          },
        };
      }

      acc[current] = metadatas;

      return acc;
    }, {});
  };

  set(data, ['contentType', 'metadatas'], formatMetadatas(contentType));

  Object.keys(components).forEach((compoUID) => {
    const currentCompo = components[compoUID];
    const updatedMetas = formatMetadatas(currentCompo);

    set(data, ['components', compoUID, 'metadatas'], updatedMetas);
  });

  return data;
};

const formatLayoutWithMetas = (contentTypeConfiguration, models) =>
  contentTypeConfiguration.layouts.edit.reduce((acc, current) => {
    const row = current.map((attribute) => {
      const fieldSchema = get(contentTypeConfiguration, ['attributes', attribute.name], {});

      const data = {
        ...attribute,
        fieldSchema,
        metadatas: get(contentTypeConfiguration, ['metadatas', attribute.name, 'edit'], {}),
      };

      if (fieldSchema.type === 'relation') {
        const targetModelSchema = getRelationModel(fieldSchema.targetModel, models);
        const targetModelPluginOptions = targetModelSchema.pluginOptions || {};

        set(data, 'targetModelPluginOptions', targetModelPluginOptions);
        set(data, 'queryInfos', {
          shouldDisplayRelationLink: shouldDisplayRelationLink(
            contentTypeConfiguration,
            attribute.name,
            models
          ),
        });
      }

      return data;
    });

    acc.push(row);

    return acc;
  }, []);

const formatListLayoutWithMetas = (contentTypeConfiguration, components) => {
  const formatted = contentTypeConfiguration.layouts.list.reduce((acc, current) => {
    const fieldSchema = get(contentTypeConfiguration, ['attributes', current], {});
    const metadatas = get(contentTypeConfiguration, ['metadatas', current, 'list'], {});

    const type = fieldSchema.type;

    if (type === 'relation') {
      acc.push({ key: `__${current}_key__`, name: current, fieldSchema, metadatas });

      return acc;
    }

    if (type === 'component') {
      const component = components[fieldSchema.component];
      const mainFieldName = component.settings.mainField;
      const mainFieldAttribute = component.attributes[mainFieldName];
      const coverFieldName = component.settings.coverField;
      const coverFieldAttribute = component.attributes[coverFieldName];

      acc.push({
        key: `__${current}_key__`,
        name: current,
        fieldSchema,
        metadatas: {
          ...metadatas,
          mainField: {
            ...mainFieldAttribute,
            name: mainFieldName,
          },
          coverField: {
            ...coverFieldAttribute,
            name: coverFieldName,
          },
        },
      });

      return acc;
    }

    acc.push({ key: `__${current}_key__`, name: current, fieldSchema, metadatas });

    return acc;
  }, []);

  return formatted;
};

const shouldDisplayRelationLink = (contentTypeConfiguration, fieldName, models) => {
  const targetModel = get(contentTypeConfiguration, ['attributes', fieldName, 'targetModel'], '');

  return getDisplayedModels(models).includes(targetModel);
};

const getDisplayedModels = (models) =>
  models.filter((model) => model.isDisplayed).map(({ uid }) => uid);

export default formatLayouts;
export {
  formatLayoutWithMetas,
  formatListLayoutWithMetas,
  shouldDisplayRelationLink,
  getDisplayedModels,
};
