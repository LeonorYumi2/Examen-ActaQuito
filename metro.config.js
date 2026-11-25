const { getDefaultConfig } = require('expo/metro-config');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
  ? getSentryExpoConfig(__dirname)
  : getDefaultConfig(__dirname);
