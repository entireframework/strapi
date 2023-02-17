import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import get from 'lodash/get';
import {
  useTracking,
  formatContentTypeData,
  useQueryParams,
  useNotification,
  useGuidedTour,
  useAPIErrorHandler,
  useFetchClient,
} from '@strapi/helper-plugin';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import axios from 'axios';
import { createDefaultForm, getTrad, removePasswordFieldsFromData } from '../../utils';
import {
  getData,
  getDataSucceeded,
  initForm,
  resetProps,
  setDataStructures,
  setStatus,
  submitSucceeded,
} from '../../sharedReducers/crudReducer/actions';
import selectCrudReducer from '../../sharedReducers/crudReducer/selectors';
import { getRequestUrl } from './utils';
import buildQueryString from '../../pages/ListView/utils/buildQueryString';

const getPopulatedFields = (currentLayout, schema) => {
  if (!schema.attributes) {
    schema = {
      ...schema,
      attributes: {},
    };
    schema.attributes[
      get(
        schema,
        ['metadatas', 'coverField', 'name'],
        get(schema, ['metadatas', 'mainField', 'name'], null)
      )
    ] = {
      type: get(
        schema,
        ['metadatas', 'coverField', 'schema', 'type'],
        get(schema, ['metadatas', 'mainField', 'schema', 'type'], null)
      ),
    };
  }

  return Object.keys(schema.attributes).reduce((acc, attribute) => {
    const attributeType = schema.attributes[attribute].component
      ? 'component'
      : schema.attributes[attribute].type;

    let attributeRelation = [];

    if (attributeType === 'component') {
      attributeRelation = getPopulatedFields(
        currentLayout,
        get(
          currentLayout,
          ['components', get(schema, ['attributes', attribute, 'component'], null)],
          {}
        )
      ).concat(['']);
    } else if (attributeType === 'dynamiczone') {
      attributeRelation = get(schema, ['attributes', attribute, 'components'], null)
        .reduce((acc3, component) => {
          console.log('component', currentLayout.components, component);

          return acc3.concat(
            getPopulatedFields(currentLayout, get(currentLayout, ['components', component], {}))
          );
        }, [])
        .concat(['']);
    } else if (attributeType === 'relation') {
      attributeRelation = getPopulatedFields(
        currentLayout,
        get(schema, ['layouts', 'edit', 0, 0], {}),
        ''
      ).concat(['']);
    } else if (attributeType === 'media') {
      attributeRelation = [''];
    }

    return attributeRelation.reduce((acc2, relation) => {
      return acc2.concat([[attribute, ...(relation ? [relation] : [])].join('.')]);
    }, acc);
  }, []);
};

