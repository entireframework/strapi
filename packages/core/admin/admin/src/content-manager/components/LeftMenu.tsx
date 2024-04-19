import * as React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  SubNav,
  SubNavHeader,
  SubNavLink,
  SubNavSection,
  SubNavSections,
} from '@strapi/design-system/v2';
import { useFilter } from '@strapi/helper-plugin';
import toLower from 'lodash/toLower';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { useTypedSelector } from '../../core/store/hooks';
import { useConfiguration } from '../../features/Configuration';
import { getTranslation } from '../utils/translations';

const matchByTitle = (links: any, search: any) =>
  links.filter((item: any) => toLower(item.title).includes(toLower(search)));

const LeftMenu = () => {
  const [search, setSearch] = React.useState('');
  const { formatMessage, locale } = useIntl();
  const collectionTypeLinks = useTypedSelector(
    (state) => state['content-manager_app'].collectionTypeLinks
  );
  const singleTypeLinks = useTypedSelector((state) => state['content-manager_app'].singleTypeLinks);

  const { startsWith } = useFilter(locale, {
    sensitivity: 'base',
  });

  /**
   * @type {Intl.Collator}
   */
  // const formatter = useCollator(locale, {
  //   sensitivity: 'base',
  // });

  const toIntl = (links: any) =>
    links.map((link: any) => {
      return {
        ...link,
        title: formatMessage({ id: link.title, defaultMessage: link.title }),
      };
    });

  const { leftMenu } = useConfiguration('LeftMenu');
  const intlCollectionTypeLinks = toIntl(
    collectionTypeLinks.filter(
      (l) =>
        !Object.keys(leftMenu || {})
          .reduce((acc, l) => acc.concat(leftMenu[l].items), [])
          .find((ll: any) => ll.uid === l.uid)
    )
  );
  const intlSingleTypeLinks = toIntl(
    singleTypeLinks.filter(
      (l) =>
        !Object.keys(leftMenu || {})
          .reduce((acc, l) => acc.concat(leftMenu[l].items), [])
          .find((ll: any) => ll.uid === l.uid)
    )
  );

  Object.keys(leftMenu || {}).forEach((key) => {
    leftMenu[key].items = toIntl(
      leftMenu[key].items
        .filter(
          (l: any) =>
            collectionTypeLinks.find((ll) => ll.uid === l.uid) ||
            singleTypeLinks.find((ll) => ll.uid === l.uid)
        )
        .map((l: any) => {
          return {
            ...(collectionTypeLinks.find((ll) => ll.uid === l.uid) ||
              singleTypeLinks.find((ll) => ll.uid === l.uid)),
            ...l,
          };
        })
    );
  });

  const menu = React.useMemo(
    () =>
      [
        ...Object.keys(leftMenu || {}).map((key) => {
          return {
            id: key,
            title: formatMessage({
              id: getTranslation(`components.LeftMenu.${key}`),
              defaultMessage: leftMenu[key].defaultMessage,
            }),
            searchable: true,
            links: matchByTitle(leftMenu[key].items, search),
          };
        }),
        {
          id: 'collectionTypes',
          title: formatMessage({
            id: getTranslation('components.LeftMenu.collection-types'),
            defaultMessage: 'Collection Types',
          }),
          searchable: true,
          links: matchByTitle(intlCollectionTypeLinks, search),
        },
        {
          id: 'singleTypes',
          title: formatMessage({
            id: getTranslation('components.LeftMenu.single-types'),
            defaultMessage: 'Single Types',
          }),
          searchable: true,
          links: matchByTitle(intlSingleTypeLinks, search),
        },
      ].map((section) => ({
        ...section,
        links: section.links
          /**
           * Filter by the search value
           */
          .filter((link: any) => startsWith(link.title, search))
          /**
           * Sort correctly using the language
           */
          // .sort((a, b) => formatter.compare(a.title, b.title))
          /**
           * Apply the formated strings to the links from react-intl
           */
          .map((link: any) => {
            return {
              ...link,
              title: formatMessage({ id: link.title, defaultMessage: link.title }),
            };
          }),
      })),
    [
      leftMenu,
      intlCollectionTypeLinks,
      search,
      intlSingleTypeLinks,
      startsWith,
      // formatter,
      formatMessage,
    ]
  );

  const handleClear = () => {
    setSearch('');
  };

  const handleChangeSearch = ({ target: { value } }: { target: { value: string } }) => {
    setSearch(value);
  };

  const label = formatMessage({
    id: getTranslation('header.name'),
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
          return (
            <SubNavSection
              key={section.id}
              label={section.title}
              badgeLabel={section.links.length.toString()}
            >
              {section.links.map((link: any) => {
                const search = link.search ? `?${link.search}` : '';

                return (
                  <SubNavLink
                    as={NavLink}
                    key={link.uid}
                    // @ts-expect-error – DS inference does not work with the `as` prop.
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

export { LeftMenu };
