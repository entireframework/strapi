import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Box, Flex, Typography } from '@strapi/design-system';

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const Label = ({
  intlLabel,
  intlDescription,
  id,
  labelAction,
  name,
  numberOfEntries,
  showNumberOfEntries,
  required,
}) => {
  const { formatMessage } = useIntl();
  const label = intlLabel?.id ? formatMessage(intlLabel) : name;
  const description = intlDescription?.id ? formatMessage(intlDescription) : undefined;

  return (
    <Box paddingBottom={1}>
      <Flex>
        <Typography
          textColor="neutral800"
          htmlFor={id || name}
          variant="pi"
          fontWeight="bold"
          as="label"
        >
          {label}
          {showNumberOfEntries && <>&nbsp;({numberOfEntries})</>}
          {required && <Typography textColor="danger600">*</Typography>}
        </Typography>
        {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
      </Flex>
      {description && (
        <Box marginTop={1} marginBottom={1}>
          <Typography variant="pi" textColor="neutral600">
            {description}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

Label.defaultProps = {
  id: undefined,
  labelAction: undefined,
  intlDescription: undefined,
  numberOfEntries: 0,
  required: false,
  showNumberOfEntries: false,
};

Label.propTypes = {
  id: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  intlDescription: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
  numberOfEntries: PropTypes.number,
  required: PropTypes.bool,
  showNumberOfEntries: PropTypes.bool,
};

export default Label;
