import { AnyTokenList, SingleToken } from '@/types/tokens';
import { generateTokensToCreate } from './generateTokensToCreate';
import { ThemeObject } from '@/types';
import { SettingsState } from '@/app/store/models/settings';
import checkIfTokenCanCreateVariable from '@/utils/checkIfTokenCanCreateVariable';
import setValuesOnVariable from './setValuesOnVariable';
import { mapTokensToVariableInfo } from '@/utils/mapTokensToVariableInfo';

export type CreateVariableTypes = {
  collection: VariableCollection;
  mode: string;
  theme: ThemeObject;
  tokens: Record<string, AnyTokenList>;
  settings: SettingsState;
  filterByTokenSet?: string;
};

export type VariableToken = SingleToken<true, { path: string, variableId: string }>;

export default async function updateVariables({
  collection, mode, theme, tokens, settings, filterByTokenSet,
}: CreateVariableTypes) {
  const tokensToCreate = generateTokensToCreate(theme, tokens, filterByTokenSet);
  const variablesInCollection = figma.variables.getLocalVariables().filter((v) => v.variableCollectionId === collection.id);
  const variablesToCreate: VariableToken[] = [];
  tokensToCreate.forEach((token) => {
    if (checkIfTokenCanCreateVariable(token, settings)) {
      variablesToCreate.push(mapTokensToVariableInfo(token, theme, settings));
    }
  });

  const variableObj = await setValuesOnVariable(variablesInCollection, variablesToCreate, collection, mode, settings.baseFontSize, settings.renameExistingStylesAndVariables);
  const removedVariables: string[] = [];

  // Remove variables not handled in the current theme
  if (settings.removeStylesAndVariablesWithoutConnection) {
    variablesInCollection
      .filter((variable) => !Object.values(variableObj.variableKeyMap).includes(variable.key))
      .forEach((variable) => {
        removedVariables.push(variable.key);
        variable.remove();
      });
  }

  return {
    variableIds: variableObj.variableKeyMap,
    referenceVariableCandidate: variableObj.referenceVariableCandidates,
    removedVariables,
  };
}