// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github')
const darkCodeTheme = require('prism-react-renderer/themes/dracula')

const baseURL = '/'
const allDocHomesPaths = ['/docs/']

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Shuvi.js',
  organizationName: 'shuvijs', // Usually your GitHub org/user name.
  projectName: 'shuvi', // Usually your repo name.
  url: 'https://shuvijs.github.io/',
  baseUrl: baseURL,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  // scripts: [`${baseURL}iconfont.js`],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-CN'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/shuvijs/redox/tree/main/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/logo-og.png',
      algolia: {
        appId: 'M2MZN9GIKD',
        apiKey: '1403f40ac7096c28c523d50476f26481',
        indexName: 'shuvijs',
      },
      // sidebarCollapsible: false,
      navbar: {
        title: 'Redox',
        // logo: {
        //   alt: 'Redox',
        //   src: 'img/logo.svg',
        // },
        items: [
          {
            type: 'doc',
            docId: 'introduction',
            position: 'right',
            label: 'Docs',
          },
          {
            type: 'doc',
            docId: 'guides/index',
            position: 'right',
            label: 'Guides',
          },
          {
            type: 'doc',
            docId: 'reference/index',
            position: 'right',
            label: 'Reference',
          },
          {
            type: 'doc',
            docId: 'api/index',
            position: 'right',
            label: 'API',
          },
          {
            href: 'https://github.com/shuvijs/redox',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
          },
        ],
      },
      footer: {
        copyright: `Copyright © ${new Date().getFullYear()} Redox`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),

  plugins: [
    [
      'client-redirects',
      /** @type {import('@docusaurus/plugin-client-redirects').Options} */
      ({
        fromExtensions: ['html'],
        createRedirects(routePath) {
          // Redirect to /docs from /docs/introduction, as introduction has been
          // made the home doc
          if (allDocHomesPaths.includes(routePath)) {
            return [`${routePath}/introduction`]
          }
          return []
        },
        redirects: [],
      }),
    ],
  ],
}

module.exports = config