import { useMemo } from 'react';
import { get, toString } from 'lodash';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function useSelect({ schema, componentFieldName }) {
  const { moveComponentField, triggerFormValidation, modifiedData } = useCMEditViewDataManager();

  const mainField = useMemo(() => get(schema, ['settings', 'mainField'], 'id'), [schema]);
  const mainFieldRelation =  useMemo(() => get(schema, ['metadatas', mainField, 'list', 'mainField', 'name'], null), [schema, mainField]);

  const displayedValue = mainField !== 'id' && mainFieldRelation !== 'id' ? toString(
    get(modifiedData, [...componentFieldName.split('.'), ...mainField.split('.')].concat(mainFieldRelation ? [mainFieldRelation] : []), '')
  ) : '';

  return {
    moveComponentField,
    triggerFormValidation,
    displayedValue
  };
}

export default useSelect;