// This container is used to handle the CRUD
const SingleTypeFormWrapper = ({ allLayoutData, children, slug }) => {
  const queryClient = useQueryClient();
  const { trackUsage } = useTracking();
  const { push } = useHistory();
  const { setCurrentStep } = useGuidedTour();
  const trackUsageRef = useRef(trackUsage);
  const [isCreatingEntry, setIsCreatingEntry] = useState(true);
  const [{ query, rawQuery }] = useQueryParams();
  const searchToSend = buildQueryString({
    ...query,
    populate: getPopulatedFields(allLayoutData, allLayoutData.contentType),
  });

  const toggleNotification = useNotification();
  const dispatch = useDispatch();
  const { formatAPIError } = useAPIErrorHandler(getTrad);
  const fetchClient = useFetchClient();
  const { post, put, del } = fetchClient;

  const { componentsDataStructure, contentTypeDataStructure, data, isLoading, status } =
    useSelector(selectCrudReducer);

  const cleanReceivedData = useCallback(
    (data) => {
      const cleaned = removePasswordFieldsFromData(
        data,
        allLayoutData.contentType,
        allLayoutData.components
      );

      // This is needed in order to add a unique id for the repeatable components, in order to make the reorder easier
      return formatContentTypeData(cleaned, allLayoutData.contentType, allLayoutData.components);
    },
    [allLayoutData]
  );

  useEffect(() => {
    return () => {
      dispatch(resetProps());
    };
  }, [dispatch]);

  useEffect(() => {
    const componentsDataStructure = Object.keys(allLayoutData.components).reduce((acc, current) => {
      const defaultComponentForm = createDefaultForm(
        get(allLayoutData, ['components', current, 'attributes'], {}),
        allLayoutData.components
      );

      acc[current] = formatContentTypeData(
        defaultComponentForm,
        allLayoutData.components[current],
        allLayoutData.components
      );

      return acc;
    }, {});

    const contentTypeDataStructure = createDefaultForm(
      allLayoutData.contentType.attributes,
      allLayoutData.components
    );
    const contentTypeDataStructureFormatted = formatContentTypeData(
      contentTypeDataStructure,
      allLayoutData.contentType,
      allLayoutData.components
    );

    dispatch(setDataStructures(componentsDataStructure, contentTypeDataStructureFormatted));
  }, [allLayoutData, dispatch]);

  // Check if creation mode or editing mode
  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    const fetchData = async (source) => {
      dispatch(getData());

      setIsCreatingEntry(true);

      try {
        const { data } = await fetchClient.get(getRequestUrl(`${slug}${searchToSend}`), {
          cancelToken: source.token,
        });

        dispatch(getDataSucceeded(cleanReceivedData(data)));

        setIsCreatingEntry(false);
      } catch (err) {
        if (axios.isCancel(err)) {
          return;
        }

        const responseStatus = get(err, 'response.status', null);

        // Creating a single type
        if (responseStatus === 404) {
          dispatch(initForm(rawQuery, true));
        }

        if (responseStatus === 403) {
          toggleNotification({
            type: 'info',
            message: { id: getTrad('permissions.not-allowed.update') },
          });

          push('/');
        }
      }
    };

    fetchData(source);

    return () => source.cancel('Operation canceled by the user.');
  }, [
    fetchClient,
    cleanReceivedData,
    push,
    slug,
    dispatch,
    searchToSend,
    rawQuery,
    toggleNotification,
  ]);

  const displayErrors = useCallback(
    (err) => {
      toggleNotification({ type: 'warning', message: formatAPIError(err) });
    },
    [toggleNotification, formatAPIError]
  );

  const onDelete = useCallback(
    async (trackerProperty) => {
      try {
        trackUsageRef.current('willDeleteEntry', trackerProperty);

        const { data } = await del(getRequestUrl(`${slug}${searchToSend}`));

        toggleNotification({
          type: 'success',
          message: { id: getTrad('success.record.delete') },
        });

        trackUsageRef.current('didDeleteEntry', trackerProperty);

        return Promise.resolve(data);
      } catch (err) {
        trackUsageRef.current('didNotDeleteEntry', { error: err, ...trackerProperty });

        displayErrors(err);

        return Promise.reject(err);
      }
    },
    [del, slug, displayErrors, toggleNotification, searchToSend]
  );

  const onDeleteSucceeded = useCallback(() => {
    setIsCreatingEntry(true);

    dispatch(initForm(rawQuery, true));
  }, [dispatch, rawQuery]);

  const onPost = useCallback(
    async (body, trackerProperty) => {
      const endPoint = getRequestUrl(`${slug}${rawQuery}`);

      try {
        dispatch(setStatus('submit-pending'));

        const { data } = await put(endPoint, body);

        trackUsageRef.current('didCreateEntry', trackerProperty);
        toggleNotification({
          type: 'success',
          message: { id: getTrad('success.record.save') },
        });

        setCurrentStep('contentManager.success');

        // TODO: need to find a better place, or a better abstraction
        queryClient.invalidateQueries(['relation']);

        dispatch(submitSucceeded(cleanReceivedData(data)));
        setIsCreatingEntry(false);

        dispatch(setStatus('resolved'));

        return Promise.resolve(data);
      } catch (err) {
        trackUsageRef.current('didNotCreateEntry', { error: err, trackerProperty });

        displayErrors(err);

        dispatch(setStatus('resolved'));

        return Promise.reject(err);
      }
    },
    [
      put,
      cleanReceivedData,
      displayErrors,
      slug,
      dispatch,
      rawQuery,
      toggleNotification,
      setCurrentStep,
      queryClient,
    ]
  );

  const onDraftRelationCheck = useCallback(async () => {
    try {
      trackUsageRef.current('willCheckDraftRelations');

      const endPoint = getRequestUrl(`${slug}/actions/numberOfDraftRelations`);
      dispatch(setStatus('draft-relation-check-pending'));

      const numberOfDraftRelations = await fetchClient.get(endPoint);
      trackUsageRef.current('didCheckDraftRelations');

      dispatch(setStatus('resolved'));

      return numberOfDraftRelations.data.data;
    } catch (err) {
      displayErrors(err);
      dispatch(setStatus('resolved'));

      return Promise.reject(err);
    }
  }, [fetchClient, displayErrors, slug, dispatch]);

  const onPublish = useCallback(async () => {
    try {
      trackUsageRef.current('willPublishEntry');
      const endPoint = getRequestUrl(`${slug}/actions/publish${searchToSend}`);

      dispatch(setStatus('publish-pending'));

      const { data } = await post(endPoint);

      trackUsageRef.current('didPublishEntry');
      toggleNotification({
        type: 'success',
        message: { id: getTrad('success.record.publish') },
      });

      dispatch(submitSucceeded(cleanReceivedData(data)));

      dispatch(setStatus('resolved'));

      return Promise.resolve(data);
    } catch (err) {
      displayErrors(err);

      dispatch(setStatus('resolved'));

      return Promise.reject(err);
    }
  }, [post, cleanReceivedData, displayErrors, slug, searchToSend, dispatch, toggleNotification]);

  const onPut = useCallback(
    async (body, trackerProperty) => {
      const endPoint = getRequestUrl(`${slug}${rawQuery}`);

      try {
        trackUsageRef.current('willEditEntry', trackerProperty);

        dispatch(setStatus('submit-pending'));

        const { data } = await put(endPoint, body);

        toggleNotification({
          type: 'success',
          message: { id: getTrad('success.record.save') },
        });

        trackUsageRef.current('didEditEntry', { trackerProperty });

        // TODO: need to find a better place, or a better abstraction
        queryClient.invalidateQueries(['relation']);

        dispatch(submitSucceeded(cleanReceivedData(data)));

        dispatch(setStatus('resolved'));

        return Promise.resolve(data);
      } catch (err) {
        displayErrors(err);

        trackUsageRef.current('didNotEditEntry', { error: err, trackerProperty });

        dispatch(setStatus('resolved'));

        return Promise.reject(err);
      }
    },
    [
      put,
      cleanReceivedData,
      displayErrors,
      slug,
      dispatch,
      rawQuery,
      toggleNotification,
      queryClient,
    ]
  );

  // The publish and unpublish method could be refactored but let's leave the duplication for now
  const onUnpublish = useCallback(async () => {
    const endPoint = getRequestUrl(`${slug}/actions/unpublish${searchToSend}`);

    dispatch(setStatus('unpublish-pending'));

    try {
      trackUsageRef.current('willUnpublishEntry');

      const { data } = await post(endPoint);

      trackUsageRef.current('didUnpublishEntry');
      toggleNotification({
        type: 'success',
        message: { id: getTrad('success.record.unpublish') },
      });

      dispatch(submitSucceeded(cleanReceivedData(data)));

      dispatch(setStatus('resolved'));
    } catch (err) {
      dispatch(setStatus('resolved'));
      displayErrors(err);
    }
  }, [post, cleanReceivedData, toggleNotification, displayErrors, slug, dispatch, searchToSend]);

  return children({
    componentsDataStructure,
    contentTypeDataStructure,
    data,
    isCreatingEntry,
    isLoadingForData: isLoading,
    onDelete,
    onDeleteSucceeded,
    onPost,
    onDraftRelationCheck,
    onPublish,
    onPut,
    onUnpublish,
    redirectionLink: '/',
    status,
  });
};

SingleTypeFormWrapper.propTypes = {
  allLayoutData: PropTypes.shape({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.object.isRequired,
  }).isRequired,
  children: PropTypes.func.isRequired,
  slug: PropTypes.string.isRequired,
};

export default memo(SingleTypeFormWrapper);
