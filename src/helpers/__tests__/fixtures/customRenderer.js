module.exports = (css, { fileName, logger }) => {
  logger.log('Example log');
  return `.${css} {}; .${fileName} {};`;
};
