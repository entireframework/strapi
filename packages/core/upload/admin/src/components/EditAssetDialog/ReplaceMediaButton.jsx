import React, { useRef } from 'react';

import { Button, VisuallyHidden } from '@strapi/design-system';
import { useTracking } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

export const ReplaceMediaButton = ({
  onSelectMedia,
  onReuploadMedia,
  acceptedMime,
  trackedLocation,
  ...props
}) => {
  const { formatMessage } = useIntl();
  const inputRef = useRef(null);
  const { trackUsage } = useTracking();

  const handleClick = (e) => {
    e.preventDefault();

    if (trackedLocation) {
      trackUsage('didReplaceMedia', { location: trackedLocation });
    }

    inputRef.current.click();
  };

  const handleClickReupload = (e) => {
    e.preventDefault();

    onReuploadMedia();
  };

  const handleChange = () => {
    const file = inputRef.current.files[0];

    onSelectMedia(file);
  };

  return (
    <>
      <Button variant="secondary" onClick={handleClick} {...props}>
        {formatMessage({
          id: getTrad('control-card.replace-media'),
          defaultMessage: 'Replace media',
        })}
      </Button>
      <Button variant="secondary" onClick={handleClickReupload} {...props}>
        {formatMessage({
          id: getTrad('control-card.reupload-media'),
          defaultMessage: 'Reupload media to CDN',
        })}
      </Button>
      <VisuallyHidden>
        <input
          accept={acceptedMime}
          type="file"
          name="file"
          tabIndex={-1}
          ref={inputRef}
          onChange={handleChange}
          aria-hidden
        />
      </VisuallyHidden>
    </>
  );
};

ReplaceMediaButton.defaultProps = {
  trackedLocation: undefined,
};

ReplaceMediaButton.propTypes = {
  acceptedMime: PropTypes.string.isRequired,
  onSelectMedia: PropTypes.func.isRequired,
  onReuploadMedia: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};
