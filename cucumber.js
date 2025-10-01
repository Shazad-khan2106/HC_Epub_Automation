module.exports = {
    default: {
      "timeout": 300000,
      require: [
        'tests/steps/*.ts',
        'support/*.ts'
      ],
      requireModule: ['ts-node/register'],
      format: ['progress'],
      paths: ['tests/features/BookGenie.feature'],
    },
  };
  