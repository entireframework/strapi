import { useMemo } from 'react';
import { get, toString } from 'lodash';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

const getMainField = (currentLayout, schema, componentFieldName, isRepeatable = false) => {
  const mainField = get(
    schema,
    ['settings', 'coverField'],
    get(
      schema,
      ['metadatas', 'coverField', 'name'],
      get(schema, ['settings', 'mainField'], get(schema, ['metadatas', 'mainField', 'name'], 'id'))
    )
  );
  const mainFieldType = get(
    schema,
    ['attributes', mainField, 'type'],
    get(
      schema,
      ['metadatas', 'coverField', 'schema', 'type'],
      get(schema, ['metadatas', 'mainField', 'schema', 'type'], null)
    )
  );

  let mainFieldRelation = get(
    schema,
    ['metadatas', mainField, 'list', 'coverField', 'name'],
    get(schema, ['metadatas', mainField, 'list', 'mainField', 'name'], null)
  );

  if (mainFieldType === 'component') {
    mainFieldRelation = getMainField(
      currentLayout,
      get(
        currentLayout,
        ['components', get(schema, ['attributes', mainField, 'component'], null)],
        {}
      ),
      '',
      get(schema, ['attributes', mainField, 'repeatable'], false)
    );
  } else if (mainFieldType === 'relation') {
    mainFieldRelation = getMainField(
      currentLayout,
      get(schema, ['layouts', 'edit', 0, 0], null),
      '',
      get(schema, ['attributes', mainField, 'repeatable'], false)
    );
  } else if (mainFieldType === 'media') {
    mainFieldRelation = 'url';
  }

  return {
    name: [
      ...(componentFieldName ? componentFieldName.split('.') : []),
      ...(isRepeatable ? ['0'] : []),
      mainField,
      // eslint-disable-next-line no-nested-ternary
      ...(mainFieldRelation
        ? mainFieldRelation.name
          ? mainFieldRelation.name.split('.')
          : mainFieldRelation.split('.')
        : []),
    ].join('.'),
    type: mainFieldRelation && mainFieldRelation.type ? mainFieldRelation.type : mainFieldType,
  };
};

function useSelect({ schema, componentFieldName, currentLayout }) {
  const {
    checkFormErrors,
    modifiedData,
    moveComponentField,
    removeRepeatableField,
    triggerFormValidation,
  } = useCMEditViewDataManager();

  const mainField = useMemo(
    () => get(schema, ['settings', 'coverField'], get(schema, ['settings', 'mainField'], 'id')),
    [schema]
  );
  const mainFieldFull = useMemo(
    () => getMainField(currentLayout, schema, componentFieldName),
    [currentLayout, schema, componentFieldName]
  );
  const displayedValue = toString(get(modifiedData, mainFieldFull.name.split('.'), ''));
  const displayedValueIsMedia = mainFieldFull.type === 'media';

  return {
    displayedValue,
    displayedValueIsMedia,
    mainField,
    checkFormErrors,
    moveComponentField,
    removeRepeatableField,
    schema,
    triggerFormValidation,
  };
}

export default useSelect;
