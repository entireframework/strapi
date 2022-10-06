import { useMemo } from 'react';
import { get, toString } from 'lodash';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

const getMainField = (getComponentLayout, schema, componentFieldName, isRepeatable = false) => {
  const mainField = get(schema, ['settings', 'mainField'], 'id');
  const mainFieldType = get(schema, ['attributes', mainField, 'type'], null);
  const mainFieldRelation =
    // eslint-disable-next-line no-nested-ternary
    mainFieldType === 'component'
      ? getMainField(
          getComponentLayout,
          getComponentLayout(get(schema, ['attributes', mainField, 'component'], null)),
          '',
          get(schema, ['attributes', mainField, 'repeatable'], false)
        ).join('.')
      : mainFieldType === 'media'
      ? 'name'
      : get(schema, ['metadatas', mainField, 'list', 'mainField', 'name'], null);

  return [
    ...(componentFieldName ? componentFieldName.split('.') : []),
    ...(isRepeatable ? ['0'] : []),
    mainField,
    ...(mainFieldRelation ? mainFieldRelation.split('.') : []),
  ];
};

function useSelect({ schema, componentFieldName, getComponentLayout }) {
  const { moveComponentField, triggerFormValidation, modifiedData } = useCMEditViewDataManager();

  const mainField = useMemo(() => get(schema, ['settings', 'mainField'], 'id'), [schema]);
  const mainFieldFull = useMemo(
    () => getMainField(getComponentLayout, schema, componentFieldName),
    [getComponentLayout, schema, componentFieldName]
  );
  const displayedValue = toString(mainField !== 'id' ? get(modifiedData, mainFieldFull, '') : '');

  return {
    moveComponentField,
    triggerFormValidation,
    displayedValue,
  };
}

export default useSelect;
