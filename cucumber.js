module.exports = {
    default: {
      require: [
        'tests/steps/*.ts',
        'support/*.ts'
      ],
      requireModule: ['ts-node/register'],
      format: ['progress'],
      paths: ['tests/features/*.feature'],
    },
  };
  