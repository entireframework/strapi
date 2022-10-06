/**
 *
 * LeftMenu
 *
 */

import React, { useMemo, useState } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { useIntl } from 'react-intl';
import toLower from 'lodash/toLower';
import { NavLink } from 'react-router-dom';

import {
  SubNav,
  SubNavHeader,
  SubNavSection,
  SubNavSections,
  SubNavLink,
} from '@strapi/design-system/v2/SubNav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import getTrad from '../../../utils/getTrad';
import { makeSelectModelLinks } from '../selectors';
import { useConfigurations } from '../../../../hooks';

const matchByTitle = (links, search) =>
  links.filter((item) => toLower(item.title).includes(toLower(search)));

const LeftMenu = () => {
  const [search, setSearch] = useState('');
  const { formatMessage } = useIntl();
  const modelLinksSelector = useMemo(makeSelectModelLinks, []);
  const { collectionTypeLinks, singleTypeLinks } = useSelector(
    (state) => modelLinksSelector(state),
    shallowEqual
  );

  const toIntl = (links) =>
    links.map((link) => {
      return {
        ...link,
        title: formatMessage({ id: link.title, defaultMessage: link.title }),
      };
    });

  const { leftMenu } = useConfigurations();
  const intlCollectionTypeLinks = toIntl(
    collectionTypeLinks.filter(
      (l) =>
        !Object.keys(leftMenu || {})
          .reduce((acc, l) => acc.concat(leftMenu[l].items), [])
          .find((ll) => ll.uid === l.uid)
    )
  );
  const intlSingleTypeLinks = toIntl(
    singleTypeLinks.filter(
      (l) =>
        !Object.keys(leftMenu || {})
          .reduce((acc, l) => acc.concat(leftMenu[l].items), [])
          .find((ll) => ll.uid === l.uid)
    )
  );

  Object.keys(leftMenu || {}).forEach((key) => {
    leftMenu[key].items = toIntl(
      leftMenu[key].items
        .filter(
          (l) =>
            collectionTypeLinks.find((ll) => ll.uid === l.uid) ||
            singleTypeLinks.find((ll) => ll.uid === l.uid)
        )
        .map((l) => {
          return {
            ...(collectionTypeLinks.find((ll) => ll.uid === l.uid) ||
              singleTypeLinks.find((ll) => ll.uid === l.uid)),
            ...l,
          };
        })
    );
  });

  const menu = [
    ...Object.keys(leftMenu || {}).map((key) => {
      return {
        id: key,
        title: {
          id: getTrad(`components.LeftMenu.${key}`),
          defaultMessage: leftMenu[key].defaultMessage,
        },
        searchable: true,
        links: matchByTitle(leftMenu[key].items, search),
      };
    }),
    {
      id: 'collectionTypes',
      title: {
        id: getTrad('components.LeftMenu.collection-types'),
        defaultMessage: 'Collection Types',
      },
      searchable: true,
      links: matchByTitle(intlCollectionTypeLinks, search),
    },
    {
      id: 'singleTypes',
      title: {
        id: getTrad('components.LeftMenu.single-types'),
        defaultMessage: 'Single Types',
      },
      searchable: true,
      links: matchByTitle(intlSingleTypeLinks, search),
    },
  ];

  const handleClear = () => {
    setSearch('');
  };

  const handleChangeSearch = ({ target: { value } }) => {
    setSearch(value);
  };

  const label = formatMessage({
    id: getTrad('header.name'),
    defaultMessage: 'Content',
  });

  return (
    <SubNav ariaLabel={label}>
      <SubNavHeader
        label={label}
        searchable
        value={search}
        onChange={handleChangeSearch}
        onClear={handleClear}
        searchLabel={formatMessage({
          id: 'content-manager.components.LeftMenu.Search.label',
          defaultMessage: 'Search for a content type',
        })}
      />
      <SubNavSections>
        {menu.map((section) => {
          const label = formatMessage(
            { id: section.title.id, defaultMessage: section.title.defaultMessage },
            section.title.values
          );

          return (
            <SubNavSection
              key={section.id}
              label={label}
              badgeLabel={section.links.length.toString()}
            >
              {section.links.map((link) => {
                const search = link.search ? `?${link.search}` : '';

                return (
                  <SubNavLink
                    as={NavLink}
                    key={link.uid}
                    to={`${link.to}${search}`}
                    icon={link.icon && <FontAwesomeIcon icon={link.icon} size="sm" />}
                  >
                    {link.title}
                  </SubNavLink>
                );
              })}
            </SubNavSection>
          );
        })}
      </SubNavSections>
    </SubNav>
  );
};

export default LeftMenu;
