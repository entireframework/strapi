import { useCMEditViewDataManager } from '@strapi/helper-plugin';

function useSelect() {
  const { moveComponentField, triggerFormValidation } = useCMEditViewDataManager();

  return {
    moveComponentField,
    triggerFormValidation,
  };
}

export default useSelect;
