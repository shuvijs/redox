import React from 'react'
import ComponentCreator from '@docusaurus/ComponentCreator'

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '34a'),
    exact: true,
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', 'ca3'),
    exact: true,
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', '5b2'),
    exact: true,
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', '97a'),
    exact: true,
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '9d7'),
    exact: true,
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', 'ded'),
    exact: true,
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', 'a8b'),
    exact: true,
  },
  {
    path: '/search',
    component: ComponentCreator('/search', '3f7'),
    exact: true,
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '2a1'),
    routes: [
      {
        path: '/docs/',
        component: ComponentCreator('/docs/', '863'),
        exact: true,
        sidebar: 'docs',
      },
      {
        path: '/docs/api/',
        component: ComponentCreator('/docs/api/', 'df4'),
        exact: true,
      },
      {
        path: '/docs/guides/',
        component: ComponentCreator('/docs/guides/', 'a30'),
        exact: true,
        sidebar: 'guides',
      },
      {
        path: '/docs/reference/',
        component: ComponentCreator('/docs/reference/', '684'),
        exact: true,
      },
    ],
  },
  {
    path: '/',
    component: ComponentCreator('/', '230'),
    exact: true,
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
]
