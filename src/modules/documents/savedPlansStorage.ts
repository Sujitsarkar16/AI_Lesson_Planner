import { LessonPlan } from '@/shared/types/document';

const SAVED_PLANS_KEY = 'savedPlans';

export const getSavedPlans = (): LessonPlan[] => JSON.parse(localStorage.getItem(SAVED_PLANS_KEY) || '[]');

export const savePlanToLocalStorage = (plan: LessonPlan): void => {
  localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify([plan, ...getSavedPlans()]));
};

export const replaceSavedPlans = (plans: LessonPlan[]): void => {
  if (plans.length) {
    localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(plans));
  } else {
    localStorage.removeItem(SAVED_PLANS_KEY);
  }
};
