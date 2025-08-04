const app = require('./server');

setTimeout(() => {
  console.log('\nRegistered routes:');
  app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
      console.log(r.route.path)
    } else if (r.name === 'router') {
      console.log('Router middleware registered')
    }
  });
}, 100);
