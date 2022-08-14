import axios from 'axios';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useIntl } from 'react-intl';
import { useNotification } from '@strapi/helper-plugin';

import fs from 'fs';
import path from 'path';
import { axiosInstance, getTrad } from '../utils';
import pluginId from '../pluginId';

const reuploadAssetRequest = (asset, cancelToken, onProgress) => {
  const endpoint = `/${pluginId}?id=${asset.id}`;

  const formData = new FormData();
  formData.append(
    'files',
    fs.readFileSync(path.resolve(strapi.dirs.static.public, asset.url.substring(1)))
  );

  formData.append(
    'fileInfo',
    JSON.stringify({
      alternativeText: asset.alternativeText,
      caption: asset.caption,
      folder: asset.folder,
      name: asset.name,
    })
  );

  return axiosInstance({
    method: 'post',
    url: endpoint,
    data: formData,
    cancelToken: cancelToken.token,
    onUploadProgress({ total, loaded }) {
      onProgress((loaded / total) * 100);
    },
  }).then(res => res.data);
};

export const useReuploadAsset = () => {
  const [progress, setProgress] = useState(0);
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();
  const tokenRef = useRef(axios.CancelToken.source());

  const mutation = useMutation(
    ({ asset }) => reuploadAssetRequest(asset, tokenRef.current, setProgress),
    {
      onSuccess: () => {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
        queryClient.refetchQueries([pluginId, 'folders'], { active: true });
      },
      onError: reason => {
        if (reason.response.status === 403) {
          toggleNotification({
            type: 'info',
            message: { id: getTrad('permissions.not-allowed.update') },
          });
        } else {
          toggleNotification({ type: 'warning', message: reason.message });
        }
      },
    }
  );

  const reuploadAsset = asset => mutation.mutateAsync({ asset });

  const cancel = () =>
    tokenRef.current.cancel(
      formatMessage({ id: getTrad('modal.upload.cancelled'), defaultMessage: '' })
    );

  return { ...mutation, cancel, reuploadAsset, progress, status: mutation.status };
};
