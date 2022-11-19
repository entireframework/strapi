import React, { memo, Suspense, useMemo, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import isEqual from 'react-fast-compare';
import { useIntl } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Accordion, AccordionToggle, AccordionContent } from '@strapi/design-system/Accordion';
import { IconButton } from '@strapi/design-system/IconButton';
import { FocusTrap } from '@strapi/design-system/FocusTrap';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Loader } from '@strapi/design-system/Loader';
import Trash from '@strapi/icons/Trash';
import ArrowDown from '@strapi/icons/ArrowDown';
import ArrowUp from '@strapi/icons/ArrowUp';
import { Tooltip } from '@strapi/design-system/Tooltip';
import Drag from '@strapi/icons/Drag';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import toString from 'lodash/toString';
import { useContentTypeLayout } from '../../../../hooks';
import { getTrad } from '../../../../utils';
import FieldComponent from '../../../FieldComponent';
// eslint-disable-next-line import/extensions
import Rectangle from './Rectangle';
import Preview from '../../../RepeatableComponent/DraggedItem/Preview';
import DraggingSibling from './DraggingSibling';
import ItemTypes from '../../../../utils/ItemTypes';
import connect from './utils/connect';
import select from './utils/select';

const DragButton = styled.span`
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.spaces[7]};

  padding: 0 ${({ theme }) => theme.spaces[3]};
  cursor: all-scroll;

  svg {
    width: ${12 / 16}rem;
    height: ${12 / 16}rem;
  }
`;

const IconButtonCustom = styled(IconButton)`
  background-color: transparent;

  svg {
    path {
      fill: ${({ theme, expanded }) =>
        expanded ? theme.colors.primary600 : theme.colors.neutral600};
    }
  }

  &:hover {
    svg {
      path {
        fill: ${({ theme }) => theme.colors.primary600};
      }
    }
  }
`;

const StyledBox = styled(Box)`
  > div:first-child {
    box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  }
`;

const AccordionContentRadius = styled(Box)`
  border-radius: 0 0 ${({ theme }) => theme.spaces[1]} ${({ theme }) => theme.spaces[1]};
`;

