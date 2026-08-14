const translations = require('../data/translations.json');

function getTranslation(transMap, key) {
  if (!transMap) return key;
  const [section, file, ...pathParts] = key.split('.');
  const fullKey = `${section}.${file}`;

  if (!transMap[fullKey]) return key;

  let result = transMap[fullKey];
  for (const p of pathParts) {
    result = result?.[p];
    if (result === undefined) return key;
  }

  return result;
}

module.exports = {
  translations,
  getTranslation
};
