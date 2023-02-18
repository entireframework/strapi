import get from 'lodash/get';

const getMainField = (currentLayout, schema) => {
  if (!schema._mainField) {
    schema = {
      ...schema,
    };
    schema._mainField = get(
      schema,
      ['metadatas', 'coverField', 'name'],
      get(
        schema,
        ['settings', 'coverField'],
        get(
          schema,
          ['metadatas', 'mainField', 'name'],
          get(schema, ['settings', 'mainField'], null)
        )
      )
    );
  }

  const attributeType = get(schema, ['attributes', schema._mainField, 'type'], null);

  let attributeRelation;

  if (attributeType === 'component') {
    attributeRelation = getMainField(
      currentLayout,
      get(
        currentLayout,
        ['components', get(schema, ['attributes', schema._mainField, 'component'], null)],
        {}
      )
    );
  } else if (attributeType === 'dynamiczone') {
    attributeRelation = getMainField(
      currentLayout,
      get(
        currentLayout,
        ['components', get(schema, ['attributes', schema._mainField, 'components'], null)[0]],
        {}
      )
    );
  } else if (attributeType === 'relation') {
    attributeRelation = `0.${getMainField(
      currentLayout,
      get(schema, ['layouts', 'edit', 0, 0], {}),
      ''
    )}`;
  } else if (attributeType === 'media') {
    attributeRelation = '';
  }

  return [schema._mainField, ...(attributeRelation ? [attributeRelation] : [])].join('.');
};

export default getMainField;
