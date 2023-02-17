import React from 'react';
import PropTypes from 'prop-types';
import { Grid, GridItem } from '@strapi/design-system';
import { upperFirst } from 'lodash/fp';
import Inputs from '../../../components/Inputs';
import FieldComponent from '../../../components/FieldComponent';

const GridRow = ({ columns, customFieldInputs }) => {
  return (
    <Grid gap={4}>
      {columns.map(({ fieldSchema, labelAction, metadatas, name, size, queryInfos }) => {
        const isComponent = fieldSchema.type === 'component';

        if (isComponent) {
          const { component, max, min, repeatable = false, required = false } = fieldSchema;

          return (
            <GridItem col={size} s={12} xs={12} key={component}>
              <FieldComponent
                componentUid={component}
                labelAction={labelAction}
                isRepeatable={repeatable}
                intlLabel={{
                  id: metadatas.label,
                  defaultMessage:
                    metadatas.label && name && metadatas.label === name.split('.').slice(-1)[0]
                      ? metadatas.label
                          .split(/[\s_-]+/)
                          .map(upperFirst)
                          .join(' ')
                      : metadatas.label,
                }}
                intlDescription={
                  metadatas.description
                    ? {
                        id: metadatas.description,
                        defaultMessage: metadatas.description,
                      }
                    : null
                }
                max={max}
                min={min}
                name={name}
                required={required}
              />
            </GridItem>
          );
        }

        return (
          <GridItem col={size} key={name} s={12} xs={12}>
            <Inputs
              size={size}
              fieldSchema={fieldSchema}
              keys={name}
              labelAction={labelAction}
              metadatas={metadatas}
              queryInfos={queryInfos}
              customFieldInputs={customFieldInputs}
            />
          </GridItem>
        );
      })}
    </Grid>
  );
};

GridRow.defaultProps = {
  customFieldInputs: {},
};

GridRow.propTypes = {
  columns: PropTypes.array.isRequired,
  customFieldInputs: PropTypes.object,
};

export default GridRow;
