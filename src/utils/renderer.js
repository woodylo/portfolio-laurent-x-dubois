const compiledTemplates = require('../data/compiled-templates.js');

const _ENCODE_HTML_RULES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&#34;',
  "'": '&#39;'
};
const _MATCH_HTML = /[&<>'"]/g;

function escapeXML(markup) {
  return markup == undefined
    ? ''
    : String(markup).replace(_MATCH_HTML, (c) => _ENCODE_HTML_RULES[c] || c);
}

/**
 * Render a precompiled EJS template (Pure JS execution, zero runtime eval/dependencies)
 * @param {string} templateName Name of the template (e.g. 'gallery', 'contact', 'partials/header')
 * @param {Object} data Template variables and locals
 * @returns {string} Rendered HTML string
 */
function renderTemplate(templateName, data = {}) {
  const templateKey = templateName.replace(/^\.\//, '');
  const templateFn = compiledTemplates[templateKey] || compiledTemplates[templateName];

  if (!templateFn) {
    throw new Error(`Template not found: ${templateName}`);
  }

  const renderData = {
    locals: data,
    ...data
  };

  const include = (subPath, subData = {}) => {
    const cleanSub = subPath.replace(/^\.\//, '');
    const subFn = compiledTemplates[subPath] ||
                  compiledTemplates[cleanSub] ||
                  compiledTemplates[`partials/${cleanSub}`] ||
                  compiledTemplates[`./partials/${cleanSub}`];

    if (!subFn) {
      throw new Error(`Included template not found: ${subPath}`);
    }

    const mergedData = {
      ...renderData,
      ...subData,
      locals: {
        ...(renderData.locals || {}),
        ...subData
      }
    };

    return subFn(mergedData, escapeXML, include);
  };

  return templateFn(renderData, escapeXML, include);
}

module.exports = {
  renderTemplate,
  escapeXML
};
