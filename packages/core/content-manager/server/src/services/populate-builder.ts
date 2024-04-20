import { isNil } from 'lodash/fp';
import type { Common } from '@strapi/types';
import { type Populate, getDeepPopulate, getQueryPopulate } from './utils/populate';

/**
 * Builder to create a Strapi populate object.
 *
 * @param uid - Content type UID
 *
 * @example
 * const populate = await populateBuilder('api::article.article').countRelations().build();
 * // populate = { article: { populate: { count: true } } }
 *
 */
const populateBuilder = (uid: Common.UID.Schema) => {
  let getInitialPopulate = async (): Promise<undefined | Populate> => {
    return undefined;
  };
  let applyAdditionalPopulate = async (v: any) => v;
  const deepPopulateOptions = {
    countMany: false,
    countOne: false,
    maxLevel: -1,
  };

  const builder = {
    /**
     * Populates all attribute fields present in a query.
     * @param query - Strapi query object
     */
    populateFromQuery(query: any) {
      getInitialPopulate = async () => getQueryPopulate(uid, query);
      applyAdditionalPopulate = async (initialPopulate) => {
        if (query?.populate?.forEach) {
          query.populate.forEach((p: any) => {
            const pp = p.split('.');
            pp.reduce(
              (acc: any, key: string, index: number) => {
                if (acc.on) {
                  delete acc.on;
                }
                if (!key) {
                  return acc;
                }
                if (acc.populate && acc.populate[key] && acc.populate[key].count !== true) {
                  if (acc.populate[key] !== true || index === pp.length - 1) {
                    return acc.populate[key];
                  }
                }

                if (!acc.populate) {
                  acc.populate = {};
                }
                acc.populate[key] = index === pp.length - 1 ? true : { populate: {} };
                return acc.populate[key];
              },
              { populate: initialPopulate }
            );
          });
        }

        return initialPopulate;
      };

      return builder;
    },
    /**
     * Populate relations as count if condition is true.
     * @param condition
     * @param [options]
     * @param [options.toMany] - Populate XtoMany relations as count if true.
     * @param [options.toOne] - Populate XtoOne relations as count if true.
     */
    countRelationsIf(condition: boolean, { toMany, toOne } = { toMany: true, toOne: true }) {
      if (condition) {
        return this.countRelations({ toMany, toOne });
      }
      return builder;
    },
    /**
     * Populate relations as count.
     * @param [options]
     * @param [options.toMany] - Populate XtoMany relations as count if true.
     * @param [options.toOne] - Populate XtoOne relations as count if true.
     */
    countRelations({ toMany, toOne } = { toMany: true, toOne: true }) {
      if (!isNil(toMany)) {
        deepPopulateOptions.countMany = toMany;
      }
      if (!isNil(toOne)) {
        deepPopulateOptions.countOne = toOne;
      }
      return builder;
    },
    /**
     * Populate relations deeply, up to a certain level.
     * @param [level=Infinity] - Max level of nested populate.
     */
    populateDeep(level = Infinity) {
      deepPopulateOptions.maxLevel = level;
      return builder;
    },
    /**
     * Construct the populate object based on the builder options.
     * @returns Populate object
     */
    async build() {
      const initialPopulate = await getInitialPopulate();

      if (deepPopulateOptions.maxLevel === -1) {
        return initialPopulate;
      }

      return applyAdditionalPopulate(
        getDeepPopulate(uid, { ...deepPopulateOptions, initialPopulate })
      );
    },
  };

  return builder;
};

export default () => populateBuilder;
