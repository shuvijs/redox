import createContainer, { useLocalModel } from './createContainer';

const { Provider, useModel, useStaticModel } = createContainer();

export { Provider, useModel, createContainer, useStaticModel, useLocalModel };

export { ISelector } from './types';