module.exports = function (api) {
  // Cache key depends on the build env so the production-only console stripping
  // below is applied correctly for release builds but not for dev.
  api.cache.using(() => process.env.NODE_ENV || process.env.BABEL_ENV);

  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';

  const plugins = [];
  if (isProduction) {
    // Strip console.log/debug/info from release bundles; keep error+warn so
    // crash reporters and production diagnostics still surface real problems.
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
