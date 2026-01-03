/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are not allowed',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Orphan modules (not imported by anything) should be reviewed',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$', // dot files
          '\\.d\\.ts$',                             // TypeScript declaration files
          '(^|/)tsconfig\\.json$',                  // TypeScript config
          '(^|/)jest\\.config\\.(js|ts|mjs|cjs)$', // Jest config
          '(^|/)vitest\\.config\\.(js|ts|mjs|cjs)$', // Vitest config
          'index\\.(js|ts)$',                       // index files (entry points)
          'route\\.ts$',                            // Next.js route files
          'page\\.tsx$',                            // Next.js page files
          'layout\\.tsx$',                          // Next.js layout files
          'tests?/',                                // test directories
          '__tests__/',                             // Jest test directories
          '\\.test\\.(js|ts|tsx)$',                 // test files
          '\\.spec\\.(js|ts|tsx)$'                  // spec files
        ]
      },
      to: {}
    },
    {
      name: 'modules-cannot-import-frontend',
      severity: 'error',
      comment: 'Backend modules should not import from frontend-b2b',
      from: {
        path: '^modules/'
      },
      to: {
        path: '^frontend-b2b/'
      }
    },
    {
      name: 'shared-types-is-leaf',
      severity: 'error',
      comment: 'shared-types module should not import from other modules',
      from: {
        path: '^modules/shared-types/'
      },
      to: {
        path: '^modules/(?!shared-types)'
      }
    },
    {
      name: 'no-deprecated-core',
      severity: 'warn',
      comment: 'Avoid using deprecated Node.js core modules',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: [
          '^(punycode|domain|constants|sys|_linklist|_stream_wrap)$'
        ]
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'frontend-b2b/tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
        theme: {
          graph: {
            splines: 'ortho'
          }
        }
      },
      text: {
        highlightFocused: true
      }
    }
  }
};
