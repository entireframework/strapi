import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';
import { TextButton } from '@strapi/design-system/TextButton';
import { Icon } from '@strapi/design-system/Icon';
import { Typography } from '@strapi/design-system/Typography';
import Trash from '@strapi/icons/Trash';
import Drag from '@strapi/icons/Drag';
import ArrowDown from '@strapi/icons/ArrowDown';
import ArrowUp from '@strapi/icons/ArrowUp';
import DropdownIcon from '@strapi/icons/CarretDown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CustomIconButtonSibling } from '../../../RepeatableComponent/DraggedItem/IconButtonCustoms';

export const CustomFontAwesomeIcon = styled(FontAwesomeIcon)`
  width: ${14 / 16}rem;
  height: ${14 / 16}rem;
  path {
    fill: ${({ theme, expanded }) =>
      expanded ? theme.colors.primary600 : theme.colors.neutral600};
  }
`;

const SiblingWrapper = styled.span`
  display: flex;
  justify-content: space-between;
  padding-left: ${({ theme }) => theme.spaces[4]};
  padding-right: ${({ theme }) => theme.spaces[4]};
  background-color: ${({ theme }) => theme.colors.neutral0};
  height: ${50 / 16}rem;
`;

const ToggleButton = styled(TextButton)`
  text-align: left;

  svg {
    width: ${14 / 16}rem;
    height: ${14 / 16}rem;

    path {
      fill: ${({ theme, expanded }) =>
        expanded ? theme.colors.primary600 : theme.colors.neutral500};
    }
  }
`;

const DraggingSibling = ({ displayedValue, icon, showDownIcon, showUpIcon, isFieldAllowed }) => {
  return (
    <SiblingWrapper>
      <Stack horizontal spacing={3} flex={1}>
        <Flex
          justifyContent="center"
          borderRadius="50%"
          height={`${24 / 16}rem}`}
          width={`${24 / 16}rem}`}
          aria-hidden
          as="span"
          background="neutral200"
        >
          <Icon as={DropdownIcon} width={`${8 / 16}rem}`} color="neutral600" />
        </Flex>
        <CustomFontAwesomeIcon icon={icon} />
        <ToggleButton onClick={() => {}} flex={1}>
          <Typography fontWeight="bold" textColor="neutral700">
            {displayedValue}
          </Typography>
        </ToggleButton>
      </Stack>

      <Stack horizontal spacing={0}>
        {showDownIcon && (
          <CustomIconButtonSibling noBorder onClick={() => {}} icon={<ArrowDown />} />
        )}
        {showUpIcon && <CustomIconButtonSibling noBorder onClick={() => {}} icon={<ArrowUp />} />}
        {isFieldAllowed && <CustomIconButtonSibling noBorder onClick={() => {}} icon={<Trash />} />}
        <CustomIconButtonSibling icon={<Drag />} noBorder />
      </Stack>
    </SiblingWrapper>
  );
};

DraggingSibling.propTypes = {
  displayedValue: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  showDownIcon: PropTypes.bool.isRequired,
  showUpIcon: PropTypes.bool.isRequired,
  isFieldAllowed: PropTypes.bool.isRequired,
};

export default DraggingSibling;
