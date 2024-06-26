import React, { useCallback, useMemo } from 'react';

import { GridItem, Option, Select } from '@strapi/design-system';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { useTypedSelector } from '../../../../core/store/hooks';
import { getTranslation } from '../../../utils/translations';
import { selectSchemas } from '../../App';
import { useLayoutDnd } from '../hooks/useLayoutDnd';
import {
  createPossibleMainFieldsForModelsAndComponents,
  createPossibleCoverFieldsForModelsAndComponents,
  getInputProps,
} from '../utils';

import GenericInput from './GenericInput';

const FIELD_SIZES = [
  [3, '25%'],
  [4, '33%'],
  [6, '50%'],
  [8, '66%'],
  [9, '75%'],
  [12, '100%'],
];

const ModalForm = ({ onMetaChange, onSizeChange }) => {
  const { formatMessage } = useIntl();
  const { modifiedData, selectedField, attributes, fieldForm } = useLayoutDnd();
  const schemas = useSelector(selectSchemas);
  const fieldSizes = useTypedSelector((state) => state['content-manager_app'].fieldSizes);

  const formToDisplay = useMemo(() => {
    if (!selectedField) {
      return [];
    }

    const associatedMetas = get(modifiedData, ['metadatas', selectedField, 'edit'], {});

    return Object.keys(associatedMetas).filter((meta) => meta !== 'visible');
  }, [selectedField, modifiedData]);

  const componentsAndModelsPossibleMainFields = useMemo(() => {
    return createPossibleMainFieldsForModelsAndComponents(schemas);
  }, [schemas]);

  const componentsAndModelsPossibleCoverFields = useMemo(() => {
    return createPossibleCoverFieldsForModelsAndComponents(schemas);
  }, [schemas]);

  const getSelectedItemSelectOptions = useCallback(
    (formType, meta) => {
      if (formType !== 'relation' && formType !== 'component') {
        return [];
      }

      const targetKey = formType === 'component' ? 'component' : 'targetModel';
      const key = get(modifiedData, ['attributes', selectedField, targetKey], '');

      return get(
        meta === 'coverField'
          ? componentsAndModelsPossibleCoverFields
          : componentsAndModelsPossibleMainFields,
        [key],
        []
      );
    },

    [
      selectedField,
      componentsAndModelsPossibleMainFields,
      componentsAndModelsPossibleCoverFields,
      modifiedData,
    ]
  );

  const metaFields = formToDisplay.map((meta) => {
    const formType = get(attributes, [selectedField, 'type']);

    if (
      ['component', 'dynamiczone'].includes(formType) &&
      !['label', 'description'].includes(meta)
    ) {
      return null;
    }

    // if (formType === 'component' && meta !== 'label') {
    //   return null;
    // }

    if (['media', 'json', 'boolean'].includes(formType) && meta === 'placeholder') {
      return null;
    }

    if (meta === 'step') {
      return null;
    }

    return (
      <GridItem col={6} key={meta}>
        <GenericInput
          type={getInputProps(meta).type}
          hint={
            meta === 'mainField'
              ? formatMessage({
                  id: getTranslation(
                    'containers.SettingPage.editSettings.relation-field.description'
                  ),
                })
              : ''
          }
          label={formatMessage({
            id: get(getInputProps(meta), 'label.id', 'app.utils.defaultMessage'),
          })}
          name={meta}
          onChange={onMetaChange}
          value={get(fieldForm, ['metadata', meta], '')}
          options={getSelectedItemSelectOptions(formType, meta)}
        />
      </GridItem>
    );
  });

  // Check for a custom input provided by a custom field, or use the default one for that type
  const { type, customField } = attributes[selectedField];
  const { isResizable } = fieldSizes[customField] ?? fieldSizes[type];

  return (
    <>
      {metaFields}
      {isResizable && (
        <GridItem col={6} key="size">
          <Select
            value={fieldForm?.size}
            name="size"
            onChange={(value) => {
              onSizeChange({ name: selectedField, value });
            }}
            label={formatMessage({
              id: getTranslation('containers.SettingPage.editSettings.size.label'),
              defaultMessage: 'Size',
            })}
          >
            {FIELD_SIZES.map(([value, label]) => (
              <Option key={value} value={value}>
                {label}
              </Option>
            ))}
          </Select>
        </GridItem>
      )}
    </>
  );
};

ModalForm.propTypes = {
  onMetaChange: PropTypes.func.isRequired,
  onSizeChange: PropTypes.func.isRequired,
};

export default ModalForm;