const Component = ({
  componentFieldName,
  componentUid,
  schema,
  formErrors,
  index,
  isOpen,
  isFieldAllowed,
  moveComponentDown,
  moveComponentUp,
  name,
  onToggle,
  removeComponentFromDynamicZone,
  showDownIcon,
  showUpIcon,
  isDraggingSibling,
  setIsDraggingSibling,
  toggleCollapses,
  moveComponentField,
  triggerFormValidation,
  displayedValue,
}) => {
  const { formatMessage } = useIntl();
  const { getComponentLayout } = useContentTypeLayout();
  const { icon, friendlyName } = useMemo(() => {
    const {
      info: { icon, displayName },
    } = getComponentLayout(componentUid);

    return { friendlyName: displayName, icon };
  }, [componentUid, getComponentLayout]);
  const componentName = schema.info.displayName;

  const handleMoveComponentDown = () => moveComponentDown(name, index);

  const handleMoveComponentUp = () => moveComponentUp(name, index);

  const handleRemove = () => removeComponentFromDynamicZone(name, index);

  const downLabel = formatMessage({
    id: getTrad('components.DynamicZone.move-down-label'),
    defaultMessage: 'Move component down',
  });
  const upLabel = formatMessage({
    id: getTrad('components.DynamicZone.move-up-label'),
    defaultMessage: 'Move component down',
  });
  const deleteLabel = formatMessage(
    {
      id: getTrad('components.DynamicZone.delete-label'),
      defaultMessage: 'Delete {name}',
    },
    { name: schema.info.displayName || friendlyName }
  );

  const formErrorsKeys = Object.keys(formErrors);

  const fieldsErrors = formErrorsKeys.filter((errorKey) => {
    const errorKeysArray = errorKey.split('.');

    if (`${errorKeysArray[0]}.${errorKeysArray[1]}` === `${name}.${index}`) {
      return true;
    }

    return false;
  });

  let errorMessage;

  if (fieldsErrors.length > 0) {
    errorMessage = formatMessage({
      id: getTrad('components.DynamicZone.error-message'),
      defaultMessage: 'The component contains error(s)',
    });
  }

  const dragRef = useRef(null);
  const dropRef = useRef(null);
  const [, forceRerenderAfterDnd] = useState(false);

  const [, drop] = useDrop({
    accept: ItemTypes.COMPONENT,
    canDrop() {
      return false;
    },
    hover(item, monitor) {
      if (!dropRef.current) {
        return;
      }

      const dragPath = item.originalPath;
      const hoverPath = componentFieldName;
      const fullPathToComponentArray = dragPath.split('.');
      const dragIndexString = fullPathToComponentArray.slice().splice(-1).join('');
      const hoverIndexString = hoverPath.split('.').splice(-1).join('');
      const pathToComponentArray = fullPathToComponentArray.slice(
        0,
        fullPathToComponentArray.length - 1
      );
      const dragIndex = parseInt(dragIndexString, 10);
      const hoverIndex = parseInt(hoverIndexString, 10);

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = dropRef.current.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      // If They are not in the same level, should not move
      if (dragPath.split('.').length !== hoverPath.split('.').length) {
        return;
      }
      // Time to actually perform the action in the data
      moveComponentField(pathToComponentArray, dragIndex, hoverIndex);

      item.originalPath = hoverPath;
    },
  });
  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.COMPONENT,
    item() {
      // Close all collapses
      toggleCollapses(-1);

      return {
        displayedValue: displayedValue || componentName,
        originalPath: componentFieldName,
      };
    },
    end() {
      // Update the errors
      triggerFormValidation();
      setIsDraggingSibling(false);
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: false });
  }, [preview]);

  useEffect(() => {
    if (isDragging) {
      setIsDraggingSibling(true);
    }
  }, [isDragging, setIsDraggingSibling]);

  // Effect in order to force a rerender after reordering the components
  // Since we are removing the Accordion when doing the DnD  we are losing the dragRef, therefore the replaced element cannot be dragged
  // anymore, this hack forces a rerender in order to apply the dragRef
  useEffect(() => {
    if (!isDraggingSibling) {
      forceRerenderAfterDnd((prev) => !prev);
    }
  }, [isDraggingSibling]);

  // Create the refs
  // We need 1 for the drop target
  // 1 for the drag target
  const refs = {
    dragRef: drag(dragRef),
    dropRef: drop(dropRef),
  };

  const accordionTitle = toString(displayedValue || componentName);

  return (
    <Box ref={refs ? refs.dropRef : null}>
      <Rectangle />
      {isDragging && <Preview />}
      {!isDragging && isDraggingSibling && (
        <DraggingSibling
          icon={icon}
          displayedValue={accordionTitle}
          componentFieldName={componentFieldName}
          showDownIcon={showDownIcon}
          showUpIcon={showUpIcon}
          isFieldAllowed={isFieldAllowed}
        />
      )}
      {!isDragging && !isDraggingSibling && (
        <StyledBox hasRadius>
          <Accordion
            expanded={isOpen}
            onToggle={() => onToggle(index)}
            size="S"
            error={errorMessage}
          >
            <AccordionToggle
              startIcon={<FontAwesomeIcon icon={icon} />}
              action={
                <Stack horizontal spacing={0}>
                  {showDownIcon && (
                    <IconButtonCustom
                      noBorder
                      label={downLabel}
                      onClick={handleMoveComponentDown}
                      icon={<ArrowDown />}
                      expanded={isOpen}
                    />
                  )}
                  {showUpIcon && (
                    <IconButtonCustom
                      noBorder
                      label={upLabel}
                      onClick={handleMoveComponentUp}
                      icon={<ArrowUp />}
                      expanded={isOpen}
                    />
                  )}
                  {isFieldAllowed && (
                    <IconButtonCustom
                      noBorder
                      label={deleteLabel}
                      onClick={handleRemove}
                      icon={<Trash />}
                      expanded={isOpen}
                    />
                  )}
                  <Tooltip
                    description={formatMessage({
                      id: getTrad('components.DragHandle-label'),
                      defaultMessage: 'Drag',
                    })}
                  >
                    <DragButton
                      role="button"
                      tabIndex={-1}
                      ref={refs.dragRef}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Drag />
                    </DragButton>
                  </Tooltip>
                </Stack>
              }
              title={accordionTitle}
              togglePosition="left"
            />
            <AccordionContent>
              <AccordionContentRadius background="neutral0">
                <Suspense
                  fallback={
                    <Flex justifyContent="center" paddingTop={4} paddingBottom={4}>
                      <Loader>Loading content.</Loader>
                    </Flex>
                  }
                >
                  <FocusTrap onEscape={() => onToggle(index)}>
                    <FieldComponent
                      componentUid={componentUid}
                      icon={icon}
                      name={`${name}.${index}`}
                      isFromDynamicZone
                    />
                  </FocusTrap>
                </Suspense>
              </AccordionContentRadius>
            </AccordionContent>
          </Accordion>
        </StyledBox>
      )}
    </Box>
  );
};

Component.defaultProps = {
  isDraggingSibling: false,
  setIsDraggingSibling() {},
  toggleCollapses() {},
};

Component.propTypes = {
  componentFieldName: PropTypes.string.isRequired,
  componentUid: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired,
  formErrors: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isFieldAllowed: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  moveComponentDown: PropTypes.func.isRequired,
  moveComponentUp: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
  removeComponentFromDynamicZone: PropTypes.func.isRequired,
  showDownIcon: PropTypes.bool.isRequired,
  showUpIcon: PropTypes.bool.isRequired,
  toggleCollapses: PropTypes.func,
  isDraggingSibling: PropTypes.bool,
  setIsDraggingSibling: PropTypes.func,
  moveComponentField: PropTypes.func.isRequired,
  triggerFormValidation: PropTypes.func.isRequired,
  displayedValue: PropTypes.string.isRequired,
};

const Memoized = memo(Component, isEqual);

export default connect(Memoized, select);

export { Component };
