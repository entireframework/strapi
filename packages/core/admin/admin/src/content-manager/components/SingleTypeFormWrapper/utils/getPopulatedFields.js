import get from 'lodash/get';

const getPopulatedFields = (currentLayout, schema) => {
  if (!schema.attributes) {
    schema = {
      ...schema,
      attributes: {},
    };
    schema.attributes[
      get(
        schema,
        ['metadatas', 'coverField', 'name'],
        get(schema, ['metadatas', 'mainField', 'name'], null)
      )
    ] = {
      type: get(
        schema,
        ['metadatas', 'coverField', 'schema', 'type'],
        get(schema, ['metadatas', 'mainField', 'schema', 'type'], null)
      ),
    };
  }

  return Object.keys(schema.attributes).reduce((acc, attribute) => {
    const attributeType = schema.attributes[attribute].component
      ? 'component'
      : schema.attributes[attribute].type;

    let attributeRelation = [];

    if (attributeType === 'component') {
      attributeRelation = getPopulatedFields(
        currentLayout,
        get(
          currentLayout,
          ['components', get(schema, ['attributes', attribute, 'component'], null)],
          {}
        )
      ).concat(['']);
    } else if (attributeType === 'dynamiczone') {
      attributeRelation = get(schema, ['attributes', attribute, 'components'], null)
        .reduce((acc3, component) => {
          return acc3.concat(
            getPopulatedFields(currentLayout, get(currentLayout, ['components', component], {}))
          );
        }, [])
        .concat(['']);
    } else if (attributeType === 'relation') {
      attributeRelation = getPopulatedFields(
        currentLayout,
        get(schema, ['layouts', 'edit', 0, 0], {}),
        ''
      ).concat(['']);
    } else if (attributeType === 'media') {
      attributeRelation = [''];
    }

    return attributeRelation.reduce((acc2, relation) => {
      return acc2.concat([[attribute, ...(relation ? [relation] : [])].join('.')]);
    }, acc);
  }, []);
};

export default getPopulatedFields;
