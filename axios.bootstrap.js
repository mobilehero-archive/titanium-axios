// code for SDK < 8.1.0.GA
// require('/ti.internal/extensions/binding')('axios', '/node_modules/@titanium/axios');

// Code for SDK >= 8.1.0.GA
global.binding.register('axios', require('@titanium/axios'));

