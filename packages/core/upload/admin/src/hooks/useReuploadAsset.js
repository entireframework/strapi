import axios from 'axios';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useIntl } from 'react-intl';
import { useNotification, useFetchClient } from '@strapi/helper-plugin';

import { getTrad } from '../utils';
import pluginId from '../pluginId';

const reuploadAssetRequest = (asset, cancelToken, onProgress, post) => {
  const endpoint = `/${pluginId}?id=${asset.id}`;

  const formData = new FormData();
  const URL = strapi.backendURL + asset.url;

  formData.append(
    'fileInfo',
    JSON.stringify({
      alternativeText: asset.alternativeText,
      caption: asset.caption,
      folder: asset.folder?.id,
      name: asset.name,
    })
  );

  return new Promise((resolve, reject) => {
    let request = new XMLHttpRequest();
    request.responseType = 'blob';
    request.onload = function () {
      formData.append('files', request.response);

      post(endpoint, formData, {
        cancelToken: cancelToken.token,
        onUploadProgress({ total, loaded }) {
          onProgress((loaded / total) * 100);
        },
      }).then((res) => resolve(res.data));
    };
    request.onerror = function (e) {
      console.error(e);
      reject(e);
    };
    request.open('GET', URL);
    request.send();
  });
};

export const useReuploadAsset = () => {
  const [progress, setProgress] = useState(0);
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();
  const tokenRef = useRef(axios.CancelToken.source());
  const { post } = useFetchClient();

  const mutation = useMutation(
    ({ asset }) => reuploadAssetRequest(asset, tokenRef.current, setProgress, post),
    {
      onSuccess() {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
        queryClient.refetchQueries([pluginId, 'folders'], { active: true });
      },
      onError(reason) {
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

  const reuploadAsset = (asset) => mutation.mutateAsync({ asset });

  const cancel = () =>
    tokenRef.current.cancel(
      formatMessage({ id: getTrad('modal.upload.cancelled'), defaultMessage: '' })
    );

  return { ...mutation, cancel, reuploadAsset, progress, status: mutation.status };
};
